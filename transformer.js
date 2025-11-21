const Handlebars = require('handlebars');
const { parse: parseCsv } = require('csv-parse/sync');
const { stringify: stringifyCsv } = require('csv-stringify/sync');
const { parseStringPromise, Builder } = require('xml2js');
const { registerDefaultHelpers } = require('./helpers');
const { fetchSchema } = require('./utils/schema-fetcher');
const { parseSchemaToRule } = require('./utils/schema-parser-v2');

registerDefaultHelpers();

class DataTransformer {
    constructor() {
        this.xmlBuilder = new Builder({ headless: true });
    }

    async transform(sourceData, rule = {}, options = {}) {
        if (!rule) {
            throw new Error('Missing transformation rule definition');
        }

        const sourceFormat = (options.sourceFormat || rule.source_format || 'json').toLowerCase();
        const targetFormat = (options.targetFormat || rule.target_format || 'json').toLowerCase();

        const parsedInput = await this.parseInput(sourceData ?? rule.sample_input ?? {}, sourceFormat);
        const { normalized, root } = this.unwrapDataStructure(parsedInput);
        let workingData = normalized;

        const filters = this.normalizeFilterConfig(rule.filter_config);
        if (filters.length) {
            workingData = this.applyFilters(workingData, filters, root);
        }

        // Collect validation rules (either validation_config or pipeline validator steps)
        const pipelineConfig = this.parseJsonSafe(rule.pipeline_config) || [];
        const validationPlan = this.extractValidationPlan(rule, pipelineConfig);

        // Enrich validation rules with schema.gov.tw definitions
        if (validationPlan.rules.length > 0) {
            validationPlan.rules = await this.enrichValidationRules(validationPlan.rules);
        }

        if (rule.mapping_config) {
            const mappingConfig = this.parseJsonSafe(rule.mapping_config);
            if (mappingConfig) {
                workingData = this.applyMapping(workingData, mappingConfig);
            }
        }

        if (rule.template_config) {
            const templateString = typeof rule.template_config === 'string'
                ? rule.template_config
                : rule.template_config.body || '';
            workingData = this.applyTemplate(workingData, templateString, rule.template_helpers);
        }

        // 資料驗證（在輸出前執行）
        let validationResult = null;
        if (validationPlan.rules.length) {
            validationResult = this.validateData(workingData, validationPlan.rules, {
                strictMode: validationPlan.strictMode,
                onValidationFail: validationPlan.onFail
            });

            if (!validationResult.valid && validationPlan.onFail === 'reject') {
                const errorMessages = validationResult.errors.map(e =>
                    `第 ${e.index + 1} 筆資料 - ${e.message}`
                ).join('\n');
                throw new Error(`資料驗證失敗：\n${errorMessages}`);
            }

            workingData = validationResult.data;
        }

        const serialized = await this.serializeOutput(workingData, targetFormat);

        return {
            targetFormat,
            output: workingData,
            outputText: serialized,
            validation: validationResult,
            meta: {
                sourceFormat,
                targetFormat,
                filtersApplied: filters.length,
                usedTemplate: Boolean(rule.template_config),
                usedMapping: Boolean(rule.mapping_config),
                validationApplied: validationPlan.rules.length > 0,
                validationPassed: validationResult ? validationResult.valid : true
            }
        };
    }

    async parseInput(data, format) {
        if (data === undefined || data === null || data === '') {
            return {};
        }

        if (format === 'json') {
            if (typeof data === 'string') {
                return JSON.parse(data);
            }
            return data;
        }

        if (format === 'csv') {
            if (typeof data !== 'string') {
                throw new Error('CSV input must be a string');
            }
            return parseCsv(data, {
                columns: true,
                skip_empty_lines: true
            });
        }

        if (format === 'xml') {
            if (typeof data !== 'string') {
                throw new Error('XML input must be a string');
            }
            return await parseStringPromise(data, { explicitArray: false });
        }

        throw new Error(`Unsupported source format: ${format}`);
    }

