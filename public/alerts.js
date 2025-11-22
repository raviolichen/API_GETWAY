// ==================== Alert Management ====================

let currentAlertRulesPage = 1;
let currentAlertHistoryPage = 1;
let currentAlertStatusFilter = '';

// Load Alert Rules
async function loadAlertRules(page = 1) {
    currentAlertRulesPage = page;
    try {
        const response = await fetch(`${API_BASE}/admin/alerts/rules?page=${page}&limit=10`, {
            headers: { 'X-Gateway-API-Key': API_KEY }
        });
        const data = await response.json();

        const tbody = document.getElementById('alert-rules-table-body');
        if (!data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">尚無告警規則</td></tr>';
            return;
        }

        tbody.innerHTML = data.data.map(rule => {
            const channels = JSON.parse(rule.notification_channels || '[]');
            const channelBadges = channels.map(ch => `<span class="channel-badge">${ch}</span>`).join('');

            const ruleTypeText = {
                'error_rate': '錯誤率',
                'response_time': '回應時間',
                'traffic_anomaly': '流量異常'
            }[rule.rule_type] || rule.rule_type;

            const targetTypeText = {
                'global': '全局',
                'endpoint': '端點',
                'system': '系統'
            }[rule.target_type] || rule.target_type;

            return `
                <tr>
                    <td>${rule.rule_name}</td>
                    <td><span class="alert-rule-type">${ruleTypeText}</span></td>
                    <td>${targetTypeText}</td>
                    <td>${rule.threshold_value}${rule.threshold_unit}</td>
                    <td>${rule.time_window}s</td>
                    <td><div class="notification-channels">${channelBadges}</div></td>
                    <td><span class="status ${rule.is_active ? 'active' : 'inactive'}">${rule.is_active ? '啟用' : '停用'}</span></td>
                    <td>
                        <button class="btn-sm btn-secondary" onclick="editAlertRule('${rule.rule_id}')">編輯</button>
                        <button class="btn-sm btn-danger" onclick="deleteAlertRule('${rule.rule_id}')">刪除</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination('alert-rules-pagination', data.pagination, loadAlertRules);
    } catch (error) {
        console.error('Failed to load alert rules:', error);
        showNotification('載入告警規則失敗', 'error');
    }
}

// Load Alert History
async function loadAlertHistory(page = 1) {
    currentAlertHistoryPage = page;
    try {
        let url = `${API_BASE}/admin/alerts/history?page=${page}&limit=10`;
        if (currentAlertStatusFilter) {
            url += `&status=${currentAlertStatusFilter}`;
        }

        const response = await fetch(url, {
            headers: { 'X-Gateway-API-Key': API_KEY }
        });
        const data = await response.json();

        const tbody = document.getElementById('alert-history-table-body');
        if (!data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">尚無告警歷史</td></tr>';
            return;
        }

        tbody.innerHTML = data.data.map(alert => {
            const levelClass = `alert-level-${alert.alert_level}`;
            const statusClass = `alert-status-${alert.status}`;
            const statusText = {
                'active': '活躍',
                'acknowledged': '已確認',
                'resolved': '已解決'
            }[alert.status] || alert.status;

            return `
                <tr>
                    <td>${new Date(alert.created_at).toLocaleString('zh-TW')}</td>
                    <td>${alert.rule_name}</td>
                    <td><span class="alert-level-badge ${levelClass}">${alert.alert_level}</span></td>
                    <td>${alert.alert_message}</td>
                    <td>${alert.metric_value ? alert.metric_value.toFixed(2) : 'N/A'}</td>
                    <td><span class="alert-status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        ${alert.status === 'active' ? `
                            <button class="btn-sm btn-secondary" onclick="acknowledgeAlert('${alert.alert_id}')">確認</button>
                            <button class="btn-sm btn-primary" onclick="resolveAlert('${alert.alert_id}')">解決</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination('alert-history-pagination', data.pagination, loadAlertHistory);
    } catch (error) {
        console.error('Failed to load alert history:', error);
        showNotification('載入告警歷史失敗', 'error');
    }
}

// Load Active Alerts Count for Dashboard
async function loadActiveAlertsCount() {
    try {
        const response = await fetch(`${API_BASE}/admin/alerts/history?status=active&limit=1`, {
            headers: { 'X-Gateway-API-Key': API_KEY }
        });
        const data = await response.json();
        document.querySelector('#active-alerts .alert-count').textContent = data.pagination.total || 0;
    } catch (error) {
        console.error('Failed to load active alerts count:', error);
    }
}

// Filter Alert History
function filterAlertHistory() {
    currentAlertStatusFilter = document.getElementById('alert-status-filter').value;
    loadAlertHistory(1);
}

// Refresh Alert History
function refreshAlertHistory() {
    loadAlertHistory(currentAlertHistoryPage);
}

// Open Alert Rule Modal
function openAlertRuleModal() {
    document.getElementById('alert-rule-modal-title').textContent = '新增告警規則';
    document.getElementById('alert-rule-id').value = '';
    document.getElementById('alert-rule-name').value = '';
    document.getElementById('alert-rule-type').value = 'error_rate';
    document.getElementById('alert-rule-description').value = '';
    document.getElementById('alert-target-type').value = 'global';
    document.getElementById('alert-target-id').value = '';
    document.getElementById('alert-threshold-value').value = '';
    document.getElementById('alert-threshold-unit').value = '%';
    document.getElementById('alert-time-window').value = '300';
    document.getElementById('notify-webhook').checked = true;
    document.getElementById('notify-email').checked = false;
    document.getElementById('alert-webhook-url').value = '';
    document.getElementById('alert-email-recipients').value = '';
    document.getElementById('alert-rule-active').value = '1';
    toggleTargetId();
    document.getElementById('alert-rule-modal').style.display = 'block';
}

// Close Alert Rule Modal
function closeAlertRuleModal() {
    document.getElementById('alert-rule-modal').style.display = 'none';
}

// Toggle Target ID field
function toggleTargetId() {
    const targetType = document.getElementById('alert-target-type').value;
    const targetIdGroup = document.getElementById('target-id-group');
    targetIdGroup.style.display = targetType === 'global' ? 'none' : 'block';
}

// Edit Alert Rule
async function editAlertRule(id) {
    try {
        const response = await fetch(`${API_BASE}/admin/alerts/rules/${id}`, {
            headers: { 'X-Gateway-API-Key': API_KEY }
        });
        const rule = await response.json();

        document.getElementById('alert-rule-modal-title').textContent = '編輯告警規則';
        document.getElementById('alert-rule-id').value = rule.rule_id;
        document.getElementById('alert-rule-name').value = rule.rule_name;
        document.getElementById('alert-rule-type').value = rule.rule_type;
        document.getElementById('alert-rule-description').value = rule.description || '';
        document.getElementById('alert-target-type').value = rule.target_type;
        document.getElementById('alert-target-id').value = rule.target_id || '';
        document.getElementById('alert-threshold-value').value = rule.threshold_value;
        document.getElementById('alert-threshold-unit').value = rule.threshold_unit || '';
        document.getElementById('alert-time-window').value = rule.time_window;

        const channels = JSON.parse(rule.notification_channels || '[]');
        document.getElementById('notify-webhook').checked = channels.includes('webhook');
        document.getElementById('notify-email').checked = channels.includes('email');

        document.getElementById('alert-webhook-url').value = rule.webhook_url || '';
        document.getElementById('alert-email-recipients').value = rule.email_recipients || '';
        document.getElementById('alert-rule-active').value = rule.is_active ? '1' : '0';

        toggleTargetId();
        document.getElementById('alert-rule-modal').style.display = 'block';
    } catch (error) {
        console.error('Failed to load alert rule:', error);
        showNotification('載入告警規則失敗', 'error');
    }
}

// Save Alert Rule
async function saveAlertRule() {
    const id = document.getElementById('alert-rule-id').value;
    const channels = [];
    if (document.getElementById('notify-webhook').checked) channels.push('webhook');
    if (document.getElementById('notify-email').checked) channels.push('email');

    const data = {
        rule_name: document.getElementById('alert-rule-name').value,
        rule_type: document.getElementById('alert-rule-type').value,
        description: document.getElementById('alert-rule-description').value,
        target_type: document.getElementById('alert-target-type').value,
        target_id: document.getElementById('alert-target-id').value || null,
        threshold_value: parseFloat(document.getElementById('alert-threshold-value').value),
        threshold_unit: document.getElementById('alert-threshold-unit').value,
        time_window: parseInt(document.getElementById('alert-time-window').value),
        notification_channels: channels,
        webhook_url: document.getElementById('alert-webhook-url').value,
        email_recipients: document.getElementById('alert-email-recipients').value,
        is_active: parseInt(document.getElementById('alert-rule-active').value)
    };

    try {
        const url = id ? `${API_BASE}/admin/alerts/rules/${id}` : `${API_BASE}/admin/alerts/rules`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': API_KEY
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification(id ? '告警規則已更新' : '告警規則已創建', 'success');
            closeAlertRuleModal();
            loadAlertRules(currentAlertRulesPage);
        } else {
            const error = await response.json();
            showNotification(error.error || '儲存失敗', 'error');
        }
    } catch (error) {
        console.error('Failed to save alert rule:', error);
        showNotification('儲存告警規則失敗', 'error');
    }
}

// Delete Alert Rule
async function deleteAlertRule(id) {
    if (!confirm('確定要刪除此告警規則嗎？')) return;

    try {
        const response = await fetch(`${API_BASE}/admin/alerts/rules/${id}`, {
            method: 'DELETE',
            headers: { 'X-Gateway-API-Key': API_KEY }
        });

        if (response.ok) {
            showNotification('告警規則已刪除', 'success');
            loadAlertRules(currentAlertRulesPage);
        } else {
            showNotification('刪除失敗', 'error');
        }
    } catch (error) {
        console.error('Failed to delete alert rule:', error);
        showNotification('刪除告警規則失敗', 'error');
    }
}

// Acknowledge Alert
async function acknowledgeAlert(id) {
    try {
        const response = await fetch(`${API_BASE}/admin/alerts/history/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': API_KEY
            },
            body: JSON.stringify({ status: 'acknowledged' })
        });

        if (response.ok) {
            showNotification('告警已確認', 'success');
            loadAlertHistory(currentAlertHistoryPage);
            loadActiveAlertsCount();
        } else {
            showNotification('操作失敗', 'error');
        }
    } catch (error) {
        console.error('Failed to acknowledge alert:', error);
        showNotification('確認告警失敗', 'error');
    }
}

// Resolve Alert
async function resolveAlert(id) {
    try {
        const response = await fetch(`${API_BASE}/admin/alerts/history/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': API_KEY
            },
            body: JSON.stringify({ status: 'resolved' })
        });

        if (response.ok) {
            showNotification('告警已解決', 'success');
            loadAlertHistory(currentAlertHistoryPage);
            loadActiveAlertsCount();
        } else {
            showNotification('操作失敗', 'error');
        }
    } catch (error) {
        console.error('Failed to resolve alert:', error);
        showNotification('解決告警失敗', 'error');
    }
}

// Override switchTab to load alerts
document.addEventListener('DOMContentLoaded', function() {
    // Add alert tab handling
    const nav = document.querySelector('nav');
    if (nav) {
        nav.addEventListener('click', function(e) {
            const target = e.target.closest('[data-tab]');
            if (target && target.dataset.tab === 'alerts') {
                setTimeout(() => {
                    loadAlertRules();
                    loadAlertHistory();
                }, 100);
            }
        });
    }

    // Load active alerts count on dashboard
    loadActiveAlertsCount();
    setInterval(loadActiveAlertsCount, 60000); // Refresh every minute
});
