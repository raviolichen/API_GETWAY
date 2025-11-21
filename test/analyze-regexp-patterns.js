/**
 * 分析 schema.gov.tw 的 regexp 欄位模式
 * 研究 regexp 欄位的不同格式
 */

const schemas = [
    {
        name: 'Unit (枚舉)',
        property: "[ppm、ppb、μg/m3、%、℃、m/sec、degrees]",
        regexp: "/^(ppm|ppb|μg\\/m3|%|℃|m\\/sec|degrees)$/",
        code: "字串"
    },
    {
        name: 'TraineesName (長度限制)',
        property: "姓名（中文）： 建議字元不超過200 。  姓名(拼音)： /^[\\p{Latin}\\p{P}\\p{Zs}]{1,200}$/u。",
        regexp: "/^.{0,200}$/",
        code: "字串"
    },
    {
        name: 'Concentration (數字)',
        property: "浮點數",
        regexp: " /^([1-9][0-9]*|0)(\\.[0-9]+)?$/ ",
        code: "數字"
    },
    {
        name: 'Birthday (日期)',
        property: "[0000-9999][01-12][01-31]",
        regexp: "validateDate",
        code: "日期"
    }
];

console.log('='.repeat(80));
console.log('📊 Schema regexp 欄位模式分析');
console.log('='.repeat(80));
console.log();

// 分析每個 Schema
schemas.forEach((schema, index) => {
    console.log(`${index + 1}. ${schema.name}`);
    console.log('─'.repeat(80));

    console.log(`\n   code: "${schema.code}"`);
    console.log(`   property: "${schema.property}"`);
    console.log(`   regexp: "${schema.regexp}"`);

    // 分析 regexp 類型
    const regexp = (schema.regexp || '').trim();

    console.log(`\n   🔍 regexp 分析:`);

    if (regexp.startsWith('/') && regexp.match(/\/[igmu]*$/)) {
        console.log(`      ✅ 類型: 完整的正則表達式`);
        console.log(`      格式: /pattern/flags`);

        // 提取 pattern 和 flags
        const match = regexp.match(/^\/(.*)\/([igmu]*)$/);
        if (match) {
            console.log(`      Pattern: ${match[1]}`);
            console.log(`      Flags: ${match[2] || '(無)'}`);
        }

        // 清理後的正則表達式
        const cleaned = regexp.replace(/^\/|\/[igmu]*$/g, '');
        console.log(`      清理後: ${cleaned}`);

        // 嘗試創建 RegExp 物件
        try {
            const regex = new RegExp(cleaned, match[2] || '');
            console.log(`      ✅ 可以創建 RegExp 物件`);
        } catch (e) {
            console.log(`      ❌ 無法創建 RegExp: ${e.message}`);
        }
    } else if (regexp && !regexp.startsWith('/')) {
        console.log(`      ⚠️  類型: 函式名稱或特殊標記`);
        console.log(`      值: "${regexp}"`);
        console.log(`      可能是內部驗證函式的呼叫名稱`);
    } else if (regexp === '') {
        console.log(`      ⚠️  類型: 空值`);
        console.log(`      需要使用 property 或 code 來推斷驗證規則`);
    } else {
        console.log(`      ❓ 類型: 未知格式`);
    }

    console.log();
});

console.log('='.repeat(80));
console.log('💡 總結與建議');
console.log('='.repeat(80));

console.log(`
🔍 發現的 regexp 模式:

1. **完整的正則表達式** (3/4)
   格式: /pattern/flags
   範例: "/^.{0,200}$/"
   處理: 移除前後的 / 和 flags，直接使用

2. **函式名稱** (1/4)
   格式: 純文字字串
   範例: "validateDate"
   處理: 需要實作對應的驗證邏輯

3. **可能的其他格式** (未測試)
   - 空字串
   - null
   - 其他特殊標記

📋 建議的解析策略:

\`\`\`javascript
function parseRegexp(regexp, code, property) {
    const trimmed = (regexp || '').trim();

    // 策略 1: 檢查是否為正則表達式格式
    if (trimmed.startsWith('/') && trimmed.match(/\\/[igmu]*$/)) {
        // 清理並返回正則表達式
        const cleaned = trimmed.replace(/^\\/|\\/[igmu]*$/g, '');
        const flags = trimmed.match(/\\/([igmu]*)$/)?.[1] || '';
        return {
            type: 'regex',
            pattern: cleaned,
            flags: flags
        };
    }

    // 策略 2: 檢查是否為已知的函式名稱
    const knownFunctions = ['validateDate', 'validateTime', 'validateEmail'];
    if (knownFunctions.includes(trimmed)) {
        return {
            type: 'function',
            functionName: trimmed
        };
    }

    // 策略 3: regexp 為空，嘗試從 property 推斷
    if (!trimmed) {
        // 根據 code 和 property 推斷驗證規則
        return inferFromCodeAndProperty(code, property);
    }

    // 策略 4: 未知格式
    return {
        type: 'unknown',
        raw: trimmed
    };
}
\`\`\`

🎯 實作建議:

1. **優先使用 regexp**
   - 如果 regexp 是正則表達式，直接使用
   - 如果 regexp 是函式名稱，實作對應邏輯
   - 如果 regexp 為空，從 code + property 推斷

2. **實作特殊驗證函式**
   - validateDate: 驗證日期格式和有效性
   - validateTime: 驗證時間格式
   - validateEmail: 驗證電子郵件
   - (根據實際遇到的函式名稱添加)

3. **處理 property 作為備選**
   - 當 regexp 無法使用時
   - 從 property 提取枚舉值、長度限制等

4. **根據 code 確定基本類型**
   - code="字串" → string/enum/regex
   - code="數字" → number
   - code="日期" → date
   - code="浮點數" → number

📝 需要實作的特殊驗證函式:

\`\`\`javascript
const specialValidators = {
    validateDate: (value) => {
        // 驗證日期格式 YYYYMMDD 或 YYYY-MM-DD
        // 檢查年月日的有效性
        // 檢查閏年等特殊情況
    },

    validateTime: (value) => {
        // 驗證時間格式 HH:MM:SS 或 HHMM
    },

    validateEmail: (value) => {
        // 驗證電子郵件格式
    }

    // 根據需要添加更多...
};
\`\`\`
`);

console.log('='.repeat(80));
