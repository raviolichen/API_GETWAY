/**
 * Improved Schema Parser (V2)
 * 基於發現：regexp 欄位可能是正則表達式或函式名稱
 *
 * 解析策略:
 * 1. 優先使用 regexp 欄位
 * 2. 如果 regexp 是正則表達式格式，直接使用
 * 3. 如果 regexp 是函式名稱，實作對應驗證邏輯
 * 4. 如果 regexp 為空，從 code + property 推斷
 */

/**
 * 特殊驗證函式
 */
const specialValidators = {
    validateDate: {
        description: '驗證日期格式和有效性',
        // 會在 transformer.js 的 validateField 中實作
        type: 'date',
        customValidation: true
    },
    validateTime: {
        description: '驗證時間格式',
        type: 'custom',
        customValidation: true
    },
    validateEmail: {
        description: '驗證電子郵件格式',
        type: 'email',
        customValidation: true
    }
};

/**
 * 清理 regexp 字串，移除前後的 / 和 flags
 * @param {string} regexp - 原始 regexp 字串
 * @returns {Object} - { pattern: string, flags: string }
 */
function cleanRegexp(regexp) {
    const trimmed = (regexp || '').trim();

    // 檢查是否為正則表達式格式 /pattern/flags
    if (trimmed.startsWith('/') && trimmed.match(/\/[igmu]*$/)) {
        const match = trimmed.match(/^\/(.*)\/([igmu]*)$/);
        if (match) {
            return {
                pattern: match[1],
                flags: match[2] || ''
            };
        }
    }

    return null;
}

/**
 * 從正則表達式提取枚舉值
 * @param {string} pattern - 正則表達式 pattern
 * @returns {Array|null} - 枚舉值陣列
 */
function extractEnumValues(pattern) {
    // 匹配格式: ^(val1|val2|val3)$
    const match = pattern.match(/^\^?\(([^)]+)\)\$?$/);
    if (match) {
        const values = match[1].split('|').map(v => {
            // 移除轉義字符
            return v.replace(/\\\//g, '/').trim();
        });
        return values;
    }
    return null;
}

/**
 * 從正則表達式提取長度限制
 * @param {string} pattern - 正則表達式 pattern
 * @returns {Object|null} - { min: number, max: number }
 */
function extractLengthConstraints(pattern) {
    // 匹配格式: ^.{min,max}$ 或 ^.{min,}$ 或 ^.{,max}$
    const match = pattern.match(/\^\.?\{(\d*),(\d*)\}\$?/);
    if (match) {
        const min = match[1] ? parseInt(match[1]) : undefined;
        const max = match[2] ? parseInt(match[2]) : undefined;
        return { min, max };
    }
    return null;
}

/**
 * 從 property 欄位轉換驗證規則為正則表達式 pattern
 * @param {string} property - Schema 的 property 欄位
 * @returns {string|null} - 轉換後的正則表達式 pattern
 */
function convertPropertyToPattern(property) {
    if (!property || typeof property !== 'string') {
        return null;
    }

    const trimmed = property.trim();

    // 檢測常見的 property 格式並轉換為正則表達式

    // 1. 日期格式: "[0000-9999][01-12][01-31]" → YYYYMMDD
    if (trimmed.match(/\[0000-9999\]\[01-12\]\[01-31\]/)) {
        return '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$';
    }

    // 2. 時間格式: "[00-23][00-59][00-59]" → HHMMSS
    if (trimmed.match(/\[00-23\]\[00-59\]\[00-59\]/)) {
        return '^([01][0-9]|2[0-3])([0-5][0-9])([0-5][0-9])$';
    }

    // 3. 時間格式: "[00-23][00-59]" → HHMM
    if (trimmed.match(/\[00-23\]\[00-59\]/)) {
        return '^([01][0-9]|2[0-3])([0-5][0-9])$';
    }

    // 4. 已經是正則表達式格式的 property（直接包含在文字中）
    // 例如: "格式: /^[A-Z]{2}\d{8}$/"
    const regexMatch = trimmed.match(/\/(.+?)\//);
    if (regexMatch) {
        return regexMatch[1];
    }

    // 5. 簡單的範圍格式: "[A-Z]" → [A-Z]
    // 這種格式直接保留，但需要完整的模式
    // 只匹配單一字符類（沒有連續多個 [...][...] 的情況）
    if (trimmed.match(/^\[[^\]]+\]$/) && !trimmed.match(/\]\[/)) {
        // 如果是簡單的字符類，直接使用
        return `^${trimmed}+$`;
    }

    // 6. 複合格式: "[A-Z][1-2][00000000-99999999]"
    // 將每個部分轉換為對應的正則表達式
    if (trimmed.includes('[') && trimmed.includes(']')) {
        let pattern = trimmed;

        // 將 [00000000-99999999] 轉換為 \d{8}
        pattern = pattern.replace(/\[(\d+)-(\d+)\]/g, (match, start, end) => {
            if (start.length === end.length && start.length > 1) {
                // 長度相同且大於1，視為固定長度數字
                return `\\d{${start.length}}`;
            }
            return match;  // 保持原樣
        });

        // 確保有開始和結束錨點
        if (!pattern.startsWith('^')) pattern = '^' + pattern;
        if (!pattern.endsWith('$')) pattern = pattern + '$';

        return pattern;
    }

    // 7. 無法識別的格式，返回 null（放行）
    return null;
}

