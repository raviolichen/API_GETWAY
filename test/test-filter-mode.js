/**
 * 測試 filter 模式的修復
 * 驗證 filter 模式下 valid 標記正確，且日期格式支援 YYYYMMDD
 */

const DataTransformer = require('../transformer');

// 測試數據
const testData = [
    {
        id: 1,
        name: '張三',
        age: 25,
        birthday: '19900101'  // YYYYMMDD 格式
    },
    {
        id: 2,
        name: '李四',
        age: 30,
        birthday: '1985-06-15'  // YYYY-MM-DD 格式
    },
    {
        id: 3,
        name: '',  // ❌ 錯誤
        age: 'invalid',  // ❌ 錯誤
        birthday: 'invalid_date'  // ❌ 錯誤
    },
    {
        id: 4,
        name: '王五',
        age: -5,  // ❌ 錯誤
        birthday: '20000229'  // 閏年日期 YYYYMMDD 格式
    }
];

// 驗證規則
const validationRules = [
    {
        field: 'name',
        type: 'required',
        message: '姓名為必填'
    },
    {
        field: 'age',
        type: 'number',
        min: 0,
        max: 120,
        message: '年齡必須是 0-120 之間的數字'
    },
    {
        field: 'birthday',
        type: 'date',
        message: '生日必須是有效的日期'
    }
];

async function testFilterMode() {
    console.log('='.repeat(80));
    console.log('🧪 測試 FILTER 模式修復');
    console.log('='.repeat(80));
    console.log();

    const transformer = new DataTransformer();

    try {
        const result = await transformer.transform(testData, {
            validation_config: JSON.stringify(validationRules),
            validation_on_fail: 'filter'
        });

        console.log('✅ 執行成功（沒有拋出錯誤）');
        console.log();

        // 顯示驗證結果
        if (result.validation) {
            console.log('📊 驗證結果:');
            console.log(`   valid 標記: ${result.validation.valid}`);
            console.log(`   總筆數: ${result.validation.totalRecords}`);
            console.log(`   有效筆數: ${result.validation.validRecords}`);
            console.log(`   無效筆數: ${result.validation.invalidRecords}`);
            console.log(`   錯誤數量: ${result.validation.errors.length}`);
            console.log();

            if (result.validation.errors.length > 0) {
                console.log('⚠️  驗證錯誤列表:');
                result.validation.errors.forEach(err => {
                    console.log(`   第 ${err.index + 1} 筆 - ${err.field}: ${err.message}`);
                });
                console.log();
            }
        }

        // 顯示輸出資料
        console.log('📤 輸出資料:');
        console.log(`   輸出筆數: ${result.output.length}`);
        result.output.forEach((item, index) => {
            console.log(`\n   資料 ${index + 1}:`);
            console.log(`      id: ${item.id}`);
            console.log(`      name: ${item.name}`);
            console.log(`      age: ${item.age}`);
            console.log(`      birthday: ${item.birthday}`);
        });

        console.log();
        console.log('='.repeat(80));
        console.log('✅ 測試結果');
        console.log('='.repeat(80));
        console.log();

        // 驗證修復
        const checks = [
            {
                name: 'valid 標記應該是 true',
                pass: result.validation.valid === true,
                value: result.validation.valid
            },
            {
                name: '應該過濾掉 2 筆錯誤資料',
                pass: result.validation.invalidRecords === 2,
                value: result.validation.invalidRecords
            },
            {
                name: '應該輸出 2 筆正確資料',
                pass: result.output.length === 2,
                value: result.output.length
            },
            {
                name: '資料 1 的 birthday 應該是 19900101',
                pass: result.output[0]?.birthday === '19900101',
                value: result.output[0]?.birthday
            },
            {
                name: '資料 2 的 birthday 應該是 1985-06-15',
                pass: result.output[1]?.birthday === '1985-06-15',
                value: result.output[1]?.birthday
            },
            {
                name: '錯誤列表應該包含 4 個錯誤',
                pass: result.validation.errors.length === 4,
                value: result.validation.errors.length
            }
        ];

        checks.forEach(check => {
            const icon = check.pass ? '✅' : '❌';
            console.log(`${icon} ${check.name}`);
            if (!check.pass) {
                console.log(`   預期: true, 實際: ${check.value}`);
            }
        });

        const allPassed = checks.every(c => c.pass);
        console.log();
        if (allPassed) {
            console.log('🎉 所有測試通過！Filter 模式修復成功！');
        } else {
            console.log('❌ 部分測試失敗，需要進一步檢查');
        }

    } catch (error) {
        console.log('❌ 執行失敗（拋出錯誤）');
        console.log();
        console.log('🚫 錯誤訊息:');
        console.log(error.message.split('\n').map(l => '   ' + l).join('\n'));
        console.log();
        console.log('❌ 測試失敗：Filter 模式不應該拋出錯誤');
    }

    console.log();
    console.log('='.repeat(80));
}

testFilterMode().catch(err => {
    console.error('測試執行失敗:', err);
});
