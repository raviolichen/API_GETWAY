/**
 * 測試 onValidationFail 的三種模式
 * 1. reject - 拒絕並拋出錯誤
 * 2. filter - 過濾掉不合格的資料
 * 3. warn - 警告但繼續輸出（在資料中添加 _validationWarnings）
 */

const DataTransformer = require('../transformer');

// 測試數據：包含 2 筆正確和 2 筆錯誤的資料
const testData = [
    {
        id: 1,
        name: '張三',
        age: 25,
        email: 'zhang@example.com'
    },
    {
        id: 2,
        name: '李四',
        age: 30,
        email: 'li@example.com'
    },
    {
        id: 3,
        name: '',  // ❌ 錯誤：名字為空
        age: 'invalid',  // ❌ 錯誤：年齡不是數字
        email: 'invalid_email'  // ❌ 錯誤：Email 格式錯誤
    },
    {
        id: 4,
        name: '王五',
        age: -5,  // ❌ 錯誤：年齡為負數
        email: 'wang@example.com'
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
        field: 'email',
        type: 'email',
        message: 'Email 格式不正確'
    }
];

async function testMode(modeName, onValidationFail) {
    console.log('='.repeat(80));
    console.log(`🧪 測試模式: ${modeName.toUpperCase()}`);
    console.log('='.repeat(80));
    console.log();

    const transformer = new DataTransformer();

    try {
        const result = await transformer.transform(testData, {
            validation_config: JSON.stringify(validationRules),
            validation_on_fail: onValidationFail
        });

        console.log('✅ 執行成功（沒有拋出錯誤）');
        console.log();

        // 顯示驗證結果
        if (result.validation) {
            console.log('📊 驗證統計:');
            console.log(`   總筆數: ${result.validation.totalRecords}`);
            console.log(`   有效筆數: ${result.validation.validRecords}`);
            console.log(`   無效筆數: ${result.validation.invalidRecords}`);
            console.log(`   valid 標記: ${result.validation.valid}`);
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
        result.output.forEach((item, index) => {
            console.log(`\n   資料 ${index + 1}:`);
            console.log(`      id: ${item.id}`);
            console.log(`      name: ${item.name || '(空)'}`);
            console.log(`      age: ${item.age}`);
            console.log(`      email: ${item.email}`);

            // 檢查是否有 _validationWarnings
            if (item._validationWarnings) {
                console.log(`      ⚠️  _validationWarnings: ${item._validationWarnings.length} 個警告`);
                item._validationWarnings.forEach(warn => {
                    console.log(`         - ${warn.field}: ${warn.message}`);
                });
            }
        });

        console.log();
        console.log(`📋 輸出筆數: ${result.output.length}`);

    } catch (error) {
        console.log('❌ 執行失敗（拋出錯誤）');
        console.log();
        console.log('🚫 錯誤訊息:');
        console.log(error.message.split('\n').map(l => '   ' + l).join('\n'));
    }

    console.log();
}

async function runAllTests() {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('🧪 測試 onValidationFail 的三種模式');
    console.log('═'.repeat(80));
    console.log();

    console.log('📋 測試資料:');
    console.log('   - 資料 1 & 2: 完全正確 ✅');
    console.log('   - 資料 3: 3 個錯誤（name 為空、age 不是數字、email 格式錯誤）❌');
    console.log('   - 資料 4: 1 個錯誤（age 為負數）❌');
    console.log();

    // 測試 1: reject 模式
    await testMode('reject', 'reject');

    // 測試 2: filter 模式
    await testMode('filter', 'filter');

    // 測試 3: warn 模式
    await testMode('warn', 'warn');

    // 總結
    console.log('═'.repeat(80));
    console.log('📊 測試總結');
    console.log('═'.repeat(80));
    console.log(`
🎯 預期結果:

1. **REJECT 模式** (拒絕並拋出錯誤)
   ❌ 應該拋出錯誤，停止執行
   ❌ 不會有輸出資料
   ✅ 適用於：嚴格驗證，不允許任何錯誤

2. **FILTER 模式** (過濾不合格資料)
   ✅ 不會拋出錯誤
   ✅ 只輸出 2 筆正確的資料（資料 1 & 2）
   ✅ 過濾掉 2 筆錯誤的資料（資料 3 & 4）
   ✅ 適用於：自動清理資料，移除問題項目

3. **WARN 模式** (警告但繼續輸出)
   ✅ 不會拋出錯誤
   ✅ 輸出所有 4 筆資料
   ⚠️  錯誤的資料會包含 _validationWarnings 欄位
   ✅ 適用於：需要保留所有資料，但標記問題

🔍 WARN 模式的關鍵特徵:

- valid 標記會是 true（不會阻止輸出）
- errors 陣列會包含所有錯誤
- 每筆有錯誤的資料會添加 _validationWarnings 欄位
- _validationWarnings 是一個陣列，包含該筆資料的所有錯誤

📝 WARN 模式的使用建議:

1. **前端顯示**: 檢查資料中的 _validationWarnings，用黃色標記顯示
2. **日誌記錄**: 記錄 validation.errors 到日誌系統
3. **後續處理**: 允許用戶手動修正有警告的資料
4. **審核流程**: 將有警告的資料標記為需要人工審核

⚠️  可能的改進:

如果 WARN 模式沒有明確輸出警告訊息，建議：
1. 在 API 回應中添加 warnings 欄位
2. 在 UI 中顯示警告圖示
3. 在日誌中記錄警告
`);

    console.log('═'.repeat(80));
}

runAllTests().catch(err => {
    console.error('測試執行失敗:', err);
});
