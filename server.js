const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const crypto = require('crypto');
const DataTransformer = require('./transformer');
const AlertMonitor = require('./alert-monitor');

const app = express();
const PORT = 3000;
const transformer = new DataTransformer();
const alertMonitor = new AlertMonitor();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// --- Cache Storage ---
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// --- Middleware ---

// 1. Authentication & Rate Limiting Middleware
const authenticateAndRateLimit = (req, res, next) => {
    const apiKey = req.headers['x-gateway-api-key'];

    // Skip auth for OpenData (public)
    if (req.path.startsWith('/opendata/')) {
        return next();
    }

    // Skip auth for Admin (simplified for prototype, usually needs login)
    // For this prototype, we'll check a hardcoded admin key or just allow local access if needed.
    // Let's enforce key for simplicity based on requirements.

    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    }

    const apiKeyHash = hashApiKey(apiKey);

    db.get("SELECT * FROM systems WHERE api_key_hash = ?", [apiKeyHash], (err, system) => {
        if (err) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        if (!system) {
            return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
        }

        // Check IP whitelist if configured
        if (system.ip_whitelist) {
            const clientIp = req.ip || req.connection.remoteAddress;
            if (!checkIpWhitelist(clientIp, system.ip_whitelist)) {
                return res.status(403).json({ error: 'Forbidden: IP not in whitelist' });
            }
        }

        // Skip rate limiting for admin endpoints
        if (req.path.startsWith('/api/admin/')) {
            req.system = system;
            return next();
        }

        // Rate Limiting Check (for non-admin endpoints)
        checkRateLimit(system, (rateLimitErr, allowed, remaining) => {
            if (rateLimitErr) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (!allowed) {
                res.set('X-RateLimit-Limit', system.rate_limit);
                res.set('X-RateLimit-Remaining', 0);
                res.set('Retry-After', 3600); // 1 hour in seconds
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Limit: ${system.rate_limit} requests per hour.`
                });
            }

            // Add rate limit headers
            res.set('X-RateLimit-Limit', system.rate_limit);
            res.set('X-RateLimit-Remaining', remaining);

            // Permission Check (only for non-admin endpoints)
            if (!req.path.startsWith('/api/admin/')) {
                checkPermission(system.system_id, req.path, (permErr, hasPermission) => {
                    if (permErr) {
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    if (!hasPermission) {
                        return res.status(403).json({
                            error: 'Forbidden',
                            message: `System '${system.system_name}' does not have permission to access this endpoint.`
                        });
                    }

                    req.system = system;
                    next();
                });
            } else {
                req.system = system;
                next();
            }
        });
    });
};

// 2. Logging Middleware
app.use((req, res, next) => {
    // Skip logging for:
    // - Admin endpoints
    // - Static files (HTML, CSS, JS, images, etc.)
    // - Root path
    if (
        req.path.startsWith('/api/admin/') ||
        req.path === '/' ||
        req.path.endsWith('.html') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js') ||
        req.path.endsWith('.png') ||
        req.path.endsWith('.jpg') ||
        req.path.endsWith('.ico')
    ) {
        return next();
    }

    const start = Date.now();
    const originalSend = res.send;

    res.send = function (body) {
        const duration = Date.now() - start;
        const logId = crypto.randomUUID();

        const systemId = req.system ? req.system.system_id : null;

        // Resolve endpoint_id based on path
        db.get("SELECT endpoint_id FROM api_endpoints WHERE gateway_path = ?", [req.path], (err, endpoint) => {
            const endpointId = endpoint ? endpoint.endpoint_id : null;

            // Only log if we found a matching endpoint (real business API request)
            if (endpointId) {
                db.run(`INSERT INTO request_logs (log_id, request_id, system_id, endpoint_id, http_status, response_time_ms)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                    [logId, crypto.randomUUID(), systemId, endpointId, res.statusCode, duration],
                    (err) => {
                        if (err) console.error("Logging error:", err);
                    });
            }
        });

        originalSend.call(this, body);
    };
    next();
});

// 3. Cache Middleware
const cacheMiddleware = (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    // Skip cache for admin endpoints
    if (req.path.startsWith('/api/admin/')) {
        return next();
    }

    const cacheKey = req.path + JSON.stringify(req.query);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.set('X-Cache-Status', 'HIT');
        res.set('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000) + 's');
        return res.send(cached.data);
    }

    // Store original send function
    const originalSend = res.send;

    // Override send to cache the response
    res.send = function (body) {
        cache.set(cacheKey, {
            data: body,
            timestamp: Date.now()
        });
        res.set('X-Cache-Status', 'MISS');
        originalSend.call(this, body);
    };

    next();
};

app.use(cacheMiddleware);
app.use(authenticateAndRateLimit);

// --- Routes ---

// 1. OpenData Endpoint
app.get('/opendata/health-centers', async (req, res) => {
    // Mock Data as per requirements
    const data = [
        {
            "Name": "斗六市衛生所",
            "Code": "YL001",
            "Telephone": "05-5322154",
            "Address": "雲林縣斗六市府前街23號",
            "City": "雲林縣",
            "District": "斗六市",
            "Latitude": 23.7117,
            "Longitude": 120.5437
        },
        {
            "Name": "斗南鎮衛生所",
            "Code": "YL002",
            "Telephone": "05-5962004",
            "Address": "雲林縣斗南鎮中山路180號",
            "City": "雲林縣",
            "District": "斗南鎮",
            "Latitude": 23.6797,
            "Longitude": 120.4783
        }
    ];

    const format = req.query.format || 'json';

    const sourcePayload = {
        metadata: {
            datasetIdentifier: "yunlin-health-centers",
            title: "雲林縣衛生所資訊",
            organization: "雲林縣衛生局",
            lastModified: "2024-11-20",
            schema: "https://schema.gov.tw/Details?nodeId=25507",
            totalRecords: data.length
        },
        data: data
    };

    // Apply transformation rule if configured for this endpoint
    const transformed = await maybeTransformResponse(req.path, sourcePayload, 'json');
    if (transformed) {
        res.header('Content-Type', transformed.contentType);
        return res.send(transformed.body);
    }

    if (format === 'csv') {
        let csv = 'Name,Code,Telephone,Address,City,District,Latitude,Longitude\n';
        data.forEach(row => {
            csv += `${row.Name},${row.Code},${row.Telephone},${row.Address},${row.City},${row.District},${row.Latitude},${row.Longitude}\n`;
        });
        res.header('Content-Type', 'text/csv');
        return res.send(csv);
    }

    res.json(sourcePayload);
});

