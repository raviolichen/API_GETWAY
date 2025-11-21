const API_BASE = 'http://localhost:3000';
const ADMIN_KEY = 'admin-key-12345';

// Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching
    const tabs = document.querySelectorAll('nav a[data-tab]');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = tab.getAttribute('data-tab');

            // Update active tab
            document.querySelectorAll('nav a').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'dashboard') loadStats();
            if (targetId === 'logs') loadLogs();
            if (targetId === 'api-management') loadEndpoints();
            if (targetId === 'system-management') loadSystems();
            if (targetId === 'transformations' && window.initializeTransformationTab) {
                window.initializeTransformationTab();
            }
        });
    });

    // Initial Load
    if (document.getElementById('dashboard')) {
        loadStats();
        document.getElementById('refresh-logs').addEventListener('click', loadLogs);
    }

    if (document.getElementById('api-management')) {
        loadEndpoints();
    }

    if (document.getElementById('transformations') && window.initializeTransformationTab) {
        // 預先初始化讓畫布可以準備好樣式
        window.initializeTransformationTab();
    }
});

async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/stats`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        const data = await res.json();

        document.getElementById('total-requests').textContent = data.total_requests;
        document.getElementById('active-endpoints').textContent = data.active_endpoints;
        document.getElementById('systems-connected').textContent = data.systems_connected;
    } catch (err) {
        console.error('Failed to load stats', err);
    }
}

async function loadLogs() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/logs`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        const logs = await res.json();

        const tbody = document.getElementById('logs-body');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--secondary-color);">暫無日誌記錄</td></tr>';
            return;
        }

        logs.forEach(log => {
            const tr = document.createElement('tr');
            const statusClass = log.http_status >= 200 && log.http_status < 300 ? 'data' : 'ai';

            tr.innerHTML = `
                <td>${new Date(log.created_at).toLocaleString('zh-TW')}</td>
                <td>${log.system_name || '-'}</td>
                <td>${log.endpoint_name || '-'}</td>
                <td>${log.gateway_path || '-'}</td>
                <td><span class="badge ${statusClass}">${log.http_status}</span></td>
                <td>${log.response_time_ms}ms</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load logs', err);
    }
}

// --- CRUD Logic ---

let currentEndpoints = [];

async function loadEndpoints() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/endpoints`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        currentEndpoints = await res.json();
        renderEndpoints();
    } catch (err) {
        console.error('Failed to load endpoints', err);
    }
}

function renderEndpoints() {
    const tbody = document.getElementById('endpoints-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    currentEndpoints.forEach(ep => {
        const tr = document.createElement('tr');
        const statusClass = ep.is_active ? 'active' : 'inactive';
        const statusText = ep.is_active ? 'Active' : 'Inactive';
        const typeBadge = ep.api_type === 'data' ? 'data' : 'ai';
        const typeText = ep.api_type === 'data' ? 'Data' : 'AI Passthrough';

        tr.innerHTML = `
            <td>${ep.name}</td>
            <td>${ep.gateway_path}</td>
            <td>${ep.target_url}</td>
            <td><span class="badge ${typeBadge}">${typeText}</span></td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>
                <button class="btn-sm btn-secondary" onclick="editEndpoint('${ep.endpoint_id}')">編輯</button>
                <button class="btn-sm btn-danger" onclick="deleteEndpoint('${ep.endpoint_id}')">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openModal(endpointId = null) {
    const modal = document.getElementById('endpoint-modal');
    const title = document.getElementById('modal-title');

    if (endpointId) {
        const ep = currentEndpoints.find(e => e.endpoint_id === endpointId);
        if (!ep) return;

        title.textContent = '編輯端點';
        document.getElementById('endpoint-id').value = ep.endpoint_id;
        document.getElementById('endpoint-name').value = ep.name;
        document.getElementById('endpoint-path').value = ep.gateway_path;
        document.getElementById('endpoint-target').value = ep.target_url;
        document.getElementById('endpoint-type').value = ep.api_type;
        document.getElementById('endpoint-timeout').value = ep.timeout;
        document.getElementById('endpoint-active').value = ep.is_active;
    } else {
        title.textContent = '新增端點';
        document.getElementById('endpoint-id').value = '';
        document.getElementById('endpoint-name').value = '';
        document.getElementById('endpoint-path').value = '';
        document.getElementById('endpoint-target').value = '';
        document.getElementById('endpoint-type').value = 'data';
        document.getElementById('endpoint-timeout').value = '30';
        document.getElementById('endpoint-active').value = '1';
    }

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('endpoint-modal').style.display = 'none';
}

// Close modal if clicked outside
window.onclick = function (event) {
    const modal = document.getElementById('endpoint-modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function editEndpoint(id) {
    openModal(id);
}

async function saveEndpoint() {
    const id = document.getElementById('endpoint-id').value;
    const data = {
        name: document.getElementById('endpoint-name').value,
        gateway_path: document.getElementById('endpoint-path').value,
        target_url: document.getElementById('endpoint-target').value,
        api_type: document.getElementById('endpoint-type').value,
        timeout: document.getElementById('endpoint-timeout').value,
        is_active: document.getElementById('endpoint-active').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/api/admin/endpoints/${id}` : `${API_BASE}/api/admin/endpoints`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': ADMIN_KEY
            },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            closeModal();
            loadEndpoints();
            loadStats(); // Refresh stats too
        } else {
            alert('儲存失敗');
        }
    } catch (err) {
        console.error('Error saving endpoint', err);
        alert('儲存錯誤');
    }
}