    async serializeOutput(data, format) {
        if (format === 'json') {
            return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        }

        if (format === 'csv') {
            const records = Array.isArray(data) ? data : [data];
            return stringifyCsv(records, { header: true });
        }

        if (format === 'xml') {
            const payload = Array.isArray(data) ? { items: { item: data } } : data;
            return this.xmlBuilder.buildObject(payload);
        }

        throw new Error(`Unsupported target format: ${format}`);
    }

    applyTemplate(data, templateString, helperList) {
        if (!templateString) return data;

        const template = Handlebars.compile(templateString, { noEscape: true });
        const rendered = template(data);

        try {
            return JSON.parse(rendered);
        } catch (err) {
            return rendered;
        }
    }

    applyMapping(data, mappingConfig = {}) {
        if (Array.isArray(data)) {
            return data.map(item => this.mapObject(item, mappingConfig));
        }
        return this.mapObject(data, mappingConfig);
    }

    mapObject(record, mappingConfig) {
        const output = {};
        Object.entries(mappingConfig || {}).forEach(([targetPath, templateOrPath]) => {
            if (typeof templateOrPath !== 'string') {
                this.setNestedValue(output, targetPath, templateOrPath);
                return;
            }

            let computedValue;
            if (templateOrPath.includes('{{')) {
                const template = Handlebars.compile(templateOrPath);
                computedValue = template(record);
            } else {
                computedValue = this.getNestedValue(record, templateOrPath);
            }

            this.setNestedValue(output, targetPath, this.castValue(computedValue));
        });
        return output;
    }

    applyFilters(data, filters = [], rootContext = null) {
        if (!filters.length) return data;

        const processArray = (records) => {
            return records.filter(item => {
                return filters.every(filter => {
                    const passed = this.evaluateFilter(item, filter, rootContext);
                    if (!passed && filter.stop_on_fail) {
                        throw new Error(`Filter \"${filter.label || 'unnamed'}\" blocked the record.`);
                    }
                    return passed;
                });
            });
        };

        if (Array.isArray(data)) {
            return processArray(data);
        }

        const result = processArray([data]);
        return result[0] || null;
    }

    evaluateFilter(record, filter, rootContext = null) {
        const mode = (filter.mode || 'expression').toLowerCase();
        if (mode === 'handlebars') {
            if (!filter.expression) return true;
            const template = Handlebars.compile(filter.expression);
            const output = template({ record, root: rootContext ?? record });
            return output === 'true' || output === true;
        }

        if (mode === 'js' || mode === 'expression') {
            if (!filter.expression) return true;
            try {
                // eslint-disable-next-line no-new-func
                const fn = new Function('record', 'root', `
                    const row = record;
                    const data = record;
                    const item = record;
                    return (${filter.expression});
                `);
                return Boolean(fn(record, rootContext ?? record));
            } catch (err) {
                console.error('Filter evaluation failed:', err);
                return false;
            }
        }

        return true;
    }

    getNestedValue(obj, path) {
        if (!path) return undefined;
        const tokens = this.tokenizePath(path);
        return tokens.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    }

    setNestedValue(obj, path, value) {
        if (!path) return;
        const tokens = this.tokenizePath(path);
        let current = obj;
        tokens.forEach((key, index) => {
            const isLast = index === tokens.length - 1;
            if (isLast) {
                current[key] = value;
                return;
            }

            const nextKey = tokens[index + 1];
            const shouldBeArray = this.isNumericKey(nextKey);

            if (current[key] === undefined || current[key] === null) {
                current[key] = shouldBeArray ? [] : {};
            } else if (typeof current[key] !== 'object') {
                current[key] = shouldBeArray ? [] : {};
            }

            current = current[key];
        });
    }

    tokenizePath(path) {
        if (!path) return [];
        const segments = path.split('.').filter(Boolean);
        const tokens = [];

        segments.forEach(segment => {
            const regex = /([^[\]]+)|\[(\d+)\]/g;
            let match;
            while ((match = regex.exec(segment)) !== null) {
                if (match[1]) {
                    tokens.push(match[1]);
                } else if (match[2]) {
                    tokens.push(match[2]);
                }
            }
        });

        return tokens;
    }