// 2. AI Passthrough Endpoint - OpenAI
app.post('/external/openai/chat', async (req, res) => {
    const targetKey = req.headers['x-target-api-key'];

    if (!targetKey) {
        return res.status(400).json({ error: 'Missing X-Target-API-Key' });
    }

    // Mock response for testing
    if (targetKey === 'mock-openai-key') {
        return res.json({
            id: "chatcmpl-mock",
            object: "chat.completion",
            created: Date.now(),
            model: req.body.model || "gpt-4o-mini",
            choices: [{
                index: 0,
                message: {
                    role: "assistant",
                    content: "This is a mocked response from the API Gateway."
                },
                finish_reason: "stop"
            }]
        });
    }

    // Forwarding to real OpenAI
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${targetKey}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Bad Gateway: Failed to connect to OpenAI' });
    }
});

// 2b. AI Passthrough Endpoint - xAI (Grok)
app.post('/external/xai/chat', async (req, res) => {
    const targetKey = req.headers['x-target-api-key'];

    if (!targetKey) {
        return res.status(400).json({ error: 'Missing X-Target-API-Key' });
    }

    // Forwarding to xAI (Grok)
    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${targetKey}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(502).json({ error: 'Bad Gateway: Failed to connect to xAI' });
    }
});

// 3. Admin API Endpoints
app.get('/api/admin/stats', (req, res) => {
    const period = req.query.period || 'today';

    // Configure time filter and grouping based on period
    let timeFilter, groupBy, timeLabel, dataPoints;

    switch (period) {
        case 'week':
            timeFilter = "datetime('now', '-7 days')";
            groupBy = "strftime('%Y-%m-%d', created_at)";
            timeLabel = 'date';
            dataPoints = 7;
            break;
        case 'month':
            timeFilter = "datetime('now', '-30 days')";
            groupBy = "strftime('%Y-%m-%d', created_at)";
            timeLabel = 'date';
            dataPoints = 30;
            break;
        case 'today':
        default:
            timeFilter = "datetime('now', '-24 hours')";
            groupBy = "strftime('%H', created_at)";
            timeLabel = 'hour';
            dataPoints = 24;
            break;
    }

    // Return stats including traffic data for chart
    db.get("SELECT COUNT(*) as count FROM request_logs", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get("SELECT COUNT(*) as count FROM api_endpoints WHERE is_active = 1", (err, epRow) => {
            if (err) return res.status(500).json({ error: err.message });
            db.get("SELECT COUNT(*) as count FROM systems", (err, sysRow) => {
                if (err) return res.status(500).json({ error: err.message });

                // Get traffic data based on period
                const trafficQuery = `
                    SELECT
                        ${groupBy} as time_unit,
                        COUNT(*) as count
                    FROM request_logs
                    WHERE created_at >= ${timeFilter}
                    GROUP BY time_unit
                    ORDER BY time_unit
                `;

                db.all(trafficQuery, (err, trafficData) => {
                    if (err) {
                        // If error, return basic stats without traffic data
                        return res.json({
                            total_requests: row.count,
                            active_endpoints: epRow.count,
                            systems_connected: sysRow.count,
                            traffic_data: [],
                            api_usage: []
                        });
                    }

                    // Process traffic data based on period
                    let processedTraffic = [];
                    const now = new Date();

                    if (period === 'today') {
                        // Fill in missing hours with zero counts
                        const hourlyMap = {};
                        trafficData.forEach(item => {
                            hourlyMap[parseInt(item.time_unit)] = item.count;
                        });

                        // Generate last 24 hours of data
                        for (let i = 23; i >= 0; i--) {
                            const targetHour = (now.getHours() - i + 24) % 24;
                            processedTraffic.push({
                                label: `${String(targetHour).padStart(2, '0')}:00`,
                                count: hourlyMap[targetHour] || 0
                            });
                        }
                    } else {
                        // For week/month, fill in missing dates
                        const dateMap = {};
                        trafficData.forEach(item => {
                            dateMap[item.time_unit] = item.count;
                        });

                        const daysBack = period === 'week' ? 7 : 30;
                        for (let i = daysBack - 1; i >= 0; i--) {
                            const targetDate = new Date(now);
                            targetDate.setDate(targetDate.getDate() - i);
                            const dateStr = targetDate.toISOString().split('T')[0];

                            processedTraffic.push({
                                label: dateStr,
                                count: dateMap[dateStr] || 0
                            });
                        }
                    }

                    // Get API endpoint usage statistics
                    const apiUsageQuery = `
                        SELECT
                            e.name,
                            e.api_type,
                            COUNT(*) as count
                        FROM request_logs rl
                        INNER JOIN api_endpoints e ON rl.endpoint_id = e.endpoint_id
                        WHERE rl.created_at >= ${timeFilter}
                            AND rl.endpoint_id IS NOT NULL
                        GROUP BY e.endpoint_id, e.name, e.api_type
                        ORDER BY count DESC
                        LIMIT 10
                    `;

                    db.all(apiUsageQuery, (err, apiUsageData) => {
                        if (err) {
                            // If error getting API usage, return without it
                            return res.json({
                                total_requests: row.count,
                                active_endpoints: epRow.count,
                                systems_connected: sysRow.count,
                                traffic_data: processedTraffic,
                                api_usage: [],
                                period: period
                            });
                        }

                        res.json({
                            total_requests: row.count,
                            active_endpoints: epRow.count,
                            systems_connected: sysRow.count,
                            traffic_data: processedTraffic,
                            api_usage: apiUsageData || [],
                            period: period
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/admin/logs', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get total count
    db.get("SELECT COUNT(*) as total FROM request_logs", (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow.total;
        const totalPages = Math.ceil(total / limit);

        const query = `
            SELECT
                rl.log_id,
                rl.request_id,
                rl.http_status,
                rl.response_time_ms,
                rl.created_at,
                s.system_name,
                e.name as endpoint_name,
                e.gateway_path
            FROM request_logs rl
            LEFT JOIN systems s ON rl.system_id = s.system_id
            LEFT JOIN api_endpoints e ON rl.endpoint_id = e.endpoint_id
            ORDER BY rl.created_at DESC
            LIMIT ? OFFSET ?
        `;

        db.all(query, [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                data: rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        });
    });
});

// Get all endpoints
app.get('/api/admin/endpoints', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    db.get("SELECT COUNT(*) as total FROM api_endpoints", (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow.total;
        const totalPages = Math.ceil(total / limit);

        db.all("SELECT * FROM api_endpoints LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                data: rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        });
    });
});

// Create endpoint
app.post('/api/admin/endpoints', (req, res) => {
    const { name, gateway_path, target_url, api_type, timeout } = req.body;
    const endpoint_id = crypto.randomUUID();

    db.run(`INSERT INTO api_endpoints (endpoint_id, name, gateway_path, target_url, api_type, timeout) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [endpoint_id, name, gateway_path, target_url, api_type, timeout || 30],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: endpoint_id, message: "Endpoint created" });
        });
});

// Update endpoint
app.put('/api/admin/endpoints/:id', (req, res) => {
    const { name, gateway_path, target_url, api_type, timeout, is_active } = req.body;
    const { id } = req.params;

    db.run(`UPDATE api_endpoints SET name = ?, gateway_path = ?, target_url = ?, api_type = ?, timeout = ?, is_active = ?
            WHERE endpoint_id = ?`,
        [name, gateway_path, target_url, api_type, timeout, is_active, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Endpoint updated" });
        });
});

// Delete endpoint
app.delete('/api/admin/endpoints/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM api_endpoints WHERE endpoint_id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Endpoint deleted" });
    });
});

// 4. System Management API Endpoints

// Get all systems
app.get('/api/admin/systems', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    db.get("SELECT COUNT(*) as total FROM systems", (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow.total;
        const totalPages = Math.ceil(total / limit);

        db.all("SELECT * FROM systems LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            // Mask API keys for security - but we can't show the original key anymore
            const maskedRows = rows.map(row => ({
                ...row,
                api_key_display: '(已加密存儲)',
                api_key_hash: undefined // Don't expose hash
            }));
            res.json({
                data: maskedRows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        });
    });
});

// Create system
app.post('/api/admin/systems', (req, res) => {
    const { system_name, rate_limit, ip_whitelist } = req.body;
    const system_id = crypto.randomUUID();
    const api_key = generateApiKey();
    const api_key_hash = hashApiKey(api_key);

    db.run(`INSERT INTO systems (system_id, system_name, api_key_hash, rate_limit, ip_whitelist)
            VALUES (?, ?, ?, ?, ?)`,
        [system_id, system_name, api_key_hash, rate_limit || 1000, ip_whitelist || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                id: system_id,
                api_key: api_key, // Return plain key only once
                message: "System created"
            });
        });
});

// Update system
app.put('/api/admin/systems/:id', (req, res) => {
    const { system_name, rate_limit, ip_whitelist } = req.body;
    const { id } = req.params;

    db.run(`UPDATE systems SET system_name = ?, rate_limit = ?, ip_whitelist = ?
            WHERE system_id = ?`,
        [system_name, rate_limit, ip_whitelist, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "System updated" });
        });
});

// Delete system
app.delete('/api/admin/systems/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM systems WHERE system_id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "System deleted" });
    });
});

// Reset API Key
app.post('/api/admin/systems/:id/reset-key', (req, res) => {
    const { id } = req.params;
    const new_api_key = generateApiKey();
    const new_api_key_hash = hashApiKey(new_api_key);

    db.run("UPDATE systems SET api_key_hash = ? WHERE system_id = ?", [new_api_key_hash, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ api_key: new_api_key, message: "API Key reset successfully" });
    });
});

// 5. Permission Management Endpoints

// Get permissions for a system
app.get('/api/admin/systems/:id/permissions', (req, res) => {
    const { id } = req.params;

    db.all(`
        SELECT p.permission_id, p.system_id, p.endpoint_id, p.created_at,
               e.name as endpoint_name, e.gateway_path, e.api_type
        FROM system_permissions p
        JOIN api_endpoints e ON p.endpoint_id = e.endpoint_id
        WHERE p.system_id = ?
    `, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all permissions (for overview)
app.get('/api/admin/permissions', (req, res) => {
    db.all(`
        SELECT p.permission_id, p.system_id, p.endpoint_id, p.created_at,
               s.system_name, e.name as endpoint_name, e.gateway_path
        FROM system_permissions p
        JOIN systems s ON p.system_id = s.system_id
        JOIN api_endpoints e ON p.endpoint_id = e.endpoint_id
        ORDER BY s.system_name, e.name
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Grant permission to a system
app.post('/api/admin/permissions', (req, res) => {
    const { system_id, endpoint_id } = req.body;

    if (!system_id || !endpoint_id) {
        return res.status(400).json({ error: 'system_id and endpoint_id are required' });
    }

    const permission_id = crypto.randomUUID();

    db.run(`
        INSERT INTO system_permissions (permission_id, system_id, endpoint_id)
        VALUES (?, ?, ?)
    `, [permission_id, system_id, endpoint_id], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Permission already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: permission_id,
            message: "Permission granted successfully"
        });
    });
});

// Revoke permission from a system
app.delete('/api/admin/permissions/:id', (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM system_permissions WHERE permission_id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Permission not found' });
        }
        res.json({ message: "Permission revoked successfully" });
    });
});

// Batch grant permissions to a system
app.post('/api/admin/systems/:id/permissions/batch', (req, res) => {
    const { id } = req.params;
    const { endpoint_ids } = req.body;

    if (!Array.isArray(endpoint_ids)) {
        return res.status(400).json({ error: 'endpoint_ids must be an array' });
    }

    // First, delete all existing permissions for this system
    db.run("DELETE FROM system_permissions WHERE system_id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Then insert new permissions
        if (endpoint_ids.length === 0) {
            return res.json({ message: "All permissions revoked", granted: 0 });
        }

        const stmt = db.prepare(`
            INSERT INTO system_permissions (permission_id, system_id, endpoint_id)
            VALUES (?, ?, ?)
        `);

        let completed = 0;
        let errors = [];

        endpoint_ids.forEach(endpoint_id => {
            const permission_id = crypto.randomUUID();
            stmt.run([permission_id, id, endpoint_id], (err) => {
                if (err) errors.push(err.message);
                completed++;

                if (completed === endpoint_ids.length) {
                    stmt.finalize();
                    if (errors.length > 0) {
                        return res.status(500).json({
                            message: "Some permissions failed to grant",
                            errors: errors,
                            granted: endpoint_ids.length - errors.length
                        });
                    }
                    res.json({
                        message: "Permissions updated successfully",
                        granted: endpoint_ids.length
                    });
                }
            });
        });
    });
});

// 6. Transformation Rules Management
app.get('/api/admin/transformations', (req, res) => {
    db.all(`SELECT * FROM transformation_rules ORDER BY updated_at DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(hydrateRuleRow));
    });
});

app.post('/api/admin/transformations', (req, res) => {
    const payload = normalizeRulePayload(req.body);
    if (!payload.rule_name) {
        return res.status(400).json({ error: 'rule_name is required' });
    }

    const ruleId = crypto.randomUUID();
    const params = [
        ruleId,
        payload.endpoint_id || null,
        payload.rule_name,
        payload.description || null,
        payload.source_format,
        payload.target_format,
        payload.transformation_type,
        payload.template_config || null,
        payload.mapping_config || null,
        payload.filter_config || '[]',
        payload.pipeline_config || '[]',
        payload.validation_config || null,
        payload.validation_field_mappings || null,
        payload.validation_schema_uri || null,
        payload.validation_on_fail || 'reject',
        payload.validation_strict_mode !== false ? 1 : 0,
        payload.test_source_url || null,
        payload.sample_input || null,
        payload.expected_output || null,
        payload.is_active ? 1 : 0
    ];

    db.run(`
        INSERT INTO transformation_rules (
            rule_id, endpoint_id, rule_name, description,
            source_format, target_format, transformation_type,
            template_config, mapping_config, filter_config, pipeline_config,
            validation_config, validation_field_mappings, validation_schema_uri,
            validation_on_fail, validation_strict_mode,
            test_source_url, sample_input, expected_output, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(hydrateRuleRow({
            rule_id: ruleId,
            ...payload
        }));
    });
});

app.put('/api/admin/transformations/:id', (req, res) => {
    const { id } = req.params;
    const payload = normalizeRulePayload(req.body);

    db.run(`
        UPDATE transformation_rules SET
            endpoint_id = ?,
            rule_name = ?,
            description = ?,
            source_format = ?,
            target_format = ?,
            transformation_type = ?,
            template_config = ?,
            mapping_config = ?,
            filter_config = ?,
            pipeline_config = ?,
            validation_config = ?,
            validation_field_mappings = ?,
            validation_schema_uri = ?,
            validation_on_fail = ?,
            validation_strict_mode = ?,
            test_source_url = ?,
            sample_input = ?,
            expected_output = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE rule_id = ?
    `, [
        payload.endpoint_id || null,
        payload.rule_name,
        payload.description || null,
        payload.source_format,
        payload.target_format,
        payload.transformation_type,
        payload.template_config || null,
        payload.mapping_config || null,
        payload.filter_config || '[]',
        payload.pipeline_config || '[]',
        payload.validation_config || null,
        payload.validation_field_mappings || null,
        payload.validation_schema_uri || null,
        payload.validation_on_fail || 'reject',
        payload.validation_strict_mode !== false ? 1 : 0,
        payload.test_source_url || null,
        payload.sample_input || null,
        payload.expected_output || null,
        payload.is_active ? 1 : 0,
        id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Rule not found' });
        getRuleById(id).then(rule => res.json(rule)).catch(e => res.status(500).json({ error: e.message }));
    });
});

app.delete('/api/admin/transformations/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM transformation_rules WHERE rule_id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Rule not found' });
        res.json({ message: 'Rule deleted' });
    });
});

app.post('/api/admin/transformations/preview', async (req, res) => {
    try {
        const { rule, rule_id, sample_input, test_source_url } = req.body;
        let ruleToUse = rule ? normalizeRulePayload(rule, true) : null;

        if (!ruleToUse && rule_id) {
            ruleToUse = await getRuleById(rule_id);
        }

        if (!ruleToUse) {
            return res.status(400).json({ error: 'No rule definition provided' });
        }

        const execution = await executeTransformation(ruleToUse, sample_input, test_source_url);
        res.json(execution);
    } catch (err) {
        console.error('Preview failed:', err);
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/admin/transformations/test', async (req, res) => {
    try {
        const { rule_id, sample_input } = req.body;
        if (!rule_id) {
            return res.status(400).json({ error: 'rule_id is required' });
        }
        const rule = await getRuleById(rule_id);
        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const execution = await executeTransformation(rule, sample_input);
        res.json(execution);
    } catch (err) {
        console.error('Test run failed:', err);
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/admin/transformations/fetch', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'url query parameter is required' });
    }

    try {
        const response = await fetch(url);
        const text = await response.text();
        res.json({
            status: response.status,
            headers: {
                'content-type': response.headers.get('content-type')
            },
            body: text
        });
    } catch (err) {
        res.status(502).json({ error: 'Failed to fetch remote data', details: err.message });
    }
});

// 7. Schema Import and Validation Rule Generation

// Import schema from URI and generate validation rules
app.post('/api/admin/transformations/import-schema', async (req, res) => {
    const { schema_uri } = req.body;

    if (!schema_uri) {
        return res.status(400).json({ error: 'schema_uri is required' });
    }

    try {
        // Fetch schema from government API
        const response = await fetch(schema_uri);
        if (!response.ok) {
            return res.status(502).json({ error: `Failed to fetch schema: HTTP ${response.status}` });
        }

        const schemaData = await response.json();

        // Parse schema and generate validation rules
        const validationRules = parseSchemaToValidationRules(schemaData, schema_uri);

        res.json({
            success: true,
            schema_uri,
            validation_rules: validationRules,
            field_count: validationRules.length,
            schema_title: schemaData.title || '未命名 Schema'
        });
    } catch (err) {
        console.error('Schema import failed:', err);
        res.status(500).json({ error: 'Failed to import schema', details: err.message });
    }
});

// Export field mapping as CSV
app.get('/api/admin/transformations/:id/export-csv', async (req, res) => {
    const { id } = req.params;

    try {
        const rule = await getRuleById(id);
        if (!rule) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const validationRules = JSON.parse(rule.validation_config || '[]');
        const schemaUri = rule.validation_schema_uri || '';

        // Generate CSV content
        let csv = '欄位名稱,Schema URI\n';

        validationRules.forEach(rule => {
            const fieldUri = schemaUri ? `${schemaUri}/${rule.field}` : '';
            csv += `"${rule.field}","${fieldUri}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="field-mapping-${id}.csv"`);
        res.send('\uFEFF' + csv); // Add BOM for Excel compatibility
    } catch (err) {
        console.error('CSV export failed:', err);
        res.status(500).json({ error: 'Failed to export CSV', details: err.message });
    }
});

// 8. Cache Management Endpoints

// Get cache stats
app.get('/api/admin/cache/stats', (req, res) => {
    const stats = {
        total_entries: cache.size,
        cache_ttl_seconds: CACHE_TTL / 1000,
        entries: []
    };

    cache.forEach((value, key) => {
        const age = Date.now() - value.timestamp;
        stats.entries.push({
            key: key,
            age_seconds: Math.floor(age / 1000),
            expires_in_seconds: Math.floor((CACHE_TTL - age) / 1000)
        });
    });

    res.json(stats);
});

// Clear all cache
app.post('/api/admin/cache/clear', (req, res) => {
    const previousSize = cache.size;
    cache.clear();
    res.json({
        message: "Cache cleared successfully",
        entries_cleared: previousSize
    });
});

// Clear specific cache entry
app.delete('/api/admin/cache/:key', (req, res) => {
    const { key } = req.params;
    const deleted = cache.delete(decodeURIComponent(key));

    if (deleted) {
        res.json({ message: "Cache entry deleted" });
    } else {
        res.status(404).json({ error: "Cache entry not found" });
    }
});

// ==================== Alert Management API ====================

// Get all alert rules
app.get('/api/admin/alerts/rules', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    db.get("SELECT COUNT(*) as total FROM alert_rules", (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow.total;
        const totalPages = Math.ceil(total / limit);

        db.all("SELECT * FROM alert_rules ORDER BY created_at DESC LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                data: rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        });
    });
});

// Get single alert rule
app.get('/api/admin/alerts/rules/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM alert_rules WHERE rule_id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Alert rule not found' });
        res.json(row);
    });
});

