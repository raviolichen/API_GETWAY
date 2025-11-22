const DataTransformer = require('../transformer');

async function testAllFormatConversions() {
    const transformer = new DataTransformer();

    console.log('=== 测试所有格式转换组合 ===\n');

    // 准备测试数据
    const testData = [
        { name: '张三', age: 30, city: '台北' },
        { name: '李四', age: 25, city: '台中' }
    ];

    const jsonData = JSON.stringify(testData);

    const csvData = `name,age,city
张三,30,台北
李四,25,台中`;

    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <items>
        <item>
            <name>张三</name>
            <age>30</age>
            <city>台北</city>
        </item>
        <item>
            <name>李四</name>
            <age>25</age>
            <city>台中</city>
        </item>
    </items>
</root>`;

    const formats = ['json', 'csv', 'xml'];
    const testCases = [];

    // 生成所有可能的转换组合
    for (const source of formats) {
        for (const target of formats) {
            testCases.push({ source, target });
        }
    }

    let passedTests = 0;
    let failedTests = 0;

    // 执行所有测试
    for (const testCase of testCases) {
        const { source, target } = testCase;
        const testName = `${source.toUpperCase()} → ${target.toUpperCase()}`;

        try {
            let sourceData;
            switch (source) {
                case 'json':
                    sourceData = jsonData;
                    break;
                case 'csv':
                    sourceData = csvData;
                    break;
                case 'xml':
                    sourceData = xmlData;
                    break;
            }

            const result = await transformer.transform(sourceData, {
                source_format: source,
                target_format: target
            });

            console.log(`✓ ${testName} 成功`);
            if (process.env.VERBOSE) {
                console.log('  输出预览:', result.outputText.substring(0, 100) + '...\n');
            }
            passedTests++;
        } catch (err) {
            console.error(`✗ ${testName} 失败:`, err.message);
            failedTests++;
        }
    }

    console.log(`\n=== 测试结果汇总 ===`);
    console.log(`总计: ${testCases.length} 个测试`);
    console.log(`通过: ${passedTests} ✓`);
    console.log(`失败: ${failedTests} ✗`);

    if (failedTests === 0) {
        console.log('\n🎉 所有格式转换测试通过！');
    } else {
        console.log('\n⚠️  部分测试失败，需要修复');
    }

    // 详细测试：CSV → XML 带字段映射
    console.log('\n=== 进阶测试：CSV → XML 带字段映射 ===');
    try {
        const result = await transformer.transform(csvData, {
            source_format: 'csv',
            target_format: 'xml',
            mapping_config: {
                'person.fullName': '{{name}}',
                'person.yearsOld': '{{age}}',
                'person.location': '{{city}}'
            }
        });

        console.log('✓ CSV → XML 带映射成功');
        console.log('输出:\n', result.outputText);
    } catch (err) {
        console.error('✗ CSV → XML 带映射失败:', err.message);
    }

    // 详细测试：XML → CSV 带字段提取
    console.log('\n=== 进阶测试：XML → CSV 带字段映射 ===');
    try {
        const result = await transformer.transform(xmlData, {
            source_format: 'xml',
            target_format: 'csv',
            mapping_config: {
                'fullName': '{{name}}',
                'age': '{{age}}',
                'location': '{{city}}'
            }
        });

        console.log('✓ XML → CSV 带映射成功');
        console.log('输出:\n', result.outputText);
    } catch (err) {
        console.error('✗ XML → CSV 带映射失败:', err.message);
    }

    // 详细测试：CSV → CSV 带转换
    console.log('\n=== 进阶测试：CSV → CSV 带数据转换 ===');
    try {
        const result = await transformer.transform(csvData, {
            source_format: 'csv',
            target_format: 'csv',
            mapping_config: {
                '姓名': '{{name}}',
                '年龄段': '{{#if (gt age 28)}}30+{{else}}20+{{/if}}',
                '城市': '{{city}}'
            }
        });

        console.log('✓ CSV → CSV 带转换成功');
        console.log('输出:\n', result.outputText);
    } catch (err) {
        console.error('✗ CSV → CSV 带转换失败:', err.message);
    }
}

testAllFormatConversions().catch(console.error);