module.exports = {
    parseSchemaToRule,
    cleanRegexp,
    extractEnumValues,
    extractLengthConstraints,
    convertPropertyToPattern,  // 🆕 匯出
    specialValidators
};

/**
 * 解析 schema.gov.tw 的 Schema 為驗證規則
 * @param {string} fieldName - 欄位名稱
 * @param {Object} schema - Schema 物件
 * @param {string} uri - Schema URI
 * @returns {Object} - 驗證規則物件
 */
function parseSchemaToRule(fieldName, schema, uri) {
    const rule = {
        field: fieldName,
        schemaUri: uri
    };

    // 取得基本資訊
    const code = (schema.code || '').trim();
    const property = (schema.property || '').trim();
    const regexp = (schema.regexp || '').trim();
    const title = schema.title || fieldName;
    const explain = schema.explain || '';

    // ============================================================
    // 策略 1: 優先使用 regexp 欄位
    // ============================================================

    if (regexp) {
        // 檢查是否為正則表達式格式
        const cleaned = cleanRegexp(regexp);

        if (cleaned) {
            // 情況 1A: regexp 是正則表達式
            const { pattern, flags } = cleaned;

            // 嘗試識別驗證類型
            // 1. 檢查是否為枚舉類型 (val1|val2|val3)
            const enumValues = extractEnumValues(pattern);
            if (enumValues) {
                rule.type = 'enum';
                rule.values = enumValues;
                rule.message = `欄位${title}必須是 ${enumValues.join(', ')} 其中之一`;
                return rule;
            }

            // 2. 檢查是否為長度限制 ^.{min,max}$
            const lengthConstraints = extractLengthConstraints(pattern);
            if (lengthConstraints && code === '字串') {
                rule.type = 'length';
                if (lengthConstraints.min !== undefined) {
                    rule.min = lengthConstraints.min;
                }
                if (lengthConstraints.max !== undefined) {
                    rule.max = lengthConstraints.max;
                }
                rule.pattern = pattern;

                if (rule.min !== undefined && rule.max !== undefined) {
                    rule.message = `欄位${title}長度必須在 ${rule.min} 到 ${rule.max} 之間`;
                } else if (rule.max !== undefined) {
                    rule.message = `欄位${title}長度不得超過 ${rule.max}`;
                } else if (rule.min !== undefined) {
                    rule.message = `欄位${title}長度不得少於 ${rule.min}`;
                }
                return rule;
            }

            // 3. 根據 code 決定基本類型
            if (code === '數字' || code === '浮點數') {
                rule.type = 'number';
                rule.pattern = pattern;
                rule.message = `欄位${title}必須是有效的數字`;
                return rule;
            }

            if (code === '日期') {
                rule.type = 'date';
                rule.pattern = pattern;
                rule.message = `欄位${title}必須是有效的日期`;
                return rule;
            }

            // 4. 預設為 regex 類型
            rule.type = 'regex';
            rule.pattern = pattern;
            if (flags) {
                rule.flags = flags;
            }
            rule.message = `欄位${title}格式不符合規則`;
            return rule;

        } else {
            // 情況 1B: regexp 不是正則表達式格式，可能是函式名稱
            // 例如: validateDate, idValidate, checkEmail 等
            // 實際的驗證規則在 property 欄位中，直接套用 property 的驗證規則

            if (property) {
                // 嘗試從 property 提取驗證規則並轉換為 pattern
                const pattern = convertPropertyToPattern(property);
                if (pattern) {
                    // 成功提取到 pattern，使用 regex 驗證
                    rule.type = 'regex';
                    rule.pattern = pattern;
                    rule.validatorName = regexp;
                    rule.propertyOriginal = property;  // 保留原始 property 供參考
                    rule.message = `欄位${title}格式不符合規則`;
                    return rule;
                }
            }

            // property 無法提取規則，放行（繼續到策略 2 使用 code 欄位）
            // 不做任何事，讓程式繼續執行到策略 2
        }
    } else {
        // 情況 2: regexp 為空或不存在
        // 直接跳到策略 2（使用 code 和 property）
    }


    // ============================================================
    // 策略 2: 使用 code 確定基本類型
    // ============================================================

    if (code === '字串') {
        rule.type = 'string';
        rule.message = `欄位${title}必須是字串`;
    } else if (code === '數字' || code === '浮點數') {
        rule.type = 'number';
        rule.message = `欄位${title}必須是數字`;
    } else if (code === '日期') {
        rule.type = 'date';
        rule.message = `欄位${title}必須是有效的日期`;
    } else {
        rule.type = 'string';
        rule.message = `欄位${title}驗證失敗`;
    }

    // ============================================================
    // 策略 3: 從 property 提取額外資訊（作為補充）
    // ============================================================

    if (property) {
        // 檢查 property 是否包含枚舉值列表
        if (property.startsWith('[') && property.endsWith(']')) {
            // 可能是枚舉值列表，但這裡不處理
            // 因為應該由 regexp 提供
        }

        // 從 property 提取數值範圍等資訊
        // 例如: "0-100" 或 ">=0" 等
        // 這部分可以根據實際需求擴展
    }

    return rule;
}
