/**
 * 測試嚴格的日期格式驗證
 * 確保只接受 Schema 要求的格式，拒絕其他格式
 */

const DataTransformer = require('../transformer');

console.log('='.repeat(80));
console.log('🧪 測試嚴格的日期格式驗證');
console.log('='.repeat(80));
console.log();

// 測試數據
const testData = [
    {
        id: 1,
        birthday: '19900101'  // ✅ YYYYMMDD 格式
    },
    {
        id: 2,
        birthday: '1985-06-15'  // ❌ YYYY-MM-DD 格式（應被拒絕）
    },
    {
        id: 3,
        birthday: '20000229'  // ✅ YYYYMMDD 格式（閏年）
    },
    {
        id: 4,
        birthday: '2000-02-29'  // ❌ YYYY-MM-DD 格式（應被拒絕）
    }
];

// 驗證規則：要求 YYYYMMDD 格式
const validationRules = [
    {
        field: 'birthday',
        type: 'date',
        pattern: '^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$',  // 嚴格的 YYYYMMDD 格式
        format: 'YYYYMMDD',
        message: '生日必須是 YYYYMMDD 格式（例如：19900101）'
    }
];

async function test() {
    const transformer = new DataTransformer();

    try {
        console.log('📋 驗證規則：');
        console.log('   要求格式: YYYYMMDD (例如: 19900101)');
        console.log('   Pattern: ^[0-9]{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$');
        console.log();

        const result = await transformer.transform(testData, {
            validation_config: JSON.stringify(validationRules),
            validation_on_fail: 'filter'
        });

        console.log('📊 驗證結果:');
        console.log(`   valid 標記: ${result.validation.valid}`);
        console.log(`   總筆數: ${result.validation.totalRecords}`);
        console.log(`   通過筆數: ${result.validation.validRecords}`);
        console.log(`   失敗筆數: ${result.validation.invalidRecords}`);
        console.log();

        if (result.validation.errors.length > 0) {
            console.log('❌ 驗證失敗的資料:');
            result.validation.errors.forEach(err => {
                const record = testData[err.index];
                console.log(`   第 ${err.index + 1} 筆 - birthday: "${record.birthday}" - ${err.message}`);
            });
            console.log();
        }

        console.log('✅ 通過驗證的資料:');
        result.output.forEach((item, index) => {
            console.log(`   資料 ${item.id}: birthday="${item.birthday}"`);
        });
        console.log();

        console.log('='.repeat(80));
        console.log('📊 測試驗證');
        console.log('='.repeat(80));
        console.log();

        // 驗證結果
        const checks = [
            {
                name: '資料 1 (19900101) 應該通過',
                expected: true,
                actual: result.output.some(r => r.id === 1)
            },
            {
                name: '資料 2 (1985-06-15) 應該被拒絕',
                expected: false,
                actual: result.output.some(r => r.id === 2)
            },
            {
                name: '資料 3 (20000229) 應該通過',
                expected: true,
                actual: result.output.some(r => r.id === 3)
            },
            {
                name: '資料 4 (2000-02-29) 應該被拒絕',
                expected: false,
                actual: result.output.some(r => r.id === 4)
            },
            {
                name: '應該只有 2 筆資料通過',
                expected: 2,
                actual: result.output.length
            },
            {
                name: '應該有 2 筆資料被拒絕',
                expected: 2,
                actual: result.validation.invalidRecords
            }
        ];

        let allPassed = true;
        checks.forEach(check => {
            const passed = check.expected === check.actual;
            const icon = passed ? '✅' : '❌';
            console.log(`${icon} ${check.name}`);
            if (!passed) {
                console.log(`   預期: ${check.expected}, 實際: ${check.actual}`);
                allPassed = false;
            }
        });

        console.log();
        if (allPassed) {
            console.log('🎉 所有測試通過！日期格式驗證嚴格正確！');
            console.log();
            console.log('✅ 確認：');
            console.log('   - YYYYMMDD 格式被接受 (19900101, 20000229)');
            console.log('   - YYYY-MM-DD 格式被拒絕 (1985-06-15, 2000-02-29)');
            console.log('   - 格式驗證是嚴格的，不允許其他格式');
        } else {
            console.log('❌ 部分測試失敗');
            console.log();
            console.log('⚠️  問題：驗證器可能沒有嚴格執行日期格式');
            console.log('   建議檢查：');
            console.log('   1. rule.pattern 是否正確傳遞');
            console.log('   2. validateField 是否優先使用 pattern');
        }

    } catch (error) {
        console.log('❌ 執行失敗:');
        console.log(error.message);
    }

    console.log();
    console.log('='.repeat(80));
}

test();
