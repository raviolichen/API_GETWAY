/**
 * Parses a schema.gov.tw JSON response into a validation rule object.
 * @param {string} fieldName - The name of the field in the data (e.g., "ID").
 * @param {Object} schema - The JSON object returned from schema.gov.tw.
 * @param {string} uri - The source URI of the schema.
 * @returns {Object} - A validation rule object compatible with DataTransformer.
 */
function parseSchemaToRule(fieldName, schema, uri) {
    const rule = {
        field: fieldName,
        schemaUri: uri,
        message: `Field ${fieldName} validation failed` // Default message
    };

    // 1. Map 'code' to 'type'
    // Common values: "字串", "數字", "日期", "浮點數"
    const code = (schema.code || '').trim();
    if (code === '字串') {
        rule.type = 'string';
    } else if (code === '數字') {
        rule.type = 'number';
    } else if (code === '浮點數') {
        rule.type = 'number'; // Treat float as number
    } else if (code === '日期') {
        rule.type = 'date';
    } else {
        // Default to string if unknown, or maybe 'custom' if we have regex
        rule.type = 'string';
    }

    // 2. Parse 'property' for constraints (Regex, Range)
    // Example: "[A-Z][1-2][00000000-99999999]"
    const property = (schema.property || '').trim();

    if (property) {
        // Check for regex-like patterns
        // If it looks like a regex (contains brackets, ranges), use regex type
        // Note: schema.gov.tw regex syntax might need adjustment for JS

        // Heuristic: if it contains '[' and ']', treat as regex pattern
        if (property.includes('[') && property.includes(']')) {
            rule.type = 'regex';

            let pattern = property;

            // Replace [00000000-99999999] with \d{8}
            // Only if length > 1 to avoid replacing [1-2] with \d{1}
            pattern = pattern.replace(/\[(\d+)-(\d+)\]/g, (match, start, end) => {
                if (start.length === end.length && start.length > 1) {
                    return `\\d{${start.length}}`;
                }
                return match;
            });

            // Ensure start/end anchors
            if (!pattern.startsWith('^')) pattern = '^' + pattern;
            if (!pattern.endsWith('$')) pattern = pattern + '$';

            rule.pattern = pattern;
            rule.message = `Field ${fieldName} format must match ${property}`;
        }
    }

    return rule;
}

module.exports = {
    parseSchemaToRule
};