// Create alert rule
app.post('/api/admin/alerts/rules', (req, res) => {
    const {
        rule_name,
        rule_type,
        description,
        target_type,
        target_id,
        threshold_value,
        threshold_unit,
        time_window,
        notification_channels,
        email_recipients,
        webhook_url,
        is_active
    } = req.body;

    if (!rule_name || !rule_type || !target_type || threshold_value === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const rule_id = crypto.randomUUID();

    db.run(
        `INSERT INTO alert_rules (
            rule_id, rule_name, rule_type, description, target_type, target_id,
            threshold_value, threshold_unit, time_window, notification_channels,
            email_recipients, webhook_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            rule_id, rule_name, rule_type, description || null, target_type, target_id || null,
            threshold_value, threshold_unit || '', time_window || 300,
            notification_channels ? JSON.stringify(notification_channels) : '[]',
            email_recipients || null, webhook_url || null, is_active !== false ? 1 : 0
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: rule_id, message: "Alert rule created" });
        }
    );
});

// Update alert rule
app.put('/api/admin/alerts/rules/:id', (req, res) => {
    const { id } = req.params;
    const {
        rule_name,
        rule_type,
        description,
        target_type,
        target_id,
        threshold_value,
        threshold_unit,
        time_window,
        notification_channels,
        email_recipients,
        webhook_url,
        is_active
    } = req.body;

    db.run(
        `UPDATE alert_rules SET
            rule_name = ?, rule_type = ?, description = ?, target_type = ?, target_id = ?,
            threshold_value = ?, threshold_unit = ?, time_window = ?, notification_channels = ?,
            email_recipients = ?, webhook_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE rule_id = ?`,
        [
            rule_name, rule_type, description, target_type, target_id,
            threshold_value, threshold_unit, time_window,
            notification_channels ? JSON.stringify(notification_channels) : '[]',
            email_recipients, webhook_url, is_active ? 1 : 0, id
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Alert rule not found' });
            res.json({ message: "Alert rule updated" });
        }
    );
});

// Delete alert rule
app.delete('/api/admin/alerts/rules/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM alert_rules WHERE rule_id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Alert rule not found' });
        res.json({ message: "Alert rule deleted" });
    });
});

// Get alert history
app.get('/api/admin/alerts/history', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // Filter by status
    const ruleId = req.query.rule_id; // Filter by rule

    let whereClause = '';
    const params = [];

    if (status) {
        whereClause = 'WHERE status = ?';
        params.push(status);
    }

    if (ruleId) {
        whereClause = whereClause ? `${whereClause} AND rule_id = ?` : 'WHERE rule_id = ?';
        params.push(ruleId);
    }

    db.get(`SELECT COUNT(*) as total FROM alert_history ${whereClause}`, params, (err, countRow) => {
        if (err) return res.status(500).json({ error: err.message });

        const total = countRow.total;
        const totalPages = Math.ceil(total / limit);

        db.all(
            `SELECT * FROM alert_history ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    data: rows,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages
                    }
                });
            }
        );
    });
});

