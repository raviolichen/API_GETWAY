const DataTransformer = require('../transformer');

async function testXmlTransformation() {
    const transformer = new DataTransformer();

    console.log('=== 测试 1: JSON → XML ===');
    const jsonData = {
        data: [
            { name: '张三', age: 30, city: '台北' },
            { name: '李四', age: 25, city: '台中' }
        ]
    };

    try {
        const result1 = await transformer.transform(jsonData, {
            source_format: 'json',
            target_format: 'xml'
        });
        console.log('✓ JSON → XML 成功');
        console.log(result1.outputText);
    } catch (err) {
        console.error('✗ JSON → XML 失败:', err.message);
    }

    console.log('\n=== 测试 2: XML → JSON ===');
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <data>
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
    </data>
</root>`;

    try {
        const result2 = await transformer.transform(xmlData, {
            source_format: 'xml',
            target_format: 'json'
        });
        console.log('✓ XML → JSON 成功');
        console.log(result2.outputText);
    } catch (err) {
        console.error('✗ XML → JSON 失败:', err.message);
    }

    console.log('\n=== 测试 3: XML → JSON 带字段映射 ===');
    const xmlData2 = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <person>
        <firstName>王</firstName>
        <lastName>小明</lastName>
        <birthYear>1990</birthYear>
    </person>
</root>`;

    try {
        const result3 = await transformer.transform(xmlData2, {
            source_format: 'xml',
            target_format: 'json',
            mapping_config: {
                'fullName': '{{person.lastName}}{{person.firstName}}',
                'age': '{{subtract 2024 person.birthYear}}'
            }
        });
        console.log('✓ XML → JSON 带映射成功');
        console.log(result3.outputText);
    } catch (err) {
        console.error('✗ XML → JSON 带映射失败:', err.message);
    }
}

testXmlTransformation().catch(console.error);
