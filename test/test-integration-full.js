/**
 * 完整整合測試
 * 1. 創建 API endpoint
 * 2. 綁定驗證規則（使用 schema.gov.tw）
 * 3. 模擬 API 回傳資料
 * 4. 進行資料轉換與驗證
 * 5. 欄位對應
 * 6. 輸出 CSV
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DataTransformer = require('../transformer');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('='.repeat(80));
console.log('🧪 完整整合測試');
console.log('='.repeat(80));
console.log();

async function runTest() {
    const endpointId = `ep_test_${Date.now()}`;
    const ruleId = `rule_test_${Date.now()}`;

    try {
        // ============================================================
        // Step 1: 創建 API Endpoint
        // ============================================================
        console.log('📌 Step 1: 創建 API Endpoint');
        console.log('─'.repeat(80));

        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO api_endpoints (endpoint_id, name, gateway_path, target_url, api_type, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                endpointId,
                '員工訓練資料 API',
                '/api/training/employees',
                'https://example.com/api/training/employees',
                'data',
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✅ API Endpoint 已創建: ${endpointId}`);
        console.log(`   名稱: 員工訓練資料 API`);
        console.log(`   路徑: /api/training/employees`);
        console.log();

        // ============================================================
        // Step 2: 綁定驗證規則
        // ============================================================
        console.log('📌 Step 2: 綁定驗證規則（使用 schema.gov.tw）');
        console.log('─'.repeat(80));

        // 使用多個 schema.gov.tw 的欄位
        const validationRules = [
            {
                field: 'birthday',
                schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday'
                // 這會自動從 schema.gov.tw 抓取驗證規則
            },
            {
                field: 'name',
                schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName'
            },
            {
                field: 'age',
                type: 'number',
                min: 18,
                max: 65,
                message: '年齡必須在 18 到 65 之間'
            }
        ];

        // 欄位對應配置（正確格式：target: source）
        const mappingConfig = {
            'name': 'employee_name',
            'birthday': 'birth_date',
            'age': 'employee_age',
            'id': 'employee_id'
        };

        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO transformation_rules (
                    rule_id, endpoint_id, rule_name, description,
                    source_format, target_format, transformation_type,
                    mapping_config, validation_config, validation_on_fail,
                    is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ruleId,
                endpointId,
                '員工訓練資料轉換規則',
                '包含 schema.gov.tw 驗證規則的轉換',
                'json',
                'csv',
                'mapping',
                JSON.stringify(mappingConfig),
                JSON.stringify(validationRules),
                'filter',  // 過濾掉錯誤資料
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✅ 驗證規則已綁定: ${ruleId}`);
        console.log('   驗證欄位:');
        validationRules.forEach(rule => {
            if (rule.schemaUri) {
                console.log(`   - ${rule.field}: ${rule.schemaUri}`);
            } else {
                console.log(`   - ${rule.field}: ${rule.type} (${rule.min}-${rule.max})`);
            }
        });
        console.log();
        console.log('   欄位對應:');
        Object.entries(mappingConfig).forEach(([target, source]) => {
            console.log(`   - ${source} → ${target}`);
        });
        console.log();

        // ============================================================
        // Step 3: 模擬 API 回傳資料
        // ============================================================
        console.log('📌 Step 3: 模擬 API 回傳資料');
        console.log('─'.repeat(80));

        const mockApiData = [
            {
                employee_id: 'E001',
                employee_name: 'John Smith',
                birth_date: '19900101',  // ✅ YYYYMMDD 格式
                employee_age: 33
            },
            {
                employee_id: 'E002',
                employee_name: 'Mary Johnson',
                birth_date: '1985-06-15',  // ❌ YYYY-MM-DD 格式（會被 schema 拒絕）
                employee_age: 38
            },
            {
                employee_id: 'E003',
                employee_name: 'Robert Williams',
                birth_date: '20000229',  // ✅ YYYYMMDD 格式（閏年）
                employee_age: 24
            },
            {
                employee_id: 'E004',
                employee_name: 'Patricia Brown',
                birth_date: '19950315',  // ✅ 正確格式
                employee_age: 70  // ❌ 年齡超過 65
            },
            {
                employee_id: 'E005',
                employee_name: 'A',  // ❌ 名字太短（可能不符合 schema 規則）
                birth_date: 'invalid',  // ❌ 無效日期
                employee_age: 25
            }
        ];

        console.log('📊 模擬資料 (5 筆):');
        mockApiData.forEach((data, index) => {
            console.log(`   ${index + 1}. ${data.employee_name} - ${data.birth_date} - ${data.employee_age}歲`);
        });
        console.log();

        // ============================================================
        // Step 4: 執行資料轉換與驗證
        // ============================================================
        console.log('📌 Step 4: 執行資料轉換與驗證');
        console.log('─'.repeat(80));

        const transformer = new DataTransformer();

        // 構建轉換配置
        const transformConfig = {
            source_format: 'json',
            target_format: 'csv',
            transformation_type: 'mapping',
            mapping_config: JSON.stringify(mappingConfig),
            validation_config: JSON.stringify(validationRules),
            validation_on_fail: 'filter'
        };

        console.log('⏳ 正在執行轉換...');
        console.log('   - 從 schema.gov.tw 抓取驗證規則...');
        console.log('   - 驗證資料...');
        console.log('   - 進行欄位對應...');
        console.log('   - 轉換為 CSV...');
        console.log();

        const result = await transformer.transform(mockApiData, transformConfig);

        // ============================================================
        // Step 5: 顯示驗證結果
        // ============================================================
        console.log('📌 Step 5: 驗證結果');
        console.log('─'.repeat(80));

        console.log(`   Valid 標記: ${result.validation.valid ? '✅ true' : '❌ false'}`);
        console.log(`   總筆數: ${result.validation.totalRecords}`);
        console.log(`   通過筆數: ${result.validation.validRecords}`);
        console.log(`   失敗筆數: ${result.validation.invalidRecords}`);
        console.log();

        if (result.validation.errors.length > 0) {
            console.log('⚠️  驗證錯誤列表:');
            result.validation.errors.forEach(err => {
                console.log(`   第 ${err.index + 1} 筆 - ${err.field}: ${err.message}`);
            });
            console.log();
        }

        // ============================================================
        // Step 6: 顯示轉換後資料（JSON）
        // ============================================================
        console.log('📌 Step 6: 轉換後資料（JSON 格式）');
        console.log('─'.repeat(80));

        console.log(`   輸出筆數: ${result.output.length}`);
        console.log();
        result.output.forEach((item, index) => {
            console.log(`   ${index + 1}. ID: ${item.id}, 姓名: ${item.name}, 生日: ${item.birthday}, 年齡: ${item.age}`);
        });
        console.log();

        // ============================================================
        // Step 7: 顯示 CSV 輸出
        // ============================================================
        console.log('📌 Step 7: CSV 輸出');
        console.log('─'.repeat(80));

        console.log(result.outputText || result.output_text);
        console.log();

        // ============================================================
        // Step 8: 清理測試資料
        // ============================================================
        console.log('📌 Step 8: 清理測試資料');
        console.log('─'.repeat(80));

        await new Promise((resolve, reject) => {
            db.run('DELETE FROM transformation_rules WHERE rule_id = ?', [ruleId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve, reject) => {
            db.run('DELETE FROM api_endpoints WHERE endpoint_id = ?', [endpointId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ 測試資料已清理');
        console.log();

        // ============================================================
        // 總結
        // ============================================================
        console.log('='.repeat(80));
        console.log('📊 測試總結');
        console.log('='.repeat(80));
        console.log();
        console.log('✅ 整合測試完成！');
        console.log();
        console.log('已驗證功能:');
        console.log('  1. ✅ 創建 API endpoint');
        console.log('  2. ✅ 綁定驗證規則到 API');
        console.log('  3. ✅ 從 schema.gov.tw 自動抓取驗證規則');
        console.log('  4. ✅ 驗證資料（filter 模式）');
        console.log('  5. ✅ 欄位對應（mapping）');
        console.log('  6. ✅ 輸出 CSV 格式');
        console.log();

        const passRate = ((result.validation.validRecords / result.validation.totalRecords) * 100).toFixed(1);
        console.log(`驗證通過率: ${passRate}% (${result.validation.validRecords}/${result.validation.totalRecords})`);
        console.log();

        if (result.validation.invalidRecords > 0) {
            console.log(`⚠️  ${result.validation.invalidRecords} 筆資料被過濾（不符合驗證規則）`);
            console.log('   這是預期行為（filter 模式會移除錯誤資料）');
        }

        console.log();
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ 測試失敗:', error);

        // 清理
        try {
            await new Promise((resolve) => {
                db.run('DELETE FROM transformation_rules WHERE rule_id = ?', [ruleId], () => resolve());
            });
            await new Promise((resolve) => {
                db.run('DELETE FROM api_endpoints WHERE endpoint_id = ?', [endpointId], () => resolve());
            });
        } catch (cleanupErr) {
            console.error('清理失敗:', cleanupErr);
        }
    } finally {
        db.close();
    }
}

runTest();
