const DataTransformer = require('./transformer');

const transformer = new DataTransformer();

const rule = {
    source_format: 'json',
    target_format: 'json',
    validation_config: [
        {
            field: 'ID',
            type: 'regex',
            pattern: '^[A-Z][1-2]\\d{8}$',
            message: '身分證字號格式錯誤，應為 1 個大寫英文字母 + 1 個數字(1或2) + 8 個數字',
            schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/ID'
        }
    ],
    validation_on_fail: 'reject',
    validation_strict_mode: true,
    sample_input: [
        { ID: 'A123456789', Name: '王小明' },
        { ID: 'B234567890', Name: '李小華' },
        { ID: 'C000000000', Name: '測試錯誤格式' }
    ]
};

console.log('=== 測試身分證字號驗證 ===\n');

async function test() {
    try {
        const result = await transformer.transform(rule.sample_input, rule);
        console.log('✅ 驗證通過！');
        console.log('輸出資料：');
        console.log(JSON.stringify(result.output, null, 2));
        console.log('\n驗證結果：');
        console.log(result.validation);
    } catch (err) {
        console.log('❌ 驗證失敗！');
        console.log('錯誤訊息：');
        console.log(err.message);
    }
}

test();
