/**
 * 創建員工訓練 API 的 endpoint 和 transformation rule
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const endpointId = 'ep_employee_training';
const ruleId = 'rule_employee_training';

async function setup() {
    console.log('='.repeat(80));
    console.log('🔧 創建員工訓練 API');
    console.log('='.repeat(80));
    console.log();

    try {
        // 1. 刪除舊的資料（如果存在）
        console.log('🗑️  清理舊資料...');
        await new Promise((resolve) => {
            db.run('DELETE FROM transformation_rules WHERE rule_id = ?', [ruleId], () => resolve());
        });
        await new Promise((resolve) => {
            db.run('DELETE FROM api_endpoints WHERE endpoint_id = ?', [endpointId], () => resolve());
        });
        console.log('✅ 舊資料已清理');
        console.log();

        // 2. 創建 API Endpoint
        console.log('📌 創建 API Endpoint...');
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO api_endpoints (endpoint_id, name, gateway_path, target_url, api_type, timeout, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                endpointId,
                '員工訓練資料 API',
                '/api/training/employees',
                'https://example.com/api/training/employees',
                'data',
                30,
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ API Endpoint 已創建');
        console.log(`   ID: ${endpointId}`);
        console.log(`   名稱: 員工訓練資料 API`);
        console.log(`   路徑: /api/training/employees`);
        console.log();

        // 3. 創建 Transformation Rule
        console.log('📌 創建 Transformation Rule...');

        const validationRules = [
            {
                field: 'birthday',
                schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday'
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

        const mappingConfig = {
            'name': 'employee_name',
            'birthday': 'birth_date',
            'age': 'employee_age',
            'id': 'employee_id'
        };

        const sampleInput = [
            {
                employee_id: 'E001',
                employee_name: 'John Smith',
                birth_date: '19900101',
                employee_age: 33
            },
            {
                employee_id: 'E002',
                employee_name: 'Mary Johnson',
                birth_date: '1985-06-15',
                employee_age: 38
            },
            {
                employee_id: 'E003',
                employee_name: 'Robert Williams',
                birth_date: '20000229',
                employee_age: 24
            },
            {
                employee_id: 'E004',
                employee_name: 'Patricia Brown',
                birth_date: '19950315',
                employee_age: 70
            },
            {
                employee_id: 'E005',
                employee_name: 'A',
                birth_date: 'invalid',
                employee_age: 25
            }
        ];

        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO transformation_rules (
                    rule_id, endpoint_id, rule_name, description,
                    source_format, target_format, transformation_type,
                    mapping_config, validation_config, validation_on_fail,
                    sample_input, is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ruleId,
                endpointId,
                '員工訓練資料轉換規則',
                '包含 schema.gov.tw 驗證規則的轉換（生日、姓名、年齡）',
                'json',
                'csv',
                'mapping',
                JSON.stringify(mappingConfig),
                JSON.stringify(validationRules),
                'filter',
                JSON.stringify(sampleInput),
                1
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ Transformation Rule 已創建');
        console.log(`   ID: ${ruleId}`);
        console.log(`   名稱: 員工訓練資料轉換規則`);
        console.log(`   驗證模式: filter（過濾錯誤資料）`);
        console.log();

        console.log('📋 驗證規則:');
        console.log('   - birthday: schema.gov.tw (YYYYMMDD 格式)');
        console.log('   - name: schema.gov.tw (拉丁字母)');
        console.log('   - age: 18-65');
        console.log();

        console.log('📋 欄位對應:');
        Object.entries(mappingConfig).forEach(([target, source]) => {
            console.log(`   - ${source} → ${target}`);
        });
        console.log();

        console.log('='.repeat(80));
        console.log('✅ 設置完成！');
        console.log('='.repeat(80));
        console.log();

        console.log('🚀 你現在可以：');
        console.log();
        console.log('1️⃣  在前台查看這個 API:');
        console.log('   打開瀏覽器: http://localhost:3000');
        console.log('   查看 Endpoints 或 Transformations 頁面');
        console.log();
        console.log('2️⃣  使用 curl 測試這個規則:');
        console.log();
        console.log('   curl -X POST http://localhost:3000/api/admin/transformations/test \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"rule_id": "' + ruleId + '", "sample_input": [{"employee_id": "E001", "employee_name": "John Smith", "birth_date": "19900101", "employee_age": 33}]}\'');
        console.log();
        console.log('3️⃣  或使用資料庫中的 sample_input 測試:');
        console.log();
        console.log('   curl -X POST http://localhost:3000/api/admin/transformations/test \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"rule_id": "' + ruleId + '"}\'');
        console.log();
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ 設置失敗:', error);
    } finally {
        db.close();
    }
}

setup();
