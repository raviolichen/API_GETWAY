const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function createTransformationTable() {
    db.run(`CREATE TABLE IF NOT EXISTS transformation_rules (
        rule_id TEXT PRIMARY KEY,
        endpoint_id TEXT,
        rule_name TEXT NOT NULL,
        description TEXT,
        source_format TEXT CHECK(source_format IN ('json', 'csv', 'xml')) NOT NULL,
        target_format TEXT CHECK(target_format IN ('json', 'csv', 'xml')) NOT NULL,
        transformation_type TEXT CHECK(transformation_type IN ('template', 'mapping', 'hybrid')) NOT NULL,
        template_config TEXT,
        mapping_config TEXT,
        filter_config TEXT,
        pipeline_config TEXT,
        validation_config TEXT,
        validation_field_mappings TEXT,
        validation_schema_uri TEXT,
        validation_on_fail TEXT CHECK(validation_on_fail IN ('reject', 'filter', 'warn')) DEFAULT 'reject',
        validation_strict_mode INTEGER DEFAULT 1,
        test_source_url TEXT,
        sample_input TEXT,
        expected_output TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(endpoint_id) REFERENCES api_endpoints(endpoint_id)
    )`);
}

function ensureTransformationTable() {
    db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='transformation_rules'`, (err, row) => {
        if (err) {
            console.error('Failed to inspect transformation_rules table:', err);
            createTransformationTable();
            return;
        }

        const needsMigration = !row || !row.sql.includes('rule_name');
        if (needsMigration) {
            db.run(`DROP TABLE IF EXISTS transformation_rules`, dropErr => {
                if (dropErr) {
                    console.error('Failed to drop legacy transformation_rules table:', dropErr);
                }
                createTransformationTable();
            });
        } else {
            createTransformationTable();
        }
    });
}

// Helper function to hash API keys
function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

db.serialize(() => {
    // 1. API Endpoints Table
    db.run(`CREATE TABLE IF NOT EXISTS api_endpoints (
        endpoint_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gateway_path TEXT NOT NULL,
        target_url TEXT NOT NULL,
        api_type TEXT CHECK(api_type IN ('data', 'ai_passthrough')) NOT NULL,
        timeout INTEGER DEFAULT 30,
        is_active INTEGER DEFAULT 1
    )`);

    // 2. Systems Table - Updated to use api_key_hash
    db.run(`CREATE TABLE IF NOT EXISTS systems (
        system_id TEXT PRIMARY KEY,
        system_name TEXT NOT NULL,
        api_key_hash TEXT NOT NULL,
        rate_limit INTEGER DEFAULT 1000,
        ip_whitelist TEXT
    )`);

    // 3. Transformation Rules Table (with migration support)
    ensureTransformationTable();

    // 4. Request Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS request_logs (
        log_id TEXT PRIMARY KEY,
        request_id TEXT,
        system_id TEXT,
        endpoint_id TEXT,
        http_status INTEGER,
        response_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. OpenData Schemas Table
    db.run(`CREATE TABLE IF NOT EXISTS opendata_schemas (
        schema_id TEXT PRIMARY KEY,
        schema_name TEXT NOT NULL,
        schema_node_id TEXT,
        schema_url TEXT,
        schema_version TEXT,
        field_mappings TEXT,
        validation_rules TEXT,
        metadata TEXT,
        endpoint_path TEXT
    )`);

    // 6. Rate Limit Tracking Table (for in-memory rate limiting)
    db.run(`CREATE TABLE IF NOT EXISTS rate_limit_tracking (
        system_id TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        request_count INTEGER DEFAULT 0,
        PRIMARY KEY (system_id, window_start)
    )`);

    // 7. System Permissions Table (授权表)
    db.run(`CREATE TABLE IF NOT EXISTS system_permissions (
        permission_id TEXT PRIMARY KEY,
        system_id TEXT NOT NULL,
        endpoint_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(system_id) REFERENCES systems(system_id) ON DELETE CASCADE,
        FOREIGN KEY(endpoint_id) REFERENCES api_endpoints(endpoint_id) ON DELETE CASCADE,
        UNIQUE(system_id, endpoint_id)
    )`);

    // Seed Data
    // Admin System - Hash the admin key
    const adminKey = 'admin-key-12345';
    const adminKeyHash = hashApiKey(adminKey);

    db.run(`INSERT OR REPLACE INTO systems (system_id, system_name, api_key_hash, rate_limit) VALUES
        ('sys_admin', 'Admin System', ?, 99999)`, [adminKeyHash], function(err) {
        if (err) {
            console.error('Error inserting admin system:', err);
        } else {
            console.log('Admin system created with key: admin-key-12345 (for testing)');
        }
    });

    // Sample OpenData Endpoint
    db.run(`INSERT OR IGNORE INTO api_endpoints (endpoint_id, name, gateway_path, target_url, api_type) VALUES
        ('ep_health', 'Health Centers', '/opendata/health-centers', 'mock_data', 'data')`);

    // Sample AI Endpoint
    db.run(`INSERT OR IGNORE INTO api_endpoints (endpoint_id, name, gateway_path, target_url, api_type, timeout) VALUES
        ('ep_openai', 'OpenAI Chat', '/external/openai/chat', 'https://api.openai.com/v1/chat/completions', 'ai_passthrough', 60)`);

    console.log("Database initialized successfully.");
});

module.exports = db;
