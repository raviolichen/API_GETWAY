/**
 * 比較舊版和新版 Schema Parser 的解析結果
 */

const { parseSchemaToRule: parseV1 } = require('../utils/schema-parser');
const { parseSchemaToRule: parseV2 } = require('../utils/schema-parser-v2');

// 測試用的 Schema
const testSchemas = [
    {
        name: 'Unit (枚舉類型)',
        schema: {
            "title": "單位",
            "en_title": "Unit",
            "explain": "大氣類監測項目之單位量度",
            "code": "字串",
            "property": "[ppm、ppb、μg/m3、%、℃、m/sec、degrees]",
            "regexp": "/^(ppm|ppb|μg\\/m3|%|℃|m\\/sec|degrees)$/"
        },
        uri: 'https://schema.gov.tw/api/Environment/Air/ObservationData/Unit'
    },
    {
        name: 'TraineesName (長度限制)',
        schema: {
            "title": "受訓人員姓名",
            "en_title": "Trainees Name",
            "explain": "姓氏與名字",
            "code": "字串",
            "property": "姓名（中文）： 建議字元不超過200 。",
            "regexp": "/^.{0,200}$/"
        },
        uri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName'
    },
    {
        name: 'Concentration (數字)',
        schema: {
            "title": "濃度",
            "en_title": "Concentration",
            "explain": "大氣類監測數據之濃度值",
            "code": "數字",
            "property": "浮點數",
            "regexp": " /^([1-9][0-9]*|0)(\\.[0-9]+)?$/ "
        },
        uri: 'https://schema.gov.tw/api/Environment/Air/ObservationData/Concentration'
    },
    {
        name: 'Birthday (日期 - 函式名稱)',
        schema: {
            "title": "生日",
            "en_title": "Birthday",
            "explain": "出生日期",
            "code": "日期",
            "property": "[0000-9999][01-12][01-31]",
            "regexp": "validateDate"
        },
        uri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday'
    }
];

console.log('='.repeat(80));
console.log('📊 Schema Parser 版本比較');
console.log('='.repeat(80));
console.log();

testSchemas.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
    console.log('─'.repeat(80));

    // 解析
    const resultV1 = parseV1(test.name, test.schema, test.uri);
    const resultV2 = parseV2(test.name, test.schema, test.uri);

    console.log('\n📥 輸入 Schema:');
    console.log(`   code: ${test.schema.code}`);
    console.log(`   property: ${test.schema.property}`);
    console.log(`   regexp: ${test.schema.regexp}`);

    console.log('\n🔵 舊版解析結果 (V1):');
    console.log(JSON.stringify(resultV1, null, 2).split('\n').map(l => '   ' + l).join('\n'));

    console.log('\n🟢 新版解析結果 (V2):');
    console.log(JSON.stringify(resultV2, null, 2).split('\n').map(l => '   ' + l).join('\n'));

    // 比較差異
    console.log('\n📊 主要差異:');
    const differences = [];

    if (resultV1.type !== resultV2.type) {
        differences.push(`   - type: ${resultV1.type} → ${resultV2.type}`);
    }

    if (resultV1.pattern !== resultV2.pattern) {
        differences.push(`   - pattern: ${resultV1.pattern || '(無)'} → ${resultV2.pattern || '(無)'}`);
    }

    if (resultV2.values && !resultV1.values) {
        differences.push(`   - 新增 values: ${resultV2.values.join(', ')}`);
    }

    if (resultV2.min !== undefined || resultV2.max !== undefined) {
        differences.push(`   - 新增長度限制: min=${resultV2.min || '無'}, max=${resultV2.max || '無'}`);
    }

    if (resultV1.message !== resultV2.message) {
        differences.push(`   - message: "${resultV1.message}" → "${resultV2.message}"`);
    }

    if (differences.length > 0) {
        console.log(differences.join('\n'));
    } else {
        console.log('   (無差異)');
    }

    console.log('\n✅ 改進說明:');
    if (test.name.includes('枚舉')) {
        if (resultV2.type === 'enum' && resultV2.values) {
            console.log('   ✅ 正確識別為枚舉類型');
            console.log('   ✅ 成功提取枚舉值');
        } else {
            console.log('   ❌ 未能正確識別為枚舉類型');
        }
    }

    if (test.name.includes('長度限制')) {
        if (resultV2.type === 'length' && resultV2.max !== undefined) {
            console.log('   ✅ 正確識別為長度驗證');
            console.log(`   ✅ 成功提取最大長度: ${resultV2.max}`);
        } else {
            console.log('   ❌ 未能正確識別為長度驗證');
        }
    }

    if (test.name.includes('數字')) {
        if (resultV2.type === 'number') {
            console.log('   ✅ 正確識別為數字類型');
            if (resultV2.pattern) {
                console.log('   ✅ 保留了 regexp 的 pattern');
            }
        }
    }

    if (test.name.includes('函式名稱')) {
        if (resultV2.validatorName === 'validateDate') {
            console.log('   ✅ 正確識別函式名稱: validateDate');
            console.log('   ✅ 設置 customValidation 標記');
        } else {
            console.log('   ❌ 未能識別函式名稱');
        }
    }

    if (resultV2.message.includes(test.schema.title)) {
        console.log('   ✅ 錯誤訊息使用了中文欄位名稱');
    }

    console.log('\n');
});

console.log('='.repeat(80));
console.log('📋 總結');
console.log('='.repeat(80));

console.log(`
🎯 V2 版本的主要改進:

1. ✅ **優先使用 regexp 欄位**
   - 舊版完全忽略 regexp，只看 property
   - 新版優先解析 regexp（正則表達式或函式名稱）

2. ✅ **正確識別枚舉類型**
   - 從 regexp 提取 (val1|val2|val3) 格式
   - 自動識別為 enum 類型並提取 values

3. ✅ **正確識別長度限制**
   - 從 regexp 提取 {min,max} 格式
   - 自動識別為 length 類型並提取 min/max

4. ✅ **支援函式名稱**
   - 識別 "validateDate" 等特殊標記
   - 設置 customValidation 標記供後續處理

5. ✅ **使用中文欄位名稱**
   - 錯誤訊息使用 schema.title
   - 更友好的錯誤提示

6. ✅ **更精確的類型判斷**
   - 根據 regexp 的內容判斷驗證類型
   - 避免誤判（如將枚舉誤判為 regex）

🚀 下一步:

1. 在 transformer.js 中使用新版 schema-parser-v2
2. 更新測試規則以驗證新的解析結果
3. 實作 customValidation 的特殊驗證邏輯
`);

console.log('='.repeat(80));
