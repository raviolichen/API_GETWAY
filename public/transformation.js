(function () {
    const moduleDefinitions = [
        {
            type: 'source',
            name: '資料來源',
            accent: '#22c55e',
            description: '呼叫外部 API、資料庫或靜態檔案。',
            fields: [
                { key: 'label', label: '顯示名稱', type: 'text', placeholder: '來源節點', defaultValue: 'Data Source' },
                { key: 'endpoint', label: '來源 URL', type: 'text', placeholder: 'https://api.data.gov/data.json' },
                { key: 'method', label: 'HTTP 方法', type: 'select', options: ['GET', 'POST'], defaultValue: 'GET' },
                { key: 'headers', label: 'HTTP Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer token"}', rows: 3 },
                { key: 'pollingInterval', label: '輪詢間隔 (秒)', type: 'number', placeholder: '60', defaultValue: 60 },
                {
                    key: 'inlinePayload',
                    label: '手動輸入資料 (JSON / CSV / XML)',
                    type: 'textarea',
                    placeholder: '{ "demo": true }',
                    rows: 6
                }
            ]
        },
        {
            type: 'filter',
            name: '資料過濾',
            accent: '#f97316',
            description: '套用條件、過濾器或驗證規則。',
            fields: [
                { key: 'label', label: '顯示名稱', type: 'text', placeholder: '過濾器', defaultValue: 'Filter' },
                {
                    key: 'mode',
                    label: '過濾方式',
                    type: 'select',
                    options: [
                        { value: 'expression', label: '表達式語法' },
                        { value: 'js', label: 'JavaScript 函數' },
                        { value: 'handlebars', label: 'Handlebars Helper' }
                    ],
                    defaultValue: 'expression',
                    hint: '表達式：直接輸入條件 (回傳布林)；JS 函式：可寫多行並 return 條件；Handlebars：模板輸出需為布林或字串 \"true\"。'
                },
                {
                    key: 'expression',
                    label: '條件/表達式',
                    type: 'textarea',
                    placeholder: 'item.status === "active"',
                    rows: 4,
                    hint: '可用變數：record / row / item / data（同一筆資料），root（原始資料）。表達式/JS 範例：record.ID && record.ID.startsWith("A")；Handlebars 範例：{{#if (eq record.ID "A123")}}true{{else}}false{{/if}}'
                },
                { key: 'stopOnFail', label: '失敗時中止流程 (true/false)', type: 'text', placeholder: 'true' }
            ]
        },
        {
            type: 'mapper',
            name: '字段映射',
            accent: '#3b82f6',
            description: '定義來源欄位如何映射至目標結構。',
            fields: [
                { key: 'label', label: '顯示名稱', type: 'text', defaultValue: 'Field Mapper' },
                {
                    key: 'mappingSchema',
                    label: '映射配置 (JSON)',
                    type: 'textarea',
                    placeholder: '{"target.name": "{{source.basic.name}}"}',
                    rows: 6
                }
            ]
        },
        {
            type: 'template',
            name: '模板渲染',
            accent: '#a855f7',
            description: '使用 Handlebars 模板輸出資料。',
            fields: [
                { key: 'label', label: '顯示名稱', type: 'text', defaultValue: 'Template' },
                {
                    key: 'templateBody',
                    label: 'Handlebars 模板',
                    type: 'textarea',
                    placeholder: '{\n  "result": {{json this}}\n}',
                    rows: 8,
                    defaultValue: '{{json this}}'
                },
                { key: 'helpers', label: '自訂 Helpers (逗號分隔)', type: 'text', placeholder: 'uppercase,dateFormat' }
            ]
        },
        {
            type: 'validator',
            name: '資料驗證',
            accent: '#ec4899',
            description: '驗證輸出資料是否符合規範，確保資料品質。',
            fields: [
                { key: 'label', label: '顯示名稱', type: 'text', defaultValue: 'Validator' },
                {
                    key: 'fieldMappings',
                    label: '欄位與 Schema URI 對照',
                    type: 'dynamic-fields',
                    hint: '每個欄位需設定欄位名稱和對應的 Schema URI，點擊 + 新增更多欄位',
                    hasDynamicFields: true
                },
                {
                    key: 'validationRules',
                    label: '已產生的驗證規則（唯讀）',
                    type: 'textarea',
                    placeholder: '尚未產生驗證規則\n\n請先填寫欄位對照表，然後點擊「產生驗證規則」按鈕',
                    rows: 10,
                    readonly: true,
                    hint: '此欄位由系統自動產生，無需手動編輯'
                },
                {
                    key: 'onValidationFail',
                    label: '驗證失敗時處理',
                    type: 'select',
                    options: [
                        { value: 'reject', label: '拒絕並返回錯誤' },
                        { value: 'filter', label: '過濾不合格資料' },
                        { value: 'warn', label: '警告但繼續輸出' }
                    ],
                    defaultValue: 'reject'
                },
                { key: 'strictMode', label: '嚴格模式 (true/false)', type: 'text', placeholder: 'true', defaultValue: 'true' }
            ]
        },
        {
            type: 'output',
            name: '輸出節點',
            accent: '#0ea5e9',
            description: '定義輸出格式、Webhook 或儲存位置。',
            fields: [
                { key: 'label', label: '顯示名稱', type: 'text', defaultValue: 'Output' },
                {
                    key: 'channel',
                    label: '輸出管道',
                    type: 'select',
                    options: [
                        { value: 'api', label: 'API Response' },
                        { value: 'webhook', label: 'Webhook' },
                        { value: 'file', label: '檔案輸出' }
                    ],
                    defaultValue: 'api'
                },
                { key: 'contentType', label: 'Content-Type', type: 'text', placeholder: 'application/json', defaultValue: 'application/json' },
                { key: 'notes', label: '備註', type: 'textarea', rows: 3 }
            ]
        }
    ];

    const builderState = {
        meta: createDefaultMeta(),
        nodes: []
    };

    const transformationState = {
        rules: [],
        endpoints: [],
        editingId: null,
        loading: false
    };

    let selectedNodeId = null;
    let initialized = false;
    let previewRunning = false;

    const dom = {
        palette: null,
        flowCanvas: null,
        inspector: null,
        preview: null,
        previewStatus: null,
        previewMeta: null,
        output: null,
        runPreviewBtn: null,
        rulesTableBody: null,
        editingIndicator: null,
        saveBtn: null,
        refreshBtn: null,
        newRuleBtn: null,
        endpointSelect: null
    };

    function initializeTransformationTab() {
        const container = document.getElementById('transformations');
        if (!container || initialized) return;

        dom.palette = document.querySelector('#module-palette .palette-list');
        dom.flowCanvas = document.getElementById('flow-canvas');
        dom.inspector = document.getElementById('module-inspector');
        dom.preview = document.getElementById('rule-preview');
        dom.previewStatus = document.getElementById('preview-status');
        dom.previewMeta = document.getElementById('preview-meta');
        dom.output = document.getElementById('rule-output');
        dom.runPreviewBtn = document.getElementById('btn-run-preview');
        dom.rulesTableBody = document.getElementById('transformations-table-body');
        dom.editingIndicator = document.getElementById('editing-indicator');
        dom.saveBtn = document.getElementById('btn-save-rule');
        dom.refreshBtn = document.getElementById('btn-refresh-rules');
        dom.newRuleBtn = document.getElementById('btn-new-rule');
        dom.endpointSelect = document.getElementById('rule-endpoint');

        renderPalette();
        syncMetaToForm();
        bindMetaEvents();
        bindActions();
        renderFlow();
        renderInspector();
        updatePreview();
        loadAdminEndpoints();
        loadTransformationRules();
        updateEditingIndicator();
        initialized = true;
    }

    function bindMetaEvents() {
        const metaBindings = [
            { id: 'rule-name', key: 'name' },
            { id: 'rule-description', key: 'description' },
            { id: 'rule-endpoint', key: 'endpointId' },
            { id: 'rule-source-format', key: 'sourceFormat' },
            { id: 'rule-target-format', key: 'targetFormat' },
            { id: 'rule-mode', key: 'mode' },
            { id: 'rule-test-url', key: 'testUrl' },
            { id: 'rule-sample-input', key: 'sampleInput' },
            { id: 'rule-expected-output', key: 'expectedOutput' },
            { id: 'rule-active', key: 'isActive', transform: (val) => Number(val) }
        ];

        metaBindings.forEach(binding => {
            const el = document.getElementById(binding.id);
            if (!el) return;
            const eventName = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(eventName, (evt) => {
                const raw = evt.target.value;
                builderState.meta[binding.key] = binding.transform ? binding.transform(raw) : raw;
                updatePreview();
            });
        });
    }

    function syncMetaToForm() {
        const fields = {
            'rule-name': builderState.meta.name,
            'rule-description': builderState.meta.description,
            'rule-endpoint': builderState.meta.endpointId,
            'rule-source-format': builderState.meta.sourceFormat,
            'rule-target-format': builderState.meta.targetFormat,
            'rule-mode': builderState.meta.mode,
            'rule-test-url': builderState.meta.testUrl,
            'rule-sample-input': builderState.meta.sampleInput,
            'rule-expected-output': builderState.meta.expectedOutput,
            'rule-active': builderState.meta.isActive
        };

        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') {
                el.value = value !== undefined && value !== null ? String(value) : '';
            } else {
                el.value = value !== undefined && value !== null ? value : '';
            }
        });
    }

    function updateEditingIndicator() {
        if (!dom.editingIndicator) return;
        if (!transformationState.editingId) {
            dom.editingIndicator.textContent = '目前編輯：尚未選擇';
            return;
        }
        const rule = transformationState.rules.find(r => r.rule_id === transformationState.editingId);
        const name = rule?.rule_name || '未命名';
        const status = rule ? (rule.is_active ? '啟用' : '停用') : '未載入';
        dom.editingIndicator.textContent = `目前編輯：${name}（${status}）`;
    }

    function normalizeTextPayload(value) {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return '';
            try {
                return JSON.stringify(JSON.parse(trimmed), null, 2);
            } catch (_) {
                return value;
            }
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch (_) {
                return String(value);
            }
        }
        return String(value);
    }

    function parseBooleanFlag(value) {
        if (value === true || value === false) return value;
        if (typeof value === 'string') {
            const lowered = value.trim().toLowerCase();
            return lowered === 'true' || lowered === '1';
        }
        return Boolean(value);
    }

    function generateNodeId() {
        return `node_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
    }

    function createDefaultMeta() {
        return {
            name: '',
            description: '',
            endpointId: '',
            sourceFormat: 'json',
            targetFormat: 'json',
            mode: 'template',
            testUrl: '',
            sampleInput: '',
            expectedOutput: '',
            isActive: 1
        };
    }

    function buildNodesFromRule(rule = {}) {
        const nodes = [];
        const pipeline = Array.isArray(rule.pipeline_config) ? [...rule.pipeline_config] : [];

        if (pipeline.length) {
            pipeline.sort((a, b) => (a.order || 0) - (b.order || 0));
            pipeline.forEach(step => {
                nodes.push({
                    id: generateNodeId(),
                    type: step.type || 'mapper',
                    config: { label: step.label || step.config?.label || '', ...(step.config || {}) }
                });
            });
            return nodes;
        }

        if (Array.isArray(rule.filter_config)) {
            rule.filter_config.forEach(filter => {
                nodes.push({
                    id: generateNodeId(),
                    type: 'filter',
                    config: {
                        label: filter.label || 'Filter',
                        mode: filter.mode || 'expression',
                        expression: filter.expression || '',
                        stopOnFail: filter.stop_on_fail !== undefined ? String(filter.stop_on_fail) : ''
                    }
                });
            });
        }

        if (rule.mapping_config) {
            const mappingConfig = typeof rule.mapping_config === 'string'
                ? rule.mapping_config
                : JSON.stringify(rule.mapping_config, null, 2);
            nodes.push({
                id: generateNodeId(),
                type: 'mapper',
                config: {
                    label: 'Field Mapper',
                    mappingSchema: mappingConfig
                }
            });
        }

        if (rule.template_config) {
            const templateBody = typeof rule.template_config === 'string'
                ? rule.template_config
                : rule.template_config?.body || '';
            nodes.push({
                id: generateNodeId(),
                type: 'template',
                config: {
                    label: 'Template',
                    templateBody,
                    helpers: Array.isArray(rule.template_helpers) ? rule.template_helpers.join(',') : (rule.template_helpers || '')
                }
            });
        }

        if (rule.validation_config) {
            const validationRules = typeof rule.validation_config === 'string'
                ? rule.validation_config
                : JSON.stringify(rule.validation_config, null, 2);

            // 嘗試從 validation_config 反推 fieldMappings
            let fieldMappings = [];
            try {
                const parsedRules = typeof rule.validation_config === 'string'
                    ? JSON.parse(rule.validation_config)
                    : rule.validation_config;
                if (Array.isArray(parsedRules)) {
                    fieldMappings = parsedRules.map(r => ({
                        fieldName: r.field || '',
                        schemaUri: r.schemaUri || ''
                    }));
                }
            } catch (err) {
                console.warn('Unable to parse validation_config for fieldMappings');
            }

            nodes.push({
                id: generateNodeId(),
                type: 'validator',
                config: {
                    label: 'Validator',
                    fieldMappings,
                    validationRules,
                    onValidationFail: rule.validation_on_fail || 'reject',
                    strictMode: String(rule.validation_strict_mode !== false)
                }
            });
        }

        if ((rule.test_source_url || rule.sample_input) && !nodes.find(n => n.type === 'source')) {
            nodes.unshift({
                id: generateNodeId(),
                type: 'source',
                config: {
                    label: 'Data Source',
                    endpoint: rule.test_source_url || '',
                    inlinePayload: normalizeTextPayload(rule.sample_input)
                }
            });
        }

        return nodes;
    }

    function bindActions() {
        const resetBtn = document.getElementById('btn-reset-flow');
        const copyBtn = document.getElementById('btn-copy-rule');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetFlow(false);
            });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(dom.preview.value || '');
                    setPreviewStatus('已複製到剪貼簿');
                } catch (err) {
                    setPreviewStatus('無法複製：請手動選取');
                    console.error(err);
                }
            });
        }

        if (dom.runPreviewBtn) {
            dom.runPreviewBtn.addEventListener('click', runPreview);
        }

        if (dom.saveBtn) {
            dom.saveBtn.addEventListener('click', saveCurrentRule);
        }

        if (dom.refreshBtn) {
            dom.refreshBtn.addEventListener('click', loadTransformationRules);
        }

        if (dom.newRuleBtn) {
            dom.newRuleBtn.addEventListener('click', () => resetFlow(true));
        }

        if (dom.rulesTableBody) {
            dom.rulesTableBody.addEventListener('click', handleRulesTableAction);
        }
    }

    function resetFlow(clearMeta = false) {
        if (clearMeta) {
            builderState.meta = createDefaultMeta();
            transformationState.editingId = null;
            updateEditingIndicator();
            syncMetaToForm();
        }
        builderState.nodes = [];
        selectedNodeId = null;
        renderFlow();
        renderInspector();
        updatePreview();
        setPreviewStatus(clearMeta ? '已重置為空白規則' : '已重置流程');
    }

    async function loadAdminEndpoints() {
        if (!dom.endpointSelect) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/endpoints`, {
                headers: { 'X-Gateway-API-Key': ADMIN_KEY }
            });
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('Unexpected response');
            transformationState.endpoints = data;
            renderEndpointOptions();
        } catch (err) {
            console.error('Failed to load endpoints for transformation rules', err);
        }
    }

    function renderEndpointOptions() {
        if (!dom.endpointSelect) return;
        dom.endpointSelect.innerHTML = `<option value="">未綁定（僅供預覽/測試）</option>`;
        transformationState.endpoints.forEach(ep => {
            const option = document.createElement('option');
            option.value = ep.endpoint_id;
            option.textContent = `${ep.name} (${ep.gateway_path})`;
            dom.endpointSelect.appendChild(option);
        });
        dom.endpointSelect.value = builderState.meta.endpointId || '';
    }

    function displayEndpoint(endpointId) {
        if (!endpointId) return '-';
        const ep = transformationState.endpoints.find(e => e.endpoint_id === endpointId);
        if (ep) return `${ep.name || ''} ${ep.gateway_path ? '(' + ep.gateway_path + ')' : ''}`.trim();
        return endpointId;
    }

    function handleRulesTableAction(evt) {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const ruleId = btn.getAttribute('data-id');
        if (!ruleId) return;

        if (action === 'load') {
            loadRuleIntoBuilder(ruleId);
        } else if (action === 'delete') {
            deleteRule(ruleId);
        }
    }

    function renderPalette() {
        if (!dom.palette) return;
        dom.palette.innerHTML = '';

        moduleDefinitions.forEach(module => {
            const item = document.createElement('div');
            item.className = 'palette-item';
            item.innerHTML = `<strong>${module.name}</strong><span>${module.description}</span>`;
            item.addEventListener('click', () => addNode(module.type));
            dom.palette.appendChild(item);
        });
    }

    function addNode(type) {
        const definition = moduleDefinitions.find(m => m.type === type);
        if (!definition) return;

        const config = {};
        definition.fields.forEach(field => {
            config[field.key] = field.defaultValue ?? '';
        });

        const node = {
            id: `node_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            type,
            config
        };

        builderState.nodes.push(node);
        selectedNodeId = node.id;
        renderFlow();
        renderInspector();
        updatePreview();
        setPreviewStatus('已新增模塊');
    }

    function removeNode(nodeId) {
        const idx = builderState.nodes.findIndex(n => n.id === nodeId);
        if (idx === -1) return;
        builderState.nodes.splice(idx, 1);
        if (selectedNodeId === nodeId) {
            selectedNodeId = builderState.nodes[idx] ? builderState.nodes[idx].id : null;
        }
        renderFlow();
        renderInspector();
        updatePreview();
        setPreviewStatus('已刪除模塊');
    }

    function moveNode(nodeId, direction) {
        const idx = builderState.nodes.findIndex(n => n.id === nodeId);
        if (idx === -1) return;
        const swapIndex = idx + direction;
        if (swapIndex < 0 || swapIndex >= builderState.nodes.length) return;
        const nodes = builderState.nodes;
        [nodes[idx], nodes[swapIndex]] = [nodes[swapIndex], nodes[idx]];
        renderFlow();
        updatePreview();
        setPreviewStatus('已重新排序');
    }

    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        renderFlow();
        renderInspector();
    }

    function renderFlow() {
        if (!dom.flowCanvas) return;
        dom.flowCanvas.innerHTML = '';

        if (builderState.nodes.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-flow-state';
            empty.innerHTML = '<p>從左側模塊庫開始建立資料流</p>';
            dom.flowCanvas.appendChild(empty);
            return;
        }

        builderState.nodes.forEach((node, index) => {
            const def = moduleDefinitions.find(m => m.type === node.type);
            const nodeEl = document.createElement('div');
            nodeEl.className = `flow-node${node.id === selectedNodeId ? ' active' : ''}`;
            if (def?.accent) {
                nodeEl.style.borderLeftColor = def.accent;
            }
            const title = document.createElement('h4');
            title.textContent = node.config.label || def?.name || '模塊';
            const desc = document.createElement('p');
            desc.textContent = buildNodeSummary(node, def);

            nodeEl.appendChild(title);
            nodeEl.appendChild(desc);
            nodeEl.addEventListener('click', () => selectNode(node.id));

            const actions = document.createElement('div');
            actions.className = 'node-actions';

            const upBtn = document.createElement('button');
            upBtn.textContent = '上移';
            upBtn.disabled = index === 0;
            upBtn.addEventListener('click', evt => {
                evt.stopPropagation();
                moveNode(node.id, -1);
            });

            const downBtn = document.createElement('button');
            downBtn.textContent = '下移';
            downBtn.disabled = index === builderState.nodes.length - 1;
            downBtn.addEventListener('click', evt => {
                evt.stopPropagation();
                moveNode(node.id, 1);
            });

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '刪除';
            removeBtn.addEventListener('click', evt => {
                evt.stopPropagation();
                removeNode(node.id);
            });

            actions.appendChild(upBtn);
            actions.appendChild(downBtn);
            actions.appendChild(removeBtn);
            nodeEl.appendChild(actions);
            dom.flowCanvas.appendChild(nodeEl);
        });
    }

    function renderInspector() {
        if (!dom.inspector) return;
        dom.inspector.innerHTML = '<h3>模塊設定</h3>';

        const node = builderState.nodes.find(n => n.id === selectedNodeId);
        if (!node) {
            const placeholder = document.createElement('p');
            placeholder.className = 'inspector-placeholder';
            placeholder.textContent = '請選擇一個模塊來編輯';
            dom.inspector.appendChild(placeholder);
            return;
        }

        const def = moduleDefinitions.find(m => m.type === node.type);
        if (!def) return;

        def.fields.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            const label = document.createElement('label');
            label.textContent = field.label;
            group.appendChild(label);

            // 處理動態欄位類型
            if (field.type === 'dynamic-fields') {
                const dynamicContainer = createDynamicFieldsInput(field, node.config[field.key] || [], (value) => {
                    updateNodeConfig(node.id, field.key, value);
                });
                group.appendChild(dynamicContainer);

                // 加入「產生驗證規則」按鈕
                if (field.hasDynamicFields && node.type === 'validator') {
                    const generateBtn = document.createElement('button');
                    generateBtn.className = 'btn-primary';
                    generateBtn.textContent = '產生驗證規則';
                    generateBtn.style.marginTop = '8px';
                    generateBtn.addEventListener('click', () => generateValidationRules(node.id));
                    group.appendChild(generateBtn);
                }
            } else {
                const input = createInputField(field, node.config[field.key] ?? field.defaultValue ?? '', (value) => {
                    updateNodeConfig(node.id, field.key, value);
                });
                group.appendChild(input);

                // 建議欄位清單（從樣例資料解析）
                if ((node.type === 'filter' && field.key === 'expression') || (node.type === 'mapper' && field.key === 'mappingSchema')) {
                    appendFieldSuggestions(group, input, node.type, field.key);
                }
            }

            // 加入提示文字
            if (field.hint) {
                const hint = document.createElement('small');
                hint.style.color = 'var(--secondary-color)';
                hint.style.display = 'block';
                hint.style.marginTop = '4px';
                hint.textContent = field.hint;
                group.appendChild(hint);
            }

            dom.inspector.appendChild(group);
        });
    }

    function createInputField(field, value, onChange) {
        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = field.rows || 4;
        } else if (field.type === 'select') {
            input = document.createElement('select');
            const options = field.options || [];
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                if (typeof opt === 'string') {
                    optionEl.value = opt;
                    optionEl.textContent = opt;
                } else {
                    optionEl.value = opt.value;
                    optionEl.textContent = opt.label;
                }
                input.appendChild(optionEl);
            });
        } else {
            input = document.createElement('input');
            input.type = field.type === 'number' ? 'number' : 'text';
        }

        input.value = value ?? '';
        if (field.placeholder) {
            input.placeholder = field.placeholder;
        }

        // 支援 readonly 屬性
        if (field.readonly) {
            input.readOnly = true;
            input.style.backgroundColor = '#f1f5f9';
            input.style.cursor = 'not-allowed';
        }

        const eventName = field.type === 'select' ? 'change' : 'input';
        input.addEventListener(eventName, evt => onChange(evt.target.value));
        return input;
    }

    function appendFieldSuggestions(container, targetInput, nodeType, fieldKey) {
        const paths = getSampleFieldPaths();
        if (!paths.length) return;

        const helper = document.createElement('div');
        helper.style.marginTop = '8px';
        helper.style.display = 'flex';
        helper.style.flexWrap = 'wrap';
        helper.style.gap = '6px';

        const label = document.createElement('span');
        label.textContent = '欄位建議：';
        label.style.color = 'var(--secondary-color)';
        label.style.fontSize = '0.9rem';
        helper.appendChild(label);

        paths.slice(0, 30).forEach(path => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = path;
            btn.style.border = '1px solid var(--border-color)';
            btn.style.background = '#f8fafc';
            btn.style.padding = '4px 8px';
            btn.style.borderRadius = '6px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '0.85rem';
            btn.addEventListener('click', () => {
                let insertText = path;
                if (nodeType === 'filter') {
                    insertText = `record.${path}`;
                }
                insertAtCursor(targetInput, insertText);
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            });
            helper.appendChild(btn);
        });

        container.appendChild(helper);
    }

    function updateNodeConfig(nodeId, key, value) {
        const node = builderState.nodes.find(n => n.id === nodeId);
        if (!node) return;
        node.config[key] = value;
        renderFlow();
        updatePreview();
        setPreviewStatus('已更新模塊');
    }

    function buildNodeSummary(node, def) {
        if (!def) return '';
        switch (node.type) {
            case 'source':
                if (node.config.inlinePayload && node.config.inlinePayload.trim()) {
                    return '使用手動輸入資料';
                }
                return node.config.endpoint || def.description;
            case 'mapper':
                return node.config.mappingSchema ? '映射節點已設定' : def.description;
            case 'template':
                return node.config.helpers ? `Helpers: ${node.config.helpers}` : 'Handlebars 模板';
            case 'filter':
                return node.config.expression || def.description;
            case 'validator':
                const fieldMappings = node.config.fieldMappings || [];
                const validFieldsCount = fieldMappings.filter(m => m.fieldName && m.schemaUri).length;
                if (validFieldsCount > 0) {
                    return `驗證 ${validFieldsCount} 個欄位`;
                }
                return node.config.validationRules ? '已設定驗證規則' : def.description;
            case 'output':
                return node.config.channel ? `輸出：${node.config.channel}` : def.description;
            default:
                return def.description;
        }
    }

    async function loadTransformationRules() {
        if (!dom.rulesTableBody) return;
        transformationState.loading = true;
        renderTransformationTable(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/transformations`, {
                headers: { 'X-Gateway-API-Key': ADMIN_KEY }
            });
            const data = await res.json();
            transformationState.rules = Array.isArray(data) ? data : [];
            renderTransformationTable();
            updateEditingIndicator();
        } catch (err) {
            console.error('Failed to load transformation rules', err);
            dom.rulesTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger-color);">載入失敗</td></tr>`;
        } finally {
            transformationState.loading = false;
        }
    }

    function renderTransformationTable(showLoadingRow = false) {
        if (!dom.rulesTableBody) return;
        const tbody = dom.rulesTableBody;

        if (showLoadingRow) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--secondary-color);">載入中...</td></tr>`;
            return;
        }

        if (!transformationState.rules.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--secondary-color);">沒有規則，請新增</td></tr>`;
            return;
        }

        const rows = transformationState.rules.map(rule => {
            const formatText = `${(rule.source_format || '').toUpperCase()} → ${(rule.target_format || '').toUpperCase()}`;
            const typeText = (rule.transformation_type || '').toUpperCase() || 'N/A';
            const updatedAt = rule.updated_at || rule.created_at;
            const updatedText = updatedAt ? new Date(updatedAt).toLocaleString('zh-TW') : '-';
            const statusClass = rule.is_active ? 'active' : 'inactive';
            const statusText = rule.is_active ? '啟用' : '停用';
            const endpointLabel = displayEndpoint(rule.endpoint_id);
            return `
                <tr>
                    <td>${rule.rule_name || '未命名'}</td>
                    <td>${endpointLabel}</td>
                    <td>${formatText}</td>
                    <td>${typeText}</td>
                    <td>${updatedText}</td>
                    <td><span class="status ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn-sm btn-secondary" data-action="load" data-id="${rule.rule_id}">載入</button>
                        <button class="btn-sm btn-danger" data-action="delete" data-id="${rule.rule_id}">刪除</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    function loadRuleIntoBuilder(ruleId) {
        const rule = transformationState.rules.find(r => r.rule_id === ruleId);
        if (!rule) return;
        transformationState.editingId = ruleId;
        populateBuilderFromRule(rule);
        updateEditingIndicator();
    }

    function populateBuilderFromRule(rule) {
        builderState.meta = {
            ...createDefaultMeta(),
            name: rule.rule_name || '',
            description: rule.description || '',
            endpointId: rule.endpoint_id || '',
            sourceFormat: rule.source_format || 'json',
            targetFormat: rule.target_format || 'json',
            mode: rule.transformation_type || 'template',
            testUrl: rule.test_source_url || '',
            sampleInput: normalizeTextPayload(rule.sample_input),
            expectedOutput: normalizeTextPayload(rule.expected_output),
            isActive: rule.is_active !== undefined ? Number(rule.is_active) : 1
        };

        builderState.nodes = buildNodesFromRule(rule);
        selectedNodeId = builderState.nodes[0]?.id || null;
        syncMetaToForm();
        renderFlow();
        renderInspector();
        updatePreview();
        setPreviewStatus(`已載入規則：${builderState.meta.name || '未命名'}`);
    }

    async function deleteRule(ruleId) {
        const rule = transformationState.rules.find(r => r.rule_id === ruleId);
        const ruleName = rule?.rule_name || '此規則';
        if (!confirm(`確認刪除「${ruleName}」嗎？`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/transformations/${ruleId}`, {
                method: 'DELETE',
                headers: { 'X-Gateway-API-Key': ADMIN_KEY }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || '刪除失敗');
            }

            transformationState.rules = transformationState.rules.filter(r => r.rule_id !== ruleId);
            renderTransformationTable();
            if (transformationState.editingId === ruleId) {
                resetFlow(true);
            }
            setPreviewStatus('規則已刪除');
        } catch (err) {
            console.error('Delete failed', err);
            alert(err.message || '刪除失敗');
        }
    }

    async function saveCurrentRule() {
        const payload = buildRulePayload();
        if (!payload.rule_name || !payload.rule_name.trim()) {
            alert('請輸入規則名稱');
            return;
        }

        const isUpdating = Boolean(transformationState.editingId);
        const url = isUpdating
            ? `${API_BASE}/api/admin/transformations/${transformationState.editingId}`
            : `${API_BASE}/api/admin/transformations`;

        try {
            const res = await fetch(url, {
                method: isUpdating ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Gateway-API-Key': ADMIN_KEY
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || '儲存失敗');
            }

            transformationState.editingId = data.rule_id || transformationState.editingId;
            await loadTransformationRules();
            setPreviewStatus(isUpdating ? '規則已更新' : '規則已建立');
            updateEditingIndicator();
        } catch (err) {
            console.error('Save failed', err);
            alert(err.message || '儲存失敗');
        }
    }

    function updatePreview() {
        if (!dom.preview) return;
        const payload = buildRulePayload();
        dom.preview.value = JSON.stringify(payload, null, 2);
    }

    function setPreviewStatus(text) {
        if (dom.previewStatus) {
            dom.previewStatus.textContent = text;
        }
    }

    async function runPreview() {
        if (previewRunning) return;
        previewRunning = true;
        if (dom.runPreviewBtn) {
            dom.runPreviewBtn.disabled = true;
        }
        if (dom.output) {
            dom.output.value = '執行預覽中...';
        }
        setPreviewStatus('執行轉換中');

        const payload = buildRulePayload();

        try {
            const response = await fetch(`${API_BASE}/api/admin/transformations/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Gateway-API-Key': ADMIN_KEY
                },
                body: JSON.stringify({
                    rule: payload,
                    sample_input: payload.sample_input
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || '預覽失敗');
            }

            if (dom.output) {
                // 檢查驗證狀態
                const hasValidation = result.validation;
                const isValid = hasValidation ? result.validation.valid : true;
                const hasErrors = hasValidation && result.validation.errors && result.validation.errors.length > 0;

                if (hasValidation && !isValid) {
                    // 情況 1: 驗證失敗 (reject 模式)
                    const errors = result.validation.errors || [];
                    const lines = errors.map(err => `第 ${err.index + 1} 筆 - ${err.field || '未指定欄位'}: ${err.message || '驗證失敗'}`);
                    dom.output.value = lines.length ? `❌ 驗證失敗：\n${lines.join('\n')}` : '❌ 驗證失敗';

                } else if (hasValidation && isValid && hasErrors) {
                    // 情況 2: 有警告或過濾 (warn/filter 模式)
                    const outputText = typeof result.output_text === 'string'
                        ? result.output_text
                        : JSON.stringify(result.output, null, 2);

                    const errors = result.validation.errors;
                    const warningLines = errors.map(err =>
                        `第 ${err.index + 1} 筆 - ${err.field || '未指定欄位'}: ${err.message || '驗證失敗'}`
                    );

                    // 顯示警告訊息 + 輸出資料
                    dom.output.value = `⚠️ 驗證警告（${errors.length} 個）：\n${warningLines.join('\n')}\n\n` +
                                      `📤 輸出資料：\n${outputText}`;

                } else {
                    // 情況 3: 正常輸出（無錯誤或無驗證）
                    dom.output.value = typeof result.output_text === 'string'
                        ? result.output_text
                        : JSON.stringify(result.output, null, 2);
                }
            }

            if (dom.previewMeta) {
                let validationText = '';
                if (result.validation) {
                    if (result.validation.valid && result.validation.errors && result.validation.errors.length > 0) {
                        validationText = ` ｜ 驗證：⚠️ ${result.validation.errors.length} 個警告`;
                    } else {
                        validationText = ` ｜ 驗證：${result.validation.valid ? '✅ 通過' : '❌ 未通過'}`;
                    }
                }
                dom.previewMeta.textContent = `輸出格式：${result.target_format || payload.target_format} ｜ Filters：${result.meta?.filtersApplied || 0}${validationText}`;
            }

            setPreviewStatus('預覽完成');
        } catch (err) {
            console.error('Preview failed', err);
            if (dom.output) {
                dom.output.value = `❌ ${err.message}`;
            }
            if (dom.previewMeta) {
                dom.previewMeta.textContent = '預覽失敗';
            }
            setPreviewStatus('預覽失敗');
        } finally {
            previewRunning = false;
            if (dom.runPreviewBtn) {
                dom.runPreviewBtn.disabled = false;
            }
        }
    }

    function createDynamicFieldsInput(field, value, onChange) {
        const container = document.createElement('div');
        container.style.border = '1px solid var(--border-color)';
        container.style.borderRadius = '4px';
        container.style.padding = '10px';
        container.style.marginTop = '8px';
        container.style.backgroundColor = '#fafafa';

        // 初始化欄位列表
        let fieldMappings = Array.isArray(value) ? [...value] : [];
        if (fieldMappings.length === 0) {
            fieldMappings.push({ fieldName: '', schemaUri: '' });
        }

        const toolbar = document.createElement('div');
        toolbar.style.display = 'flex';
        toolbar.style.justifyContent = 'flex-end';
        toolbar.style.marginBottom = '8px';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-sm';
        exportBtn.textContent = '匯出 CSV';
        exportBtn.addEventListener('click', () => {
            const validRows = fieldMappings.filter(m => m.fieldName || m.schemaUri);
            if (!validRows.length) {
                alert('請先填寫至少一個欄位與 Schema URI 才能匯出');
                return;
            }

            const lines = [];
            lines.push(['fieldName', 'schemaUri'].join(','));
            validRows.forEach(row => {
                const field = String(row.fieldName || '').replace(/\"/g, '\"\"');
                const uri = String(row.schemaUri || '').replace(/\"/g, '\"\"');
                lines.push(`"${field}","${uri}"`);
            });

            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'validation_fields.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        toolbar.appendChild(exportBtn);
        container.appendChild(toolbar);

        const rowsWrapper = document.createElement('div');
        container.appendChild(rowsWrapper);

        function renderRows() {
            rowsWrapper.innerHTML = '';

            fieldMappings.forEach((mapping, index) => {
                const row = document.createElement('div');
                row.style.display = 'grid';
                row.style.gridTemplateColumns = '1fr 2fr auto';
                row.style.gap = '8px';
                row.style.marginBottom = '8px';
                row.style.alignItems = 'center';

                // 欄位名稱輸入框
                const fieldNameInput = document.createElement('input');
                fieldNameInput.type = 'text';
                fieldNameInput.placeholder = '欄位名稱（如 Name）';
                fieldNameInput.value = mapping.fieldName || '';
                fieldNameInput.addEventListener('input', (e) => {
                    fieldMappings[index].fieldName = e.target.value;
                    onChange(fieldMappings);
                });

                // Schema URI 輸入框
                const uriInput = document.createElement('input');
                uriInput.type = 'text';
                uriInput.placeholder = 'Schema URI（如 https://schema.gov.tw/.../Name）';
                uriInput.value = mapping.schemaUri || '';
                uriInput.addEventListener('input', (e) => {
                    fieldMappings[index].schemaUri = e.target.value;
                    onChange(fieldMappings);
                });

                // 按鈕容器
                const btnContainer = document.createElement('div');
                btnContainer.style.display = 'flex';
                btnContainer.style.gap = '4px';

                // 刪除按鈕
                const removeBtn = document.createElement('button');
                removeBtn.textContent = '−';
                removeBtn.className = 'btn-sm btn-danger';
                removeBtn.style.width = '32px';
                removeBtn.style.height = '32px';
                removeBtn.addEventListener('click', () => {
                    if (fieldMappings.length > 1) {
                        fieldMappings.splice(index, 1);
                        onChange(fieldMappings);
                        renderRows();
                    } else {
                        alert('至少需要保留一個欄位');
                    }
                });

                // 新增按鈕（僅在最後一列顯示）
                if (index === fieldMappings.length - 1) {
                    const addBtn = document.createElement('button');
                    addBtn.textContent = '+';
                    addBtn.className = 'btn-sm btn-primary';
                    addBtn.style.width = '32px';
                    addBtn.style.height = '32px';
                    addBtn.addEventListener('click', () => {
                        fieldMappings.push({ fieldName: '', schemaUri: '' });
                        onChange(fieldMappings);
                        renderRows();
                    });
                    btnContainer.appendChild(addBtn);
                }

                btnContainer.appendChild(removeBtn);

                row.appendChild(fieldNameInput);
                row.appendChild(uriInput);
                row.appendChild(btnContainer);
                rowsWrapper.appendChild(row);
            });
        }

        renderRows();
        return container;
    }

    async function generateValidationRules(nodeId) {
        const node = builderState.nodes.find(n => n.id === nodeId);
        if (!node || node.type !== 'validator') {
            alert('只有驗證模塊可以產生驗證規則');
            return;
        }

        const fieldMappings = node.config.fieldMappings || [];
        if (fieldMappings.length === 0 || !fieldMappings.some(m => m.fieldName && m.schemaUri)) {
            alert('請先填寫至少一個欄位名稱和 Schema URI');
            return;
        }

        try {
            const validationRules = [];

            // 若所有欄位使用同一個 Schema URI，優先透過後端匯入正式規則
            const uniqueUris = Array.from(new Set(fieldMappings.map(m => m.schemaUri).filter(Boolean)));
            if (uniqueUris.length === 1) {
                let schemaUri = uniqueUris[0];
                if (!/^https?:\/\//i.test(schemaUri)) {
                    // 允許輸入類似 api/Environment/... 的路径，補上官方前綴
                    schemaUri = `https://schema.gov.tw/${schemaUri.replace(/^\/+/, '')}`;
                }
                const res = await fetch(`${API_BASE}/api/admin/transformations/import-schema`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Gateway-API-Key': ADMIN_KEY
                    },
                    body: JSON.stringify({ schema_uri: schemaUri })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || '匯入 Schema 失敗');
                }
                const importedRules = data.validation_rules || [];
                if (!importedRules.length) {
                    throw new Error('Schema 內容無可用欄位，無法產生驗證規則');
                }
                node.config.validationRules = JSON.stringify(importedRules, null, 2);
                node.config.fieldMappings = importedRules.map(r => ({
                    fieldName: r.field || '',
                    schemaUri: r.schemaUri || schemaUri
                }));

                renderInspector();
                updatePreview();
                alert(`成功匯入 ${data.field_count || importedRules.length} 個欄位的驗證規則${data.schema_title ? `\n\nSchema: ${data.schema_title}` : ''}`);
                return;
            }

            for (const mapping of fieldMappings) {
                if (!mapping.fieldName || !mapping.schemaUri) continue;

                // 嘗試從 Schema URI 獲取規則
                try {
                    let uri = mapping.schemaUri || '';
                    if (!/^https?:\/\//i.test(uri)) {
                        uri = `https://schema.gov.tw/${uri.replace(/^\/+/, '')}`;
                    }
                    const res = await fetch(uri);
                    const schemaData = await res.json();

                    // 根據 Schema 產生驗證規則
                    const rule = {
                        field: mapping.fieldName,
                        schemaUri: mapping.schemaUri
                    };

                    // 單欄位 schema.gov.tw 格式（title/code/property/regexp）
                    const normalizedCode = String(schemaData.code || '').toLowerCase();
                    const normalizedProp = String(schemaData.property || '').toLowerCase();
                    const normalizeRegex = (candidate, fallback) => {
                        if (!candidate && !fallback) return null;
                        let raw = String(candidate || fallback || '').trim();
                        if (!raw) return null;
                        if (raw === 'idValidate') return '^[A-Z][12][0-9]{8}$';
                        raw = raw.replace(/^\\?\//, '').replace(/\\?\/$/, '');
                        raw = raw.replace(/0{2,}-9{2,}/g, (m) => {
                            const [zeros] = m.split('-');
                            return `[0-9]{${zeros.length}}`;
                        });
                        return raw || null;
                    };
                    if (schemaData.title || schemaData.code || schemaData.property || schemaData.regexp) {
                        if (normalizedCode.includes('數') || normalizedProp.includes('數')) {
                            rule.type = 'number';
                            rule.message = `欄位 ${mapping.fieldName} 必須是數字`;
                        } else {
                            rule.type = 'string';
                            rule.message = `欄位 ${mapping.fieldName} 必須是字串`;
                        }
                        const pattern = normalizeRegex(schemaData.regexp, schemaData.property);
                        if (pattern) {
                            rule.type = 'regex';
                            rule.pattern = pattern;
                            rule.message = `欄位 ${mapping.fieldName} 格式不符合規則`;
                        }
                        validationRules.push(rule);
                        continue;
                    }

                    // 檢查是否為必填
                    if (schemaData.required === true || schemaData.constraints?.required === true) {
                        rule.type = 'required';
                        rule.message = `欄位 ${mapping.fieldName} 為必填`;
                    } else {
                        // 預設為 string 類型
                        rule.type = 'string';
                        rule.message = `欄位 ${mapping.fieldName} 必須是字串`;
                    }

                    // 檢查資料型別
                    const fieldType = schemaData.type || schemaData.dataType || '';
                    if (fieldType.toLowerCase() === 'number' || fieldType.toLowerCase() === 'integer') {
                        rule.type = 'number';
                        rule.message = `欄位 ${mapping.fieldName} 必須是數字`;
                        if (schemaData.minimum !== undefined) rule.min = schemaData.minimum;
                        if (schemaData.maximum !== undefined) rule.max = schemaData.maximum;
                    }

                    validationRules.push(rule);
                } catch (fetchErr) {
                    console.warn(`無法獲取 Schema: ${mapping.schemaUri}`, fetchErr);
                    // 如果無法獲取 Schema，使用預設規則
                    validationRules.push({
                        field: mapping.fieldName,
                        type: 'required',
                        message: `欄位 ${mapping.fieldName} 為必填`,
                        schemaUri: mapping.schemaUri
                    });
                }
            }

            // 將驗證規則填入節點配置
            node.config.validationRules = JSON.stringify(validationRules, null, 2);

            // 重新渲染 Inspector 和預覽
            renderInspector();
            updatePreview();

            alert(`成功產生 ${validationRules.length} 個欄位的驗證規則！`);
        } catch (err) {
            console.error('Generate validation rules failed:', err);
            alert(`產生驗證規則失敗：${err.message}`);
        }
    }

    async function importSchemaValidation(nodeId) {
        const node = builderState.nodes.find(n => n.id === nodeId);
        if (!node || node.type !== 'validator') {
            alert('只有驗證模塊可以匯入 Schema');
            return;
        }

        const schemaUri = node.config.schemaUri;
        if (!schemaUri || !schemaUri.trim()) {
            alert('請先輸入 Schema URI');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/transformations/import-schema`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Gateway-API-Key': ADMIN_KEY
                },
                body: JSON.stringify({ schema_uri: schemaUri })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '匯入失敗');
            }

            const result = await res.json();

            if (result.success && result.validation_rules) {
                // 將驗證規則填入節點配置
                node.config.validationRules = JSON.stringify(result.validation_rules, null, 2);

                // 重新渲染 Inspector 和預覽
                renderInspector();
                updatePreview();

                alert(`成功匯入 ${result.field_count} 個欄位的驗證規則！\n\nSchema: ${result.schema_title || '未命名'}`);
            } else {
                throw new Error('Schema 格式錯誤或無可用欄位');
            }
        } catch (err) {
            console.error('Import schema failed:', err);
            alert(`匯入 Schema 失敗：${err.message}\n\n請確認 Schema URI 是否正確且可訪問。`);
        }
    }

    function buildRulePayload() {
        const templateNode = builderState.nodes.find(node => node.type === 'template');
        const mapperNode = builderState.nodes.find(node => node.type === 'mapper');
        const filterNodes = builderState.nodes.filter(node => node.type === 'filter');
        const validatorNode = builderState.nodes.find(node => node.type === 'validator');

        const pipeline = builderState.nodes.map((node, index) => ({
            order: index + 1,
            type: node.type,
            label: node.config.label,
            config: node.config
        }));

        const inlineSourceNode = builderState.nodes.find(node => {
            return node.type === 'source' && node.config.inlinePayload && node.config.inlinePayload.trim();
        });

        const derivedSampleInput = inlineSourceNode ? inlineSourceNode.config.inlinePayload : builderState.meta.sampleInput;

        return {
            rule_name: builderState.meta.name,
            description: builderState.meta.description,
            endpoint_id: builderState.meta.endpointId || null,
            source_format: builderState.meta.sourceFormat,
            target_format: builderState.meta.targetFormat,
            transformation_type: builderState.meta.mode,
            test_source_url: builderState.meta.testUrl,
            sample_input: derivedSampleInput,
            expected_output: builderState.meta.expectedOutput,
            is_active: builderState.meta.isActive,
            template_config: templateNode ? templateNode.config.templateBody : '',
            mapping_config: mapperNode ? mapperNode.config.mappingSchema : '',
            filter_config: filterNodes.map(node => ({
                label: node.config.label,
                mode: node.config.mode,
                expression: node.config.expression,
                stop_on_fail: parseBooleanFlag(node.config.stopOnFail)
            })),
            validation_config: validatorNode ? validatorNode.config.validationRules : '',
            validation_field_mappings: validatorNode ? JSON.stringify(validatorNode.config.fieldMappings || []) : '',
            validation_on_fail: validatorNode ? validatorNode.config.onValidationFail : 'reject',
            validation_strict_mode: validatorNode ? parseBooleanFlag(validatorNode.config.strictMode) : true,
            pipeline_config: pipeline,
            pipeline
        };
    }

    function getSampleFieldPaths() {
        let sampleStr = builderState.meta.sampleInput || '';
        const inlineSourceNode = builderState.nodes.find(node => node.type === 'source' && node.config.inlinePayload && node.config.inlinePayload.trim());
        if (inlineSourceNode) {
            sampleStr = inlineSourceNode.config.inlinePayload;
        }

        if (!sampleStr) return [];
        let obj;
        try {
            obj = JSON.parse(sampleStr);
        } catch (_) {
            return [];
        }

        const paths = [];
        const walk = (value, prefix) => {
            if (Array.isArray(value)) {
                if (value.length === 0) return;
                const nextPrefix = prefix ? `${prefix}[0]` : '';
                walk(value[0], nextPrefix);
                return;
            }
            if (value && typeof value === 'object') {
                Object.entries(value).forEach(([k, v]) => {
                    const next = prefix ? `${prefix}.${k}` : k;
                    if (v && typeof v === 'object') {
                        walk(v, next);
                    } else {
                        paths.push(next);
                    }
                });
                return;
            }
            if (prefix) {
                paths.push(prefix);
            }
        };

        walk(obj, '');
        return Array.from(new Set(paths));
    }

    function insertAtCursor(input, text) {
        if (!input) return;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        input.value = `${before}${text}${after}`;
        const pos = start + text.length;
        input.selectionStart = pos;
        input.selectionEnd = pos;
        input.focus();
    }

    window.initializeTransformationTab = initializeTransformationTab;
})();
