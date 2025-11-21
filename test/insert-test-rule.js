/**
 * 創建包含 4 種 Schema 驗證欄位的測試規則
 */

const db = require('../database');
const crypto = require('crypto');

// 生成規則 ID
const ruleId = 'rule_schema_test_' + crypto.randomBytes(8).toString('hex');

// 欄位與 Schema URI 對照表
const fieldMappings = [
    {
        fieldName: 'Unit',
        schemaUri: 'https://schema.gov.tw/api/Environment/Air/ObservationData/Unit'
    },
    {
        fieldName: 'TraineesName',
        schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName'
    },
    {
        fieldName: 'Concentration',
        schemaUri: 'https://schema.gov.tw/api/Environment/Air/ObservationData/Concentration'
    },
    {
        fieldName: 'Birthday',
        schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday'
    }
];

// 驗證規則配置（手動配置，用於比較）
const validationConfig = [
    {
        field: 'Unit',
        type: 'enum',
        values: ['ppm', 'ppb', 'μg/m3', '%', '℃', 'm/sec', 'degrees'],
        message: '欄位 Unit 必須是 ppm, ppb, μg/m3, %, ℃, m/sec, degrees 其中之一',
        schemaUri: 'https://schema.gov.tw/api/Environment/Air/ObservationData/Unit'
    },
    {
        field: 'TraineesName',
        type: 'string',
        maxLength: 200,
        message: '欄位 TraineesName 長度不得超過 200 字元',
        schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName'
    },
    {
        field: 'Concentration',
        type: 'number',
        message: '欄位 Concentration 必須是有效的數字',
        schemaUri: 'https://schema.gov.tw/api/Environment/Air/ObservationData/Concentration'
    },
    {
        field: 'Birthday',
        type: 'date',
        message: '欄位 Birthday 必須是有效的日期',
        schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday'
    }
];

// 測試數據 - 包含正確和錯誤的資料
const sampleInput = [
    {
        Unit: 'ppm',
        TraineesName: '張三',
        Concentration: 12.5,
        Birthday: '19900101'
    },
    {
        Unit: 'ppb',
        TraineesName: '李四',
        Concentration: 8.3,
        Birthday: '19850615'
    },
    {
        Unit: 'invalid_unit',  // ❌ 錯誤: 不在枚舉值中
        TraineesName: 'A'.repeat(250),  // ❌ 錯誤: 超過 200 字元
        Concentration: 'not_a_number',  // ❌ 錯誤: 不是數字
        Birthday: 'invalid_date'  // ❌ 錯誤: 不是有效日期
    },
    {
        Unit: '℃',
        TraineesName: '王五',
        Concentration: 15.7,
        Birthday: '20000229'  // 閏年日期
    }
];

// 插入測試規則
const sql = `
INSERT INTO transformation_rules (
    rule_id,
    endpoint_id,
    rule_name,
    description,
    source_format,
    target_format,
    transformation_type,
    validation_field_mappings,
    validation_config,
    validation_on_fail,
    validation_strict_mode,
    sample_input,
    is_active
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const params = [
    ruleId,
    'ep_health',  // 綁定到健康中心端點
    'Schema 驗證測試規則',
    '測試 4 種不同類型的 Schema 驗證: 字串(枚舉)、字串(長度限制)、數字、日期',
    'json',
    'json',
    'mapping',  // 使用 mapping 類型
    JSON.stringify(fieldMappings),
    JSON.stringify(validationConfig),
    'reject',  // 驗證失敗時拒絕
    1,  // 嚴格模式
    JSON.stringify(sampleInput),
    1  // 啟用
];

db.run(sql, params, function(err) {
    if (err) {
        console.error('❌ 插入測試規則失敗:', err);
        process.exit(1);
    }

    console.log('✅ 測試規則創建成功!');
    console.log('');
    console.log('📋 規則資訊:');
    console.log(`   規則 ID: ${ruleId}`);
    console.log(`   規則名稱: Schema 驗證測試規則`);
    console.log(`   端點 ID: ep_health`);
    console.log('');
    console.log('🔍 驗證欄位:');
    fieldMappings.forEach((mapping, index) => {
        console.log(`   ${index + 1}. ${mapping.fieldName}`);
        console.log(`      Schema URI: ${mapping.schemaUri}`);
    });
    console.log('');
    console.log('📊 測試數據:');
    console.log(`   總共 ${sampleInput.length} 筆資料`);
    console.log(`   - 2 筆正確資料`);
    console.log(`   - 1 筆包含 4 個錯誤的資料`);
    console.log(`   - 1 筆包含特殊日期的資料`);
    console.log('');
    console.log('🌐 測試方式:');
    console.log('   1. 啟動服務器: node server.js');
    console.log('   2. 訪問 UI: http://localhost:3000');
    console.log(`   3. 在規則列表中找到規則 ID: ${ruleId}`);
    console.log('   4. 點擊編輯，查看驗證配置');
    console.log('   5. 點擊「執行轉換預覽」測試驗證');
    console.log('');
    console.log('💡 預期結果:');
    console.log('   - 第 1, 2, 4 筆資料應該通過驗證');
    console.log('   - 第 3 筆資料應該失敗，並顯示 4 個錯誤訊息');
    console.log('');

    db.close();
});