    isNumericKey(key) {
        return /^[0-9]+$/.test(key);
    }

    castValue(value) {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        if (trimmed === '') return '';
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        const numeric = Number(trimmed);
        if (!Number.isNaN(numeric) && trimmed === numeric.toString()) {
            return numeric;
        }
        try {
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                return JSON.parse(trimmed);
            }
        } catch (_) {
            /* ignore */
        }
        return value;
    }

    normalizeFilterConfig(filterConfig) {
        if (!filterConfig) return [];
        if (typeof filterConfig === 'string') {
            try {
                return JSON.parse(filterConfig);
            } catch (err) {
                console.warn('Unable to parse filter_config, expected JSON string.');
                return [];
            }
        }
        if (Array.isArray(filterConfig)) return filterConfig;
        return [];
    }

    parseJsonSafe(payload) {
        if (!payload) return null;
        if (typeof payload === 'object') return payload;
        try {
            return JSON.parse(payload);
        } catch (err) {
            console.warn('Failed to parse JSON payload:', err);
            return null;
        }
    }

    unwrapDataStructure(payload) {
        if (Array.isArray(payload)) {
            return { normalized: payload, root: payload };
        }

        if (payload && typeof payload === 'object') {
            const candidateKeys = ['data', 'items', 'results', 'records'];
            for (const key of candidateKeys) {
                if (Array.isArray(payload[key])) {
                    return { normalized: payload[key], root: payload };
                }
            }
        }

        return { normalized: payload, root: payload };
    }

    extractValidationPlan(rule, pipeline = []) {
        const rules = [];

        // From validation_config (if provided inline)
        if (rule.validation_config) {
            const parsed = this.parseJsonSafe(rule.validation_config);
            if (Array.isArray(parsed)) {
                rules.push(...parsed);
            }
        }

        // From pipeline validator steps
        if (Array.isArray(pipeline)) {
            pipeline.forEach(step => {
                if ((step.type || '').toLowerCase() !== 'validator') return;
                const cfg = step.config || {};
                const parsedRules = this.parseJsonSafe(cfg.validationRules);
                if (Array.isArray(parsedRules)) {
                    rules.push(...parsedRules);
                }
            });
        }

        const onFail = (rule.validation_on_fail || (pipeline.find(s => (s.type || '').toLowerCase() === 'validator')?.config?.onValidationFail) || 'reject').toLowerCase();
        const strictMode = rule.validation_strict_mode === true
            || rule.validation_strict_mode === 'true'
            || pipeline.some(s => (s.type || '').toLowerCase() === 'validator' && (s.config?.strictMode === true || s.config?.strictMode === 'true'));

        return {
            rules,
            onFail,
            strictMode
        };
    }

    async enrichValidationRules(rules) {
        const enrichedRules = [];
        for (const rule of rules) {
            if (rule.schemaUri) {
                try {
                    const schema = await fetchSchema(rule.schemaUri);
                    const parsedRule = parseSchemaToRule(rule.field, schema, rule.schemaUri);

                    // Merge parsed rule with existing rule (existing takes precedence for manual overrides)
                    // But we want schema to provide type/pattern if missing.
                    // Actually, if user provides schemaUri, they likely want the schema's rule.
                    // But they might want to override the message.

                    enrichedRules.push({
                        ...parsedRule,
                        ...rule, // User defined properties override schema derived ones (e.g. custom message)
                        type: rule.type || parsedRule.type, // If user didn't specify type, use schema's
                        pattern: rule.pattern || parsedRule.pattern,
                        min: rule.min !== undefined ? rule.min : parsedRule.min,
                        max: rule.max !== undefined ? rule.max : parsedRule.max,
                    });
                } catch (err) {
                    console.warn(`Failed to fetch schema for field ${rule.field} (${rule.schemaUri}):`, err.message);
                    // Fallback: keep the rule as is, or maybe mark it as failed?
                    // For now, keep as is, maybe it has manual config.
                    enrichedRules.push(rule);
                }
            } else {
                enrichedRules.push(rule);
            }
        }
        return enrichedRules;
    }

    /**
     * 驗證資料是否符合規則
     * @param {*} data - 要驗證的資料（可以是陣列或單一物件）
     * @param {Array} validationRules - 驗證規則陣列
     * @param {Object} options - 驗證選項
     * @returns {Object} - {valid: boolean, errors: Array, data: any}
     */
    validateData(data, validationRules = [], options = {}) {
        if (!validationRules || validationRules.length === 0) {
            return { valid: true, errors: [], data };
        }

        const strictMode = options.strictMode === true || options.strictMode === 'true';
        const onValidationFail = options.onValidationFail || 'reject';

        const errors = [];
        const validatedData = [];

        const records = Array.isArray(data) ? data : [data];

        records.forEach((record, index) => {
            const recordErrors = [];

            validationRules.forEach(rule => {
                const error = this.validateField(record, rule);
                if (error) {
                    recordErrors.push({
                        index,
                        field: rule.field,
                        message: error,
                        rule: rule.type
                    });
                }
            });

            if (recordErrors.length > 0) {
                errors.push(...recordErrors);

                // 根據 onValidationFail 決定處理方式
                if (onValidationFail === 'filter') {
                    // 過濾：不加入驗證失敗的資料
                    return;
                } else if (onValidationFail === 'warn') {
                    // 警告：加入資料但標記為有問題
                    validatedData.push({
                        ...record,
                        _validationWarnings: recordErrors
                    });
                } else {
                    // reject：加入資料但最後會拒絕
                    validatedData.push(record);
                }
            } else {
                validatedData.push(record);
            }
        });

        // reject 模式下有錯誤才算失敗，filter/warn 模式都算成功（因為已經處理了錯誤）
        const isValid = onValidationFail !== 'reject' || errors.length === 0;
        const resultData = Array.isArray(data) ? validatedData : validatedData[0];

        return {
            valid: isValid,
            errors,
            data: resultData,
            totalRecords: records.length,
            validRecords: validatedData.length,
            invalidRecords: records.length - validatedData.length
        };
    }

    /**
     * 驗證單一欄位
     * @param {Object} record - 資料記錄
     * @param {Object} rule - 驗證規則
     * @returns {String|null} - 錯誤訊息，無錯誤則返回 null
     */
    validateField(record, rule) {
        const fieldValue = this.getNestedValue(record, rule.field);
        const ruleType = (rule.type || '').toLowerCase();


        // 1. 必填驗證
        if (ruleType === 'required') {
            if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
                return rule.message || `欄位 ${rule.field} 為必填`;
            }
        }

        // 如果欄位為空且非必填，跳過其他驗證
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            return null;
        }

        // 2. 型別驗證
        if (ruleType === 'string') {
            if (typeof fieldValue !== 'string') {
                return rule.message || `欄位 ${rule.field} 必須是字串`;
            }
        }

        if (ruleType === 'number') {
            const numValue = Number(fieldValue);
            if (Number.isNaN(numValue)) {
                return rule.message || `欄位 ${rule.field} 必須是數字`;
            }
            // 檢查範圍
            if (rule.min !== undefined && numValue < rule.min) {
                return rule.message || `欄位 ${rule.field} 不得小於 ${rule.min}`;
            }
            if (rule.max !== undefined && numValue > rule.max) {
                return rule.message || `欄位 ${rule.field} 不得大於 ${rule.max}`;
            }
        }

        if (ruleType === 'boolean') {
            if (typeof fieldValue !== 'boolean') {
                return rule.message || `欄位 ${rule.field} 必須是布林值`;
            }
        }

        if (ruleType === 'array') {
            if (!Array.isArray(fieldValue)) {
                return rule.message || `欄位 ${rule.field} 必須是陣列`;
            }
        }

        // 3. 格式驗證
        if (ruleType === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(fieldValue)) {
                return rule.message || `欄位 ${rule.field} 必須是有效的電子郵件`;
            }
        }

        if (ruleType === 'url') {
            try {
                new URL(fieldValue);
            } catch (e) {
                return rule.message || `欄位 ${rule.field} 必須是有效的 URL`;
            }
        }

        if (ruleType === 'date') {
            // 如果有 pattern，優先使用 pattern 驗證格式（確保格式嚴格符合）
            if (rule.pattern) {
                const regex = new RegExp(rule.pattern);
                if (!regex.test(fieldValue)) {
                    return rule.message || `欄位 ${rule.field} 日期格式不正確`;
                }
                // 格式正確後，驗證日期有效性
                // 支援 YYYYMMDD 格式驗證
                if (typeof fieldValue === 'string' && /^\d{8}$/.test(fieldValue)) {
                    const year = parseInt(fieldValue.slice(0, 4));
                    const month = parseInt(fieldValue.slice(4, 6));
                    const day = parseInt(fieldValue.slice(6, 8));
                    const date = new Date(year, month - 1, day);
                    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
                        return rule.message || `欄位 ${rule.field} 必須是有效的日期`;
                    }
                }
            } else {
                // 沒有 pattern，使用預設的日期驗證
                // 支援多種常見格式：YYYY-MM-DD, YYYYMMDD, etc.
                let date;

                // 嘗試解析 YYYYMMDD 格式
                if (typeof fieldValue === 'string' && /^\d{8}$/.test(fieldValue)) {
                    const year = parseInt(fieldValue.slice(0, 4));
                    const month = parseInt(fieldValue.slice(4, 6));
                    const day = parseInt(fieldValue.slice(6, 8));
                    date = new Date(year, month - 1, day);
                    // 驗證日期有效性
                    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
                        return rule.message || `欄位 ${rule.field} 必須是有效的日期`;
                    }
                } else {
                    // 嘗試其他格式（YYYY-MM-DD, etc.）
                    date = new Date(fieldValue);
                    if (Number.isNaN(date.getTime())) {
                        return rule.message || `欄位 ${rule.field} 必須是有效的日期`;
                    }
                }
            }
        }

        if (ruleType === 'phone') {
            // 台灣手機號碼格式：09XXXXXXXX
            const phoneRegex = /^09\d{8}$/;
            if (!phoneRegex.test(fieldValue.replace(/[-\s]/g, ''))) {
                return rule.message || `欄位 ${rule.field} 必須是有效的手機號碼`;
            }
        }

        // 4. 正規表達式驗證
        if (ruleType === 'regex' && rule.pattern) {
            const regex = new RegExp(rule.pattern);
            if (!regex.test(fieldValue)) {
                return rule.message || `欄位 ${rule.field} 格式不符合規則`;
            }
        }

        // 5. 枚舉值驗證
        if (ruleType === 'enum' && rule.values) {
            if (!rule.values.includes(fieldValue)) {
                return rule.message || `欄位 ${rule.field} 必須是 ${rule.values.join(', ')} 其中之一`;
            }
        }

        // 6. 長度驗證
        if (ruleType === 'length') {
            const length = typeof fieldValue === 'string' ? fieldValue.length :
                Array.isArray(fieldValue) ? fieldValue.length : 0;

            if (rule.min !== undefined && length < rule.min) {
                return rule.message || `欄位 ${rule.field} 長度不得少於 ${rule.min}`;
            }
            if (rule.max !== undefined && length > rule.max) {
                return rule.message || `欄位 ${rule.field} 長度不得超過 ${rule.max}`;
            }
        }

        // 7. 自訂表達式驗證
        if (ruleType === 'custom' && rule.expression) {
            try {
                // eslint-disable-next-line no-new-func
                const fn = new Function('value', 'record', `return (${rule.expression});`);
                const result = fn(fieldValue, record);
                if (!result) {
                    return rule.message || `欄位 ${rule.field} 驗證失敗`;
                }
            } catch (err) {
                console.error('Custom validation failed:', err);
                return rule.message || `欄位 ${rule.field} 自訂驗證錯誤`;
            }
        }

        return null;
    }
}

module.exports = DataTransformer;
