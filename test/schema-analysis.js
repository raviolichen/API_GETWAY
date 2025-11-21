/**
 * Schema 格式分析與驗證測試
 * 分析 schema.gov.tw 返回的 4 種不同類型的 Schema 格式
 */

const { parseSchemaToRule } = require('../utils/schema-parser');

// 1. Unit - 字串 (枚舉類型)
const unitSchema = {
  "title": "單位",
  "en_title": "Unit",
  "explain": "大氣類監測項目之單位量度",
  "code": "字串",
  "property": "[ppm、ppb、μg/m3、%、℃、m/sec、degrees]",
  "note": null,
  "regexp": "/^(ppm|ppb|μg\\/m3|%|℃|m\\/sec|degrees)$/",
};

// 2. TraineesName - 帶規則的字串 (長度限制)
const traineesNameSchema = {
  "title": "受訓人員姓名",
  "en_title": "Trainees  Name",
  "explain": "姓氏與名字",
  "code": "字串",
  "property": "姓名（中文）： 建議字元不超過200 。  姓名(拼音)： /^[\\p{Latin}\\p{P}\\p{Zs}]{1,200}$/u。",
  "note": null,
  "regexp": "/^.{0,200}$/",
};

// 3. Concentration - 數字 (浮點數)
const concentrationSchema = {
  "title": "濃度",
  "en_title": "Concentration",
  "explain": "大氣類監測數據之濃度值",
  "code": "數字",
  "property": "浮點數",
  "note": null,
  "regexp": " /^([1-9][0-9]*|0)(\\.[0-9]+)?$/ ",
};

// 4. Birthday - 日期
const birthdaySchema = {
  "title": "生日",
  "en_title": "Birthday",
  "explain": "出生日期",
  "code": "日期",
  "property": "[0000-9999][01-12][01-31]",
  "note": null,
  "regexp": "validateDate",
};

console.log('='.repeat(80));
console.log('Schema 格式分析報告');
console.log('='.repeat(80));
console.log();

// 測試函數
function analyzeSchema(name, schema, expectedBehavior) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${name}`);
    console.log('='.repeat(80));

    console.log('\n📥 Schema 輸入:');
    console.log(JSON.stringify(schema, null, 2));

    console.log('\n🔄 目前解析結果:');
    const parsedRule = parseSchemaToRule(name, schema, `https://schema.gov.tw/api/test/${name}`);
    console.log(JSON.stringify(parsedRule, null, 2));

    console.log('\n✅ 預期解析結果:');
    console.log(JSON.stringify(expectedBehavior, null, 2));

    console.log('\n⚠️  問題分析:');
    return { schema, parsedRule, expectedBehavior };
}

// 1. 分析 Unit (枚舉類型)
const unitAnalysis = analyzeSchema('Unit', unitSchema, {
    field: 'Unit',
    type: 'enum',
    values: ['ppm', 'ppb', 'μg/m3', '%', '℃', 'm/sec', 'degrees'],
    message: '欄位 Unit 必須是 ppm, ppb, μg/m3, %, ℃, m/sec, degrees 其中之一',
    schemaUri: 'https://schema.gov.tw/api/test/Unit'
});

console.log('- 目前解析為 regex 類型，應該解析為 enum 類型');
console.log('- property 欄位中的枚舉值列表未被正確提取');
console.log('- regexp 欄位被忽略，但其中包含了完整的正則表達式');

// 2. 分析 TraineesName (帶長度限制的字串)
const traineesNameAnalysis = analyzeSchema('TraineesName', traineesNameSchema, {
    field: 'TraineesName',
    type: 'string',
    maxLength: 200,
    pattern: '^.{0,200}$',
    message: '欄位 TraineesName 長度不得超過 200 字元',
    schemaUri: 'https://schema.gov.tw/api/test/TraineesName'
});

console.log('- property 欄位包含文字說明和長度限制，未被解析');
console.log('- regexp 欄位包含長度驗證的正則表達式，應提取 maxLength');
console.log('- 應該同時生成 type: "string" 和 maxLength: 200');

