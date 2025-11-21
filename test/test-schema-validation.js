const DataTransformer = require('../transformer');

async function test() {
    console.log('=== Testing DataTransformer with Schema Validation ===');

    const transformer = new DataTransformer();

    const rule = {
        source_format: 'json',
        target_format: 'json',
        validation_config: [
            {
                field: 'ID',
                // No type/pattern specified, relying on schemaUri
                schemaUri: 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/ID'
            },
            {
                field: 'Name',
                type: 'string', // Manual rule
                message: 'Name is required'
            }
        ],
        validation_on_fail: 'reject',
        sample_input: [
            { ID: 'A123456789', Name: 'Test User' }, // Valid
            { ID: '123', Name: 'Invalid User' }       // Invalid ID
        ]
    };

    try {
        console.log('Running transformation...');
        const result = await transformer.transform(rule.sample_input, rule);
        console.log('Transformation Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.log('Transformation Failed (Expected for invalid data):');
        console.log(err.message);
    }
}

test();
