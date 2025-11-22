const DataTransformer = require('../transformer');

async function testXmlStructure() {
    const transformer = new DataTransformer();

    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <person>
        <firstName>王</firstName>
        <lastName>小明</lastName>
        <birthYear>1990</birthYear>
    </person>
</root>`;

    console.log('原始 XML:');
    console.log(xmlData);

    const result = await transformer.transform(xmlData, {
        source_format: 'xml',
        target_format: 'json'
    });

    console.log('\n解析后的 JSON 结构:');
    console.log(result.outputText);

    console.log('\n实际的 output 对象:');
    console.log(JSON.stringify(result.output, null, 2));
}

testXmlStructure().catch(console.error);
