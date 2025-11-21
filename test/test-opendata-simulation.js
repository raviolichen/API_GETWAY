const DataTransformer = require('../transformer');
const axios = require('axios');

async function test() {
    console.log('=== Opendata Transformation Simulation ===');

    const transformer = new DataTransformer();

    // 1. Define the validation rule using a real schema from schema.gov.tw
    // URI found in codebase: https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/ID
    const schemaUri = 'https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/ID';

    console.log(`Using Schema URI: ${schemaUri}`);

    const rule = {
        source_format: 'json',
        target_format: 'json',
        validation_config: [
            {
                field: 'PersonID', // Mapping the schema to our field 'PersonID'
                schemaUri: schemaUri
            },
            {
                field: 'Age',
                type: 'number',
                min: 18,
                max: 65,
                message: 'Age must be between 18 and 65'
            }
        ],
        validation_on_fail: 'warn', // Use 'warn' to see all errors in output
        validation_strict_mode: false
    };

    // 2. Simulate Opendata JSON input
    // Generating some random-like data
    const sourceData = [
        { PersonID: 'A123456789', Age: 30, Name: 'Valid User' },      // Valid ID (format-wise, checksum might be ignored by simple regex)
        { PersonID: 'B123456789', Age: 25, Name: 'Valid User 2' },    // Valid ID
        { PersonID: '12345', Age: 40, Name: 'Invalid ID Format' },    // Invalid ID (too short)
        { PersonID: 'Z123456789', Age: 10, Name: 'Invalid Age' },     // Valid ID, Invalid Age
        { PersonID: 'INVALID', Age: 70, Name: 'Both Invalid' }        // Both Invalid
    ];

    console.log('Simulated Input Data:', JSON.stringify(sourceData, null, 2));

    try {
        console.log('\n--- Executing Transformation ---');
        const result = await transformer.transform(sourceData, rule);

        console.log('\n--- Transformation Result ---');
        console.log(`Valid: ${result.validation.valid}`);
        console.log(`Total Records: ${result.validation.totalRecords}`);
        console.log(`Valid Records: ${result.validation.validRecords}`);
        console.log(`Invalid Records: ${result.validation.invalidRecords}`);

        if (result.validation.errors.length > 0) {
            console.log('\nValidation Errors:');
            result.validation.errors.forEach(err => {
                console.log(`- Record ${err.index + 1} [${err.field}]: ${err.message}`);
            });
        }

        console.log('\nOutput Data (with warnings):');
        console.log(JSON.stringify(result.output, null, 2));

    } catch (err) {
        console.error('Transformation Error:', err);
    }
}

test();