// Acknowledge/Resolve alert
app.patch('/api/admin/alerts/history/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'acknowledged', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

    db.run(
        "UPDATE alert_history SET status = ?, resolved_at = ? WHERE alert_id = ?",
        [status, resolvedAt, id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Alert not found' });
            res.json({ message: "Alert status updated" });
        }
    );
});

// Get alert statistics
app.get('/api/admin/alerts/stats', (req, res) => {
    const period = req.query.period || 'today';

    let timeFilter;
    switch (period) {
        case 'week':
            timeFilter = "datetime('now', '-7 days')";
            break;
        case 'month':
            timeFilter = "datetime('now', '-30 days')";
            break;
        case 'today':
        default:
            timeFilter = "datetime('now', '-24 hours')";
            break;
    }

    db.get(`
        SELECT
            COUNT(*) as total_alerts,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_alerts,
            SUM(CASE WHEN alert_level = 'critical' THEN 1 ELSE 0 END) as critical_alerts
        FROM alert_history
        WHERE created_at >= ${timeFilter}
    `, (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });

        // Get alert trends
        db.all(`
            SELECT
                strftime('%Y-%m-%d %H:00:00', created_at) as hour,
                COUNT(*) as count
            FROM alert_history
            WHERE created_at >= ${timeFilter}
            GROUP BY hour
            ORDER BY hour
        `, (err, trends) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                stats,
                trends: trends || []
            });
        });
    });
});

