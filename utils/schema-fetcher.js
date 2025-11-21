const axios = require('axios');

// Simple in-memory cache: URI -> Promise<Schema>
const schemaCache = new Map();

/**
 * Fetches the schema definition from the given URI.
 * @param {string} uri - The Schema URI (e.g., https://schema.gov.tw/api/...)
 * @returns {Promise<Object>} - The schema JSON object.
 */
async function fetchSchema(uri) {
    if (!uri) {
        throw new Error('Schema URI is required');
    }

    // Check cache first
    if (schemaCache.has(uri)) {
        return schemaCache.get(uri);
    }

    // Create a promise for the fetch operation
    const fetchPromise = axios.get(uri)
        .then(response => {
            if (response.status !== 200) {
                throw new Error(`Failed to fetch schema from ${uri}: Status ${response.status}`);
            }
            return response.data;
        })
        .catch(error => {
            // Remove from cache on error so we can retry later
            schemaCache.delete(uri);
            throw new Error(`Error fetching schema from ${uri}: ${error.message}`);
        });

    // Store the promise in cache
    schemaCache.set(uri, fetchPromise);

    return fetchPromise;
}

module.exports = {
    fetchSchema
};
