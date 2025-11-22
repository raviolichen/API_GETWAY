const DataTransformer = require('../transformer');

async function testXmlToCsvMapping() {
    const transformer = new DataTransformer();

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

    console.log('=== 测试 XML → CSV 字段映射 ===\n');

    // 先看看 XML 解析后的结构
    console.log('步骤 1: 解析 XML 查看数据结构');
    const parsed = await transformer.transform(xmlData, {
        source_format: 'xml',
        target_format: 'json'
    });
    console.log('解析后的 JSON 结构:');
    console.log(parsed.outputText);
    console.log('\n实际数据对象:');
    console.log(JSON.stringify(parsed.output, null, 2));

    // 根据实际结构进行映射
    console.log('\n步骤 2: 使用正确的路径进行 XML → CSV 转换');
    const result = await transformer.transform(xmlData, {
        source_format: 'xml',
        target_format: 'csv',
        mapping_config: {
            '姓名': '{{root.items.item.[0].name}}',  // 使用实际的数据路径
            '年龄': '{{root.items.item.[0].age}}',
            '城市': '{{root.items.item.[0].city}}'
        }
    });

    console.log('✓ 转换成功');
    console.log('输出:\n', result.outputText);
}

testXmlToCsvMapping().catch(console.error);
