/**
 * 測試驗證規則
 * 可以直接在命令行測試，不需要啟動 UI
 */

const DataTransformer = require('../transformer');
const db = require('../database');

// 測試數據
const testData = [
    {
        name: '測試 1: 所有欄位正確',
        data: {
            Unit: 'ppm',
            TraineesName: '張三',
            Concentration: 12.5,
            Birthday: '1990-01-01'
        }
    },
    {
        name: '測試 2: 所有欄位正確 (不同值)',
        data: {
            Unit: 'ppb',
            TraineesName: '李四',
            Concentration: 8.3,
            Birthday: '1985-06-15'
        }
    },
    {
        name: '測試 3: 所有欄位錯誤',
        data: {
            Unit: 'invalid_unit',  // ❌ 不在枚舉值中
            TraineesName: 'A'.repeat(250),  // ❌ 超過 200 字元
            Concentration: 'not_a_number',  // ❌ 不是數字
            Birthday: 'invalid_date'  // ❌ 不是有效日期
        }
    },
    {
        name: '測試 4: 特殊日期 (閏年)',
        data: {
            Unit: '℃',
            TraineesName: '王五',
            Concentration: 15.7,
            Birthday: '2000-02-29'
        }
    }
];

async function runTest() {
    console.log('='.repeat(80));
    console.log('🧪 開始測試驗證規則');
    console.log('='.repeat(80));
    console.log();

    // 從資料庫讀取規則
    db.get(
        `SELECT * FROM transformation_rules WHERE rule_name = ? ORDER BY created_at DESC LIMIT 1`,
        ['Schema 驗證測試規則'],
        async (err, rule) => {
            if (err) {
                console.error('❌ 讀取規則失敗:', err);
                db.close();
                return;
            }

            if (!rule) {
                console.error('❌ 找不到測試規則');
                console.log('💡 請先運行: node test/insert-test-rule.js');
                db.close();
                return;
            }

            console.log('📋 使用規則:', rule.rule_name);
            console.log(`   規則 ID: ${rule.rule_id}`);
            console.log();

            // 解析驗證配置
            const validationConfig = JSON.parse(rule.validation_config || '[]');
            console.log('🔍 驗證規則:');
            validationConfig.forEach((v, i) => {
                console.log(`   ${i + 1}. ${v.field} - ${v.type}`);
            });
            console.log();

            // 測試每筆資料
            const transformer = new DataTransformer();

            for (let i = 0; i < testData.length; i++) {
                const test = testData[i];
                console.log('─'.repeat(80));
                console.log(`📝 ${test.name}`);
                console.log('─'.repeat(80));

                console.log('\n📥 輸入資料:');
                console.log(JSON.stringify(test.data, null, 2));

                try {
                    // 執行轉換（包含驗證）
                    const result = await transformer.transform(test.data, {
                        validation_config: rule.validation_config,
                        validation_on_fail: rule.validation_on_fail,
                        validation_strict_mode: rule.validation_strict_mode
                    });

                    console.log('\n✅ 驗證結果: 通過');

                    if (result.validation) {
                        console.log(`\n📊 驗證統計:`);
                        console.log(`   總筆數: ${result.validation.totalRecords}`);
                        console.log(`   有效筆數: ${result.validation.validRecords}`);
                        console.log(`   無效筆數: ${result.validation.invalidRecords}`);

                        if (result.validation.errors.length > 0) {
                            console.log(`\n⚠️  警告訊息:`);
                            result.validation.errors.forEach(err => {
                                console.log(`   - ${err.message}`);
                            });
                        }
                    }

                    console.log('\n📤 輸出資料:');
                    console.log(JSON.stringify(result.output, null, 2));

                } catch (error) {
                    console.log('\n❌ 驗證結果: 失敗');
                    console.log(`\n🚫 錯誤訊息:\n${error.message}`);
                }

                console.log();
            }

            console.log('='.repeat(80));
            console.log('🎉 測試完成');
            console.log('='.repeat(80));
            console.log();
            console.log('📌 總結:');
            console.log('   - 測試 1 & 2: 應該通過驗證 ✅');
            console.log('   - 測試 3: 應該失敗並顯示 4 個錯誤 ❌');
            console.log('   - 測試 4: 應該通過驗證 ✅');
            console.log();

            db.close();
        }
    );
}

runTest().catch(err => {
    console.error('測試執行失敗:', err);
    db.close();
});