async function deleteEndpoint(id) {
    if (!confirm('確定要刪除此端點嗎？')) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/endpoints/${id}`, {
            method: 'DELETE',
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });

        if (res.ok) {
            loadEndpoints();
            loadStats();
        } else {
            alert('刪除失敗');
        }
    } catch (err) {
        console.error('Error deleting endpoint', err);
        alert('刪除錯誤');
    }
}

// Test Page Logic
async function testOpenData() {
    const format = document.getElementById('opendata-format').value;
    const resultPre = document.getElementById('opendata-result');

    resultPre.textContent = 'Loading...';

    try {
        const res = await fetch(`${API_BASE}/opendata/health-centers?format=${format}`);
        const text = await res.text();

        try {
            // Try to format JSON nicely
            const json = JSON.parse(text);
            resultPre.textContent = JSON.stringify(json, null, 2);
        } catch (e) {
            resultPre.textContent = text;
        }
    } catch (err) {
        resultPre.textContent = 'Error: ' + err.message;
    }
}

async function testAI() {
    const gatewayKey = document.getElementById('gateway-key').value;
    const targetKey = document.getElementById('target-key').value;
    const message = document.getElementById('ai-message').value;
    const resultPre = document.getElementById('ai-result');

    resultPre.textContent = 'Loading...';

    try {
        const res = await fetch(`${API_BASE}/external/openai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': gatewayKey,
                'X-Target-API-Key': targetKey
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { "role": "user", "content": message }
                ]
            })
        });

        const data = await res.json();
        resultPre.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        resultPre.textContent = 'Error: ' + err.message;
    }
}

// --- System Management ---

let currentSystems = [];

async function loadSystems() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/systems`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        currentSystems = await res.json();
        renderSystems();
    } catch (err) {
        console.error('Failed to load systems', err);
    }
}

async function renderSystems() {
    const tbody = document.getElementById('systems-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Get permission counts for each system
    const permissionCounts = {};
    try {
        const permRes = await fetch(`${API_BASE}/api/admin/permissions`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        const perms = await permRes.json();
        perms.forEach(p => {
            permissionCounts[p.system_id] = (permissionCounts[p.system_id] || 0) + 1;
        });
    } catch (err) {
        console.error('Failed to load permissions', err);
    }

    currentSystems.forEach(sys => {
        const tr = document.createElement('tr');
        const ipWhitelist = sys.ip_whitelist || '無限制';
        const permCount = permissionCounts[sys.system_id] || 0;

        tr.innerHTML = `
            <td>${sys.system_name}</td>
            <td>
                <span style="font-family: monospace; color: var(--secondary-color);">${sys.api_key_display}</span>
                <button class="btn-sm btn-secondary" onclick="resetApiKey('${sys.system_id}', '${sys.system_name}')">重置 Key</button>
            </td>
            <td>${sys.rate_limit}</td>
            <td style="font-size: 0.875rem;">${ipWhitelist}</td>
            <td>
                <span class="badge ${permCount > 0 ? 'data' : 'ai'}">${permCount} 個端點</span>
            </td>
            <td>
                <button class="btn-sm btn-secondary" onclick="managePermissions('${sys.system_id}', '${sys.system_name}')">管理授權</button>
                <button class="btn-sm btn-secondary" onclick="editSystem('${sys.system_id}')">編輯</button>
                <button class="btn-sm btn-danger" onclick="deleteSystem('${sys.system_id}')">刪除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openSystemModal(systemId = null) {
    const modal = document.getElementById('system-modal');
    const title = document.getElementById('system-modal-title');
    const newKeyDisplay = document.getElementById('new-api-key-display');

    newKeyDisplay.style.display = 'none';

    if (systemId) {
        const sys = currentSystems.find(s => s.system_id === systemId);
        if (!sys) return;

        title.textContent = '編輯系統';
        document.getElementById('system-id').value = sys.system_id;
        document.getElementById('system-name').value = sys.system_name;
        document.getElementById('system-rate-limit').value = sys.rate_limit;
        document.getElementById('system-ip-whitelist').value = sys.ip_whitelist || '';
    } else {
        title.textContent = '新增系統';
        document.getElementById('system-id').value = '';
        document.getElementById('system-name').value = '';
        document.getElementById('system-rate-limit').value = '1000';
        document.getElementById('system-ip-whitelist').value = '';
    }

    modal.style.display = 'block';
}

function closeSystemModal() {
    document.getElementById('system-modal').style.display = 'none';
}

function editSystem(id) {
    openSystemModal(id);
}