// 3. 分析 Concentration (數字)
const concentrationAnalysis = analyzeSchema('Concentration', concentrationSchema, {
    field: 'Concentration',
    type: 'number',
    pattern: '^([1-9][0-9]*|0)(\\.[0-9]+)?$',
    message: '欄位 Concentration 必須是有效的數字（支援浮點數）',
    schemaUri: 'https://schema.gov.tw/api/test/Concentration'
});

console.log('- 目前正確識別為 number 類型');
console.log('- property 欄位為文字說明，無需特殊處理');
console.log('- regexp 欄位包含浮點數驗證正則表達式，可選擇性使用');
console.log('- 建議: 對於 number 類型，內建驗證已足夠，regexp 可作為補充');

// 4. 分析 Birthday (日期)
const birthdayAnalysis = analyzeSchema('Birthday', birthdaySchema, {
    field: 'Birthday',
    type: 'date',
    pattern: '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$',
    format: 'YYYYMMDD',
    message: '欄位 Birthday 必須是有效的日期 (格式: YYYYMMDD)',
    schemaUri: 'https://schema.gov.tw/api/test/Birthday'
});

console.log('- 目前識別為 date 類型，但 property 被誤判為 regex');
console.log('- property 欄位 "[0000-9999][01-12][01-31]" 表示日期格式');
console.log('- regexp 欄位為 "validateDate"，這是一個特殊標記');
console.log('- 應該生成對應的日期格式驗證規則');

// 總結報告
console.log('\n\n');
console.log('='.repeat(80));
console.log('📊 總結與建議');
console.log('='.repeat(80));

console.log(`
🔍 主要問題:

1. **regexp 欄位未被使用**
   - schema.gov.tw 的 regexp 欄位包含完整的驗證正則表達式
   - 目前解析器完全忽略了這個欄位
   - 建議: 優先使用 regexp 欄位，property 欄位作為補充

2. **枚舉類型未被識別**
   - Unit 類型應該解析為 enum，而非 regex
   - property 欄位中的枚舉值列表 "[ppm、ppb、...]" 應被提取
   - 建議: 檢測 property 是否為 [...] 格式，如果是則提取枚舉值

3. **長度限制未被提取**
   - TraineesName 的 regexp "/^.{0,200}$/" 包含長度限制
   - 應該解析為 maxLength: 200
   - 建議: 解析 regexp 中的 {min,max} 語法

4. **日期格式處理不完整**
   - Birthday 的 regexp 為特殊標記 "validateDate"
   - property 欄位提供了日期格式說明
   - 建議: 為日期類型提供專門的格式解析邏輯

5. **property 欄位的多種用途**
   - 枚舉類型: 列出所有可能值
   - 字串類型: 提供文字說明和限制
   - 數字類型: 提供型別說明
   - 日期類型: 提供格式說明
   - 建議: 根據 code 欄位來決定如何解析 property

📋 建議的改進方案:

1. **優先使用 regexp 欄位**
   - 如果 regexp 存在且不為空，優先使用
   - 對 regexp 進行清理（移除前後的 / 符號和標誌）

2. **根據 code 和 property 決定驗證類型**
   - code="字串" + property="[...]" → enum 類型
   - code="字串" + regexp="{min,max}" → string + maxLength
   - code="數字" → number 類型
   - code="日期" → date 類型 + 格式驗證

3. **提取更多約束條件**
   - 從 regexp 中提取長度限制 {min,max}
   - 從 property 中提取枚舉值
   - 保留 regexp 作為自定義驗證的 pattern

4. **提供更友好的錯誤訊息**
   - 使用 schema.title 和 explain 生成中文錯誤訊息
   - 根據驗證類型提供具體的提示

🎯 下一步行動:

1. ✅ 已完成: 分析 4 種 Schema 格式的差異
2. ⏭️  待辦: 更新 schema-parser.js 支援更完整的解析
3. ⏭️  待辦: 添加對 enum、length、date format 的支援
4. ⏭️  待辦: 編寫單元測試驗證新的解析邏輯
5. ⏭️  待辦: 更新文件說明新的 Schema 支援能力
`);

console.log('\n' + '='.repeat(80));