// 8. OpenData helpers: export validation template CSV (user fills rules)
app.get('/api/admin/opendata/validation-template', (req, res) => {
    const pathParam = req.query.path || '/opendata/health-centers';
    const schema = getOpenDataSchema(pathParam);
    if (!schema) {
        return res.status(404).json({ error: 'Unsupported OpenData path' });
    }

    const rows = schema.fields.map(field => ({
        field_name: field.key,
        display_name: field.label,
        type: field.type || 'string',
        required: field.required ? '1' : '0',
        example: field.example || '',
        validation_rule: '' // user will fill in manually
    }));

    const header = Object.keys(rows[0] || {
        field_name: 'field_name',
        display_name: 'display_name',
        type: 'type',
        required: 'required',
        example: 'example',
        validation_rule: 'validation_rule'
    });

    const csvLines = [];
    csvLines.push(header.join(','));
    rows.forEach(row => {
        const line = header.map(key => {
            const value = row[key] ?? '';
            const needsQuote = String(value).includes(',') || String(value).includes('"');
            if (needsQuote) {
                return `"${String(value).replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
        csvLines.push(line);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${schema.slug || 'validation_template'}.csv"`);
    res.send(csvLines.join('\n'));
});

// 9. OpenData transform helper: returns dataset in desired format and attaches validation rules URL if given
app.post('/api/admin/opendata/transform', async (req, res) => {
    try {
        const { path: pathParam = '/opendata/health-centers', target_format = 'json', validation_rules_url } = req.body || {};
        const dataset = getOpenDataDataset(pathParam);
        if (!dataset) {
            return res.status(404).json({ error: 'Unsupported OpenData path' });
        }

        let transformed = null;
        try {
            transformed = await transformer.transform(dataset.payload, {
                source_format: 'json',
                target_format: target_format || 'json'
            });
        } catch (err) {
            return res.status(400).json({ error: `Transform failed: ${err.message}` });
        }

        let validationRulesBody = '';
        if (validation_rules_url) {
            try {
                const resp = await fetch(validation_rules_url);
                validationRulesBody = await resp.text();
            } catch (err) {
                validationRulesBody = `Failed to fetch validation rules: ${err.message}`;
            }
        }

        const contentType = target_format === 'csv'
            ? 'text/csv'
            : target_format === 'xml'
                ? 'application/xml'
                : 'application/json';

        res.setHeader('Content-Type', contentType);
        res.json({
            path: pathParam,
            target_format,
            validation_rules_url: validation_rules_url || '',
            validation_rules_body: validationRulesBody,
            output_text: transformed.outputText,
            meta: transformed.meta
        });
    } catch (err) {
        console.error('OpenData transform failed:', err);
        res.status(500).json({ error: 'Failed to transform OpenData dataset', details: err.message });
    }
});

// 10. Generic Proxy for registered endpoints (applies transformation if rule exists)
app.use(async (req, res, next) => {
    try {
        // Skip if already handled by previous routes
        if (req.path.startsWith('/api/admin/')
            || req.path.startsWith('/opendata/')
            || req.path.startsWith('/external/')) {
            return next();
        }

        const endpoint = await getEndpointByPath(req.path);
        if (!endpoint || !endpoint.is_active) {
            return res.status(404).json({ error: 'Endpoint not registered' });
        }

        const targetUrl = buildTargetUrl(endpoint.target_url, req.query);
        const fetchOptions = buildProxyFetchOptions(req);
        const upstream = await fetch(targetUrl, fetchOptions);
        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        const rawBody = await upstream.text();

        // Guess source format from content-type/header
        let sourceFormat = guessFormatFromContentType(contentType);
        let parsedPayload = rawBody;
        if (sourceFormat === 'json') {
            try {
                parsedPayload = JSON.parse(rawBody);
            } catch (_) {
                parsedPayload = rawBody;
            }
        }

        const transformed = await maybeTransformResponse(req.path, parsedPayload, sourceFormat);
        if (transformed) {
            res.set('Content-Type', transformed.contentType);
            return res.status(upstream.status).send(transformed.body);
        }

        res.set('Content-Type', contentType);
        res.status(upstream.status).send(rawBody);
    } catch (err) {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Upstream proxy failed', details: err.message });
    }
});

// Helper functions

/**
 * 解析政府 Schema 並自動產生驗證規則
 * @param {Object} schemaData - 從 schema.gov.tw 獲取的 Schema 資料
 * @param {String} schemaUri - Schema URI
 * @returns {Array} - 驗證規則陣列
 */
function parseSchemaToValidationRules(schemaData, schemaUri) {
    const rules = [];

    // 政府 OpenData Schema 通常有 properties 或 fields 欄位
    const fields = schemaData.properties || schemaData.fields || schemaData.columns || [];

    // 單欄位格式（例：schema.gov.tw/api/.../Average），帶有 code/property/regexp
    const isSingleFieldFormat = !Array.isArray(fields) && typeof fields !== 'object'
        && (schemaData.code || schemaData.property || schemaData.regexp);
    if (isSingleFieldFormat) {
        const rule = {
            field: schemaData.title || schemaData.en_title || 'field',
            schemaUri
        };

        const normalizeRegex = (candidate, fallback) => {
            if (!candidate && !fallback) return null;
            let raw = String(candidate || fallback || '').trim();
            if (!raw) return null;
            if (raw === 'idValidate') return '^[A-Z][12][0-9]{8}$';
            raw = raw.replace(/^\\?\//, '').replace(/\\?\/$/, '');
            raw = raw.replace(/0{2,}-9{2,}/g, (m) => {
                const [zeros, nines] = m.split('-');
                return `[0-9]{${zeros.length}}`;
            });
            return raw || null;
        };

        const normalizedCode = String(schemaData.code || '').toLowerCase();
        const normalizedProp = String(schemaData.property || '').toLowerCase();

        // 型別推斷
        if (normalizedCode.includes('數') || normalizedProp.includes('數')) {
            rule.type = 'number';
            rule.message = `欄位 ${rule.field} 必須是數字`;
        } else {
            rule.type = 'string';
            rule.message = `欄位 ${rule.field} 必須是字串`;
        }

        // 正規表達式
        const pattern = normalizeRegex(schemaData.regexp, schemaData.property);
        if (pattern) {
            rule.type = 'regex';
            rule.pattern = pattern;
            rule.message = `欄位 ${rule.field} 格式不符合規則`;
        }

        rules.push(rule);
        return rules;
    }

    // 如果是陣列格式
    if (Array.isArray(fields)) {
        fields.forEach(field => {
            const rule = {
                field: field.name || field.title || field.id,
                schemaUri: `${schemaUri}/${field.name || field.id}`
            };

            // 必填欄位
            if (field.required === true || field.constraints?.required === true) {
                rule.type = 'required';
                rule.message = `欄位 ${rule.field} 為必填`;
            }

            // 資料型別
            const fieldType = field.type || field.dataType || '';
            if (fieldType.toLowerCase() === 'string') {
                rule.type = rule.type || 'string';
                rule.message = rule.message || `欄位 ${rule.field} 必須是字串`;
            } else if (fieldType.toLowerCase() === 'number' || fieldType.toLowerCase() === 'integer') {
                rule.type = rule.type || 'number';
                rule.message = rule.message || `欄位 ${rule.field} 必須是數字`;

                // 數值範圍
                if (field.minimum !== undefined) rule.min = field.minimum;
                if (field.maximum !== undefined) rule.max = field.maximum;
            } else if (fieldType.toLowerCase() === 'date' || fieldType.toLowerCase() === 'datetime') {
                rule.type = rule.type || 'date';
                rule.message = rule.message || `欄位 ${rule.field} 必須是有效的日期`;
            }

            // 格式驗證
            if (field.format) {
                if (field.format === 'email') {
                    rule.type = 'email';
                    rule.message = `欄位 ${rule.field} 必須是有效的電子郵件`;
                } else if (field.format === 'uri' || field.format === 'url') {
                    rule.type = 'url';
                    rule.message = `欄位 ${rule.field} 必須是有效的 URL`;
                }
            }

            // 正規表達式
            if (field.pattern) {
                rule.type = 'regex';
                rule.pattern = field.pattern;
                rule.message = `欄位 ${rule.field} 格式不符合規則`;
            }

            // 枚舉值
            if (field.enum && Array.isArray(field.enum)) {
                rule.type = 'enum';
                rule.values = field.enum;
                rule.message = `欄位 ${rule.field} 必須是 ${field.enum.join(', ')} 其中之一`;
            }

            // 長度限制
            if (field.minLength || field.maxLength) {
                rule.type = 'length';
                if (field.minLength) rule.min = field.minLength;
                if (field.maxLength) rule.max = field.maxLength;
                rule.message = `欄位 ${rule.field} 長度必須在 ${field.minLength || 0} 到 ${field.maxLength || '無限制'} 之間`;
            }

            rules.push(rule);
        });
    }
    // 如果是物件格式
    else if (typeof fields === 'object') {
        Object.keys(fields).forEach(fieldName => {
            const field = fields[fieldName];
            const rule = {
                field: fieldName,
                schemaUri: `${schemaUri}/${fieldName}`
            };

            // 處理類似上面的邏輯...
            if (field.required) {
                rule.type = 'required';
                rule.message = `欄位 ${fieldName} 為必填`;
            }

            rules.push(rule);
        });
    }

    return rules;
}

function parseJsonSafe(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (err) {
        return null;
    }
}

function getNested(obj, path) {
    if (!path) return undefined;
    const tokens = String(path).split('.').map(t => t.trim()).filter(Boolean);
    return tokens.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

async function validateWithSchemaApi(fieldMappings = [], outputData) {
    if (!fieldMappings.length) return null;
    const records = Array.isArray(outputData) ? outputData : [outputData];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        for (const mapping of fieldMappings) {
            if (!mapping.schemaUri || !mapping.fieldName) continue;
            const value = getNested(record, mapping.fieldName);
            const schemaUri = /^https?:\/\//i.test(mapping.schemaUri)
                ? mapping.schemaUri
                : `https://schema.gov.tw/${String(mapping.schemaUri).replace(/^\/+/, '')}`;

            try {
                const resp = await fetch('https://schema.gov.tw/api/v1/schemauri.check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ schemauri: schemaUri, data: value })
                });
                const body = await resp.json().catch(() => ({}));
                const valid = Boolean(body.valid ?? body.success ?? body.data?.valid ?? resp.ok);
                if (!valid) {
                    errors.push({
                        index: i,
                        field: mapping.fieldName,
                        message: body.message || body.error || '遠端驗證未通過',
                        rule: 'schemauri.check'
                    });
                }
            } catch (err) {
                errors.push({
                    index: i,
                    field: mapping.fieldName,
                    message: `遠端驗證失敗: ${err.message}`,
                    rule: 'schemauri.check'
                });
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function normalizeRulePayload(body = {}, keepObjects = false) {
    const mappingValue = body?.mapping_config ?? body?.mappingConfig ?? null;
    const filterValue = body?.filter_config ?? body?.filterConfig ?? [];
    const pipelineValue = body?.pipeline_config ?? body?.pipeline ?? [];
    const sampleValue = body?.sample_input ?? body?.sampleInput ?? '';
    const expectedValue = body?.expected_output ?? body?.expectedOutput ?? '';

    const payload = {
        rule_id: body.rule_id,
        endpoint_id: body.endpoint_id || null,
        rule_name: body.rule_name || body.ruleName || '',
        description: body.description || '',
        source_format: (body.source_format || body.sourceFormat || 'json').toLowerCase(),
        target_format: (body.target_format || body.targetFormat || 'json').toLowerCase(),
        transformation_type: (body.transformation_type || body.transformationType || 'template').toLowerCase(),
        template_config: typeof body.template_config === 'object' && !keepObjects
            ? JSON.stringify(body.template_config)
            : (body.template_config || ''),
        mapping_config: keepObjects
            ? (typeof mappingValue === 'string' ? parseJsonField(mappingValue, null) : mappingValue || null)
            : toJsonString(mappingValue, null),
        filter_config: keepObjects
            ? (Array.isArray(filterValue) ? filterValue : parseJsonField(filterValue, []))
            : toJsonString(filterValue, '[]'),
        pipeline_config: keepObjects
            ? (Array.isArray(pipelineValue) ? pipelineValue : parseJsonField(pipelineValue, []))
            : toJsonString(pipelineValue, '[]'),
        test_source_url: body.test_source_url || body.testSourceUrl || '',
        sample_input: sampleValue,
        expected_output: expectedValue,
        is_active: body.is_active !== undefined ? Number(body.is_active) : 1
    };

    if (!keepObjects) {
        if (payload.sample_input && typeof payload.sample_input !== 'string') {
            payload.sample_input = JSON.stringify(payload.sample_input);
        }
        if (payload.expected_output && typeof payload.expected_output !== 'string') {
            payload.expected_output = JSON.stringify(payload.expected_output);
        }
    }

    return payload;
}

function hydrateRuleRow(row) {
    if (!row) return null;
    return {
        ...row,
        filter_config: parseJsonField(row.filter_config, []),
        mapping_config: parseJsonField(row.mapping_config, null),
        pipeline_config: parseJsonField(row.pipeline_config, []),
        sample_input: row.sample_input,
        expected_output: row.expected_output
    };
}

function parseJsonField(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (err) {
        return fallback;
    }
}

function toJsonString(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        return value;
    }
    try {
        return JSON.stringify(value);
    } catch (err) {
        return fallback;
    }
}

function getRuleById(ruleId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM transformation_rules WHERE rule_id = ?`, [ruleId], (err, row) => {
            if (err) return reject(err);
            resolve(hydrateRuleRow(row));
        });
    });
}

async function executeTransformation(rule, overrideInput, overrideUrl) {
    const hydratedRule = hydrateRuleRow(rule);
    const inputPayload = await resolveSourceInput(hydratedRule, overrideInput, overrideUrl);
    const result = await transformer.transform(inputPayload, hydratedRule);
    const fieldMappings = parseJsonField(hydratedRule.validation_field_mappings, []) || [];
    const remoteValidation = await validateWithSchemaApi(fieldMappings, result.output);
    const combinedValidation = {
        valid: (result.validation ? result.validation.valid : true) && (remoteValidation ? remoteValidation.valid : true),
        errors: [
            ...(result.validation?.errors || []),
            ...(remoteValidation?.errors || [])
        ],
        data: result.validation?.data || result.output
    };

    return {
        target_format: result.targetFormat,
        output: result.output,
        output_text: result.outputText,
        meta: result.meta,
        validation: combinedValidation
    };
}

async function resolveSourceInput(rule, overrideInput, overrideUrl) {
    if (overrideInput !== undefined && overrideInput !== null && overrideInput !== '') {
        return overrideInput;
    }
    if (rule.sample_input) {
        return rule.sample_input;
    }
    const remoteUrl = overrideUrl || rule.test_source_url;
    if (remoteUrl) {
        return await fetchRemoteBody(remoteUrl);
    }
    if (rule.source_format === 'json') {
        return '{}';
    }
    return '';
}

async function fetchRemoteBody(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch remote data (${response.status})`);
    }
    return await response.text();
}

function generateApiKey() {
    return 'gw_' + crypto.randomBytes(32).toString('hex');
}

async function maybeTransformResponse(gatewayPath, payload, sourceFormat = 'json') {
    try {
        const rule = await findActiveRuleForPath(gatewayPath);
        if (!rule) return null;

        const result = await transformer.transform(payload, rule, { sourceFormat });
        let contentType = 'application/json';
        if (result.targetFormat === 'csv') contentType = 'text/csv';
        if (result.targetFormat === 'xml') contentType = 'application/xml';

        return {
            body: result.outputText || result.output,
            contentType
        };
    } catch (err) {
        console.error(`Transformation failed for path ${gatewayPath}:`, err);
        return null;
    }
}

function findActiveRuleForPath(gatewayPath) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT tr.*
            FROM transformation_rules tr
            JOIN api_endpoints ep ON tr.endpoint_id = ep.endpoint_id
            WHERE ep.gateway_path = ? AND tr.is_active = 1
            ORDER BY tr.updated_at DESC
            LIMIT 1
        `, [gatewayPath], (err, row) => {
            if (err) return reject(err);
            resolve(hydrateRuleRow(row));
        });
    });
}

function getEndpointByPath(gatewayPath) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM api_endpoints WHERE gateway_path = ?`, [gatewayPath], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function buildTargetUrl(baseUrl, query) {
    if (!query || Object.keys(query).length === 0) return baseUrl;
    const url = new URL(baseUrl);
    Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, v));
        } else {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
}

function buildProxyFetchOptions(req) {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    // Ensure admin key is not forwarded downstream
    delete headers['x-gateway-api-key'];

    const options = {
        method: req.method,
        headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.is('application/json')) {
            options.body = JSON.stringify(req.body);
        } else if (req.body && typeof req.body === 'string') {
            options.body = req.body;
        }
    }
    return options;
}

function guessFormatFromContentType(contentType) {
    const lowered = contentType.toLowerCase();
    if (lowered.includes('json')) return 'json';
    if (lowered.includes('csv')) return 'csv';
    if (lowered.includes('xml')) return 'xml';
    return 'json';
}

function getOpenDataSchema(gatewayPath) {
    if (gatewayPath === '/opendata/health-centers') {
        return {
            slug: 'health_centers_validation',
            fields: [
                { key: 'Name', label: '衛生所名稱', type: 'string', required: true, example: '斗六市衛生所' },
                { key: 'Code', label: '代碼', type: 'string', required: true, example: 'YL001' },
                { key: 'Telephone', label: '電話', type: 'string', required: true, example: '05-5322154' },
                { key: 'Address', label: '地址', type: 'string', required: true, example: '雲林縣斗六市府前街23號' },
                { key: 'City', label: '縣市', type: 'string', required: true, example: '雲林縣' },
                { key: 'District', label: '鄉鎮市區', type: 'string', required: true, example: '斗六市' },
                { key: 'Latitude', label: '緯度', type: 'number', required: false, example: '23.7117' },
                { key: 'Longitude', label: '經度', type: 'number', required: false, example: '120.5437' }
            ]
        };
    }
    return null;
}

function getOpenDataDataset(gatewayPath) {
    if (gatewayPath === '/opendata/health-centers') {
        const data = [
            {
                "Name": "斗六市衛生所",
                "Code": "YL001",
                "Telephone": "05-5322154",
                "Address": "雲林縣斗六市府前街23號",
                "City": "雲林縣",
                "District": "斗六市",
                "Latitude": 23.7117,
                "Longitude": 120.5437
            },
            {
                "Name": "斗南鎮衛生所",
                "Code": "YL002",
                "Telephone": "05-5962004",
                "Address": "雲林縣斗南鎮中山路180號",
                "City": "雲林縣",
                "District": "斗南鎮",
                "Latitude": 23.6797,
                "Longitude": 120.4783
            }
        ];

        return {
            slug: 'health_centers',
            payload: {
                metadata: {
                    datasetIdentifier: "yunlin-health-centers",
                    title: "雲林縣衛生所資訊",
                    organization: "雲林縣衛生局",
                    lastModified: "2024-11-20",
                    schema: "https://schema.gov.tw/Details?nodeId=25507",
                    totalRecords: data.length
                },
                data
            }
        };
    }
    return null;
}

function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

function checkIpWhitelist(clientIp, whitelist) {
    if (!whitelist) return true;

    // Parse whitelist (could be JSON array or newline-separated)
    let allowedIps = [];
    try {
        allowedIps = JSON.parse(whitelist);
    } catch (e) {
        allowedIps = whitelist.split('\n').map(ip => ip.trim()).filter(ip => ip);
    }

    // Clean IPv6 prefix if present
    const cleanIp = clientIp.replace(/^::ffff:/, '');

    for (const allowedIp of allowedIps) {
        // Support wildcard matching
        const pattern = allowedIp.replace(/\./g, '\\.').replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(cleanIp)) {
            return true;
        }
    }

    return false;
}

function maskApiKey(key) {
    if (!key || key.length < 8) return key;
    return key.substring(0, 6) + '****' + key.substring(key.length - 4);
}

// Permission checking function
function checkPermission(systemId, requestPath, callback) {
    // Get the endpoint that matches this path
    db.get(
        "SELECT endpoint_id FROM api_endpoints WHERE gateway_path = ? AND is_active = 1",
        [requestPath],
        (err, endpoint) => {
            if (err) {
                return callback(err);
            }

            // If no endpoint found for this path, allow (might be a static resource)
            if (!endpoint) {
                return callback(null, true);
            }

            // Check if system has permission for this endpoint
            db.get(
                "SELECT * FROM system_permissions WHERE system_id = ? AND endpoint_id = ?",
                [systemId, endpoint.endpoint_id],
                (permErr, permission) => {
                    if (permErr) {
                        return callback(permErr);
                    }

                    // Has permission if record exists
                    callback(null, !!permission);
                }
            );
        }
    );
}

// Rate limiting function (using sliding window per hour)
function checkRateLimit(system, callback) {
    const now = Date.now();
    const windowStart = Math.floor(now / 3600000) * 3600000; // Round down to the hour

    // Get current request count for this system in this window
    db.get(
        "SELECT request_count FROM rate_limit_tracking WHERE system_id = ? AND window_start = ?",
        [system.system_id, windowStart],
        (err, row) => {
            if (err) {
                return callback(err);
            }

            const currentCount = row ? row.request_count : 0;

            if (currentCount >= system.rate_limit) {
                return callback(null, false, 0); // Not allowed, no remaining requests
            }

            // Increment the counter
            db.run(
                `INSERT INTO rate_limit_tracking (system_id, window_start, request_count)
                 VALUES (?, ?, 1)
                 ON CONFLICT(system_id, window_start)
                 DO UPDATE SET request_count = request_count + 1`,
                [system.system_id, windowStart],
                (updateErr) => {
                    if (updateErr) {
                        return callback(updateErr);
                    }

                    const remaining = system.rate_limit - currentCount - 1;
                    callback(null, true, remaining); // Allowed, with remaining count
                }
            );
        }
    );

    // Clean up old tracking records (older than 2 hours)
    const twoHoursAgo = now - 7200000;
    db.run("DELETE FROM rate_limit_tracking WHERE window_start < ?", [twoHoursAgo]);
}

// 启动告警监控服务
alertMonitor.start();

app.listen(PORT, () => {
    console.log(`API Gateway running on http://localhost:${PORT}`);
    console.log('Alert monitoring service started');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务...');
    alertMonitor.stop();
    process.exit(0);
});