async function saveSystem() {
    const id = document.getElementById('system-id').value;
    const data = {
        system_name: document.getElementById('system-name').value,
        rate_limit: parseInt(document.getElementById('system-rate-limit').value),
        ip_whitelist: document.getElementById('system-ip-whitelist').value || null
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/api/admin/systems/${id}` : `${API_BASE}/api/admin/systems`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': ADMIN_KEY
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            closeSystemModal();
            loadSystems();
            loadStats();

            // If creating new system, show the API key in dedicated modal
            if (!id && result.api_key) {
                showApiKey(result.api_key);
            }
        } else {
            alert('儲存失敗: ' + result.error);
        }
    } catch (err) {
        console.error('Error saving system', err);
        alert('儲存錯誤');
    }
}

async function deleteSystem(id) {
    if (!confirm('確定要刪除此系統嗎？')) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/systems/${id}`, {
            method: 'DELETE',
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });

        if (res.ok) {
            loadSystems();
            loadStats();
        } else {
            alert('刪除失敗');
        }
    } catch (err) {
        console.error('Error deleting system', err);
        alert('刪除錯誤');
    }
}

async function resetApiKey(systemId, systemName) {
    if (!confirm(`確定要重置「${systemName}」的 API Key 嗎？舊的 Key 將會失效。`)) return;

    try {
        const res = await fetch(`${API_BASE}/api/admin/systems/${systemId}/reset-key`, {
            method: 'POST',
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });

        const result = await res.json();

        if (res.ok) {
            showApiKey(result.api_key);
            loadSystems();
        } else {
            alert('重置失敗');
        }
    } catch (err) {
        console.error('Error resetting API key', err);
        alert('重置錯誤');
    }
}

function showApiKey(apiKey) {
    document.getElementById('apikey-display').value = apiKey;
    document.getElementById('apikey-modal').style.display = 'block';
}

function closeApiKeyModal() {
    document.getElementById('apikey-modal').style.display = 'none';
    document.getElementById('apikey-display').value = '';
}

function copyApiKey() {
    const input = document.getElementById('apikey-display');
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(input.value).then(() => {
        alert('API Key 已複製到剪貼簿');
    }).catch(err => {
        console.error('Failed to copy', err);
        alert('複製失敗，請手動複製');
    });
}

// Close system modal if clicked outside
window.addEventListener('click', function (event) {
    const systemModal = document.getElementById('system-modal');
    if (event.target == systemModal) {
        closeSystemModal();
    }

    const permissionModal = document.getElementById('permission-modal');
    if (event.target == permissionModal) {
        closePermissionModal();
    }
});

// --- Permission Management ---

async function managePermissions(systemId, systemName) {
    const modal = document.getElementById('permission-modal');
    document.getElementById('permission-system-id').value = systemId;
    document.getElementById('permission-system-name').textContent = systemName;

    // Load all endpoints
    try {
        const epRes = await fetch(`${API_BASE}/api/admin/endpoints`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        const endpoints = await epRes.json();

        // Load current permissions for this system
        const permRes = await fetch(`${API_BASE}/api/admin/systems/${systemId}/permissions`, {
            headers: { 'X-Gateway-API-Key': ADMIN_KEY }
        });
        const permissions = await permRes.json();
        const grantedEndpointIds = permissions.map(p => p.endpoint_id);

        // Render checkboxes
        const checklist = document.getElementById('endpoints-checklist');
        checklist.innerHTML = '';

        endpoints.forEach(ep => {
            const isChecked = grantedEndpointIds.includes(ep.endpoint_id);
            const typeClass = ep.api_type === 'data' ? 'data' : 'ai';
            const typeText = ep.api_type === 'data' ? 'Data' : 'AI';

            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.innerHTML = `
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox"
                           value="${ep.endpoint_id}"
                           ${isChecked ? 'checked' : ''}
                           style="width: 20%; max-width: 40px; margin-right: 10px; flex-shrink: 0;">
                    <span style="flex: 1;">
                        <strong>${ep.name}</strong>
                        <span class="badge ${typeClass}" style="margin-left: 10px;">${typeText}</span>
                        <br>
                        <small style="color: var(--secondary-color);">${ep.gateway_path}</small>
                    </span>
                </label>
            `;
            checklist.appendChild(div);
        });

        modal.style.display = 'block';
    } catch (err) {
        console.error('Failed to load permissions', err);
        alert('載入授權資訊失敗');
    }
}


function closePermissionModal() {
    document.getElementById('permission-modal').style.display = 'none';
}

async function savePermissions() {
    const systemId = document.getElementById('permission-system-id').value;
    const checkboxes = document.querySelectorAll('#endpoints-checklist input[type="checkbox"]');

    const endpointIds = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            endpointIds.push(cb.value);
        }
    });

    try {
        const res = await fetch(`${API_BASE}/api/admin/systems/${systemId}/permissions/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': ADMIN_KEY
            },
            body: JSON.stringify({ endpoint_ids: endpointIds })
        });

        const result = await res.json();

        if (res.ok) {
            alert(`授權更新成功！已授權 ${result.granted} 個端點。`);
            closePermissionModal();
            loadSystems(); // Refresh the systems list
        } else {
            alert('授權更新失敗: ' + result.error);
        }
    } catch (err) {
        console.error('Error saving permissions', err);
        alert('授權更新錯誤');
    }
}
