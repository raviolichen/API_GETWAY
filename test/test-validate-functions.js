/**
 * 測試通用的 validate... 函式處理
 * 驗證從 property 提取驗證規則
 */

const { parseSchemaToRule, convertPropertyToPattern } = require('../utils/schema-parser-v2');

console.log('='.repeat(80));
console.log('🧪 測試通用 validate... 函式處理');
console.log('='.repeat(80));
console.log();

// 測試案例
const testCases = [
    {
        name: 'validateDate - 日期格式 YYYYMMDD',
        schema: {
            title: '生日',
            code: '日期',
            property: '[0000-9999][01-12][01-31]',
            regexp: 'validateDate'
        },
        expected: {
            type: 'regex',
            pattern: '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$'
        }
    },
    {
        name: 'validateTime - 時間格式 HHMMSS',
        schema: {
            title: '時間',
            code: '時間',
            property: '[00-23][00-59][00-59]',
            regexp: 'validateTime'
        },
        expected: {
            type: 'regex',
            pattern: '^([01][0-9]|2[0-3])([0-5][0-9])([0-5][0-9])$'
        }
    },
    {
        name: 'validateTime - 時間格式 HHMM',
        schema: {
            title: '開始時間',
            code: '時間',
            property: '[00-23][00-59]',
            regexp: 'validateTime'
        },
        expected: {
            type: 'regex',
            pattern: '^([01][0-9]|2[0-3])([0-5][0-9])$'
        }
    },
    {
        name: 'validateID - 複合格式',
        schema: {
            title: '身分證字號',
            code: '字串',
            property: '[A-Z][1-2][00000000-99999999]',
            regexp: 'validateID'
        },
        expected: {
            type: 'regex',
            pattern: '^[A-Z][1-2]\\d{8}$'
        }
    },
    {
        name: 'validateEmail - property 無規則，應放行',
        schema: {
            title: '電子郵件',
            code: '字串',
            property: '電子郵件地址',
            regexp: 'validateEmail'
        },
        expected: {
            type: 'string',  // 使用 code 的類型
            pattern: undefined
        }
    },
    {
        name: 'validateCode - 簡單範圍格式',
        schema: {
            title: '代碼',
            code: '字串',
            property: '[A-Z]',
            regexp: 'validateCode'
        },
        expected: {
            type: 'regex',
            pattern: '^[A-Z]+$'
        }
    }
];

console.log('📊 測試 convertPropertyToPattern 函數:');
console.log();

// 測試 convertPropertyToPattern
const propertyTests = [
    { input: '[0000-9999][01-12][01-31]', desc: '日期 YYYYMMDD' },
    { input: '[00-23][00-59][00-59]', desc: '時間 HHMMSS' },
    { input: '[00-23][00-59]', desc: '時間 HHMM' },
    { input: '[A-Z][1-2][00000000-99999999]', desc: '身分證' },
    { input: '[A-Z]', desc: '簡單範圍' },
    { input: '電子郵件地址', desc: '純文字（應放行）' }
];

propertyTests.forEach((test, index) => {
    const result = convertPropertyToPattern(test.input);
    console.log(`${index + 1}. ${test.desc}`);
    console.log(`   輸入: ${test.input}`);
    console.log(`   輸出: ${result || '(null - 放行)'}`);
    console.log();
});

console.log('='.repeat(80));
console.log('📊 測試 parseSchemaToRule 函數:');
console.log('='.repeat(80));
console.log();

testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}`);
    console.log('─'.repeat(80));

    const result = parseSchemaToRule(testCase.name, testCase.schema, 'test-uri');

    console.log('   輸入 Schema:');
    console.log(`      code: ${testCase.schema.code}`);
    console.log(`      property: ${testCase.schema.property}`);
    console.log(`      regexp: ${testCase.schema.regexp}`);
    console.log();

    console.log('   解析結果:');
    console.log(`      type: ${result.type}`);
    console.log(`      pattern: ${result.pattern || '(無)'}`);
    console.log(`      validatorName: ${result.validatorName || '(無)'}`);
    console.log();

    console.log('   預期結果:');
    console.log(`      type: ${testCase.expected.type}`);
    console.log(`      pattern: ${testCase.expected.pattern || '(無)'}`);
    console.log();

    // 驗證
    const typeMatch = result.type === testCase.expected.type;
    const patternMatch = result.pattern === testCase.expected.pattern;

    console.log('   驗證:');
    console.log(`      ${typeMatch ? '✅' : '❌'} type 匹配`);
    console.log(`      ${patternMatch ? '✅' : '❌'} pattern 匹配`);

    if (!typeMatch || !patternMatch) {
        console.log();
        console.log('   ⚠️  差異:');
        if (!typeMatch) {
            console.log(`      type: 預期 "${testCase.expected.type}", 實際 "${result.type}"`);
        }
        if (!patternMatch) {
            console.log(`      pattern: 預期 "${testCase.expected.pattern}", 實際 "${result.pattern}"`);
        }
    }

    console.log();
});

console.log('='.repeat(80));
console.log('📋 總結');
console.log('='.repeat(80));
console.log(`
🎯 通用 validate... 處理邏輯:

1. **遇到 regexp.startsWith('validate')**
   → 這是內部函式名稱，實際規則在 property 中

2. **嘗試從 property 提取驗證規則**
   → 使用 convertPropertyToPattern() 函數

3. **提取成功**
   → 返回 type: 'regex' + pattern

4. **提取失敗 (property 無法解析)**
   → 不返回，繼續到策略 2 (使用 code 欄位)

✅ 支援的 property 格式:
   - 日期: [0000-9999][01-12][01-31]
   - 時間: [00-23][00-59][00-59] 或 [00-23][00-59]
   - 複合: [A-Z][1-2][00000000-99999999]
   - 簡單範圍: [A-Z]
   - 正則表達式: /pattern/
   - 純文字: 無法提取 → 放行

⚠️  注意:
   - property 無法提取規則時，會放行到策略 2
   - 使用 code 欄位決定基本類型
   - 不會因為無法提取規則而報錯
`);

console.log('='.repeat(80));
