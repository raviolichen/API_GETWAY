const BASE_URL = 'http://localhost:3000';
const API_KEY = 'gw_c4e45c97ffb78c69b5a1e2a17fcca595655baafbaff107144e52c95247c86c95'; // 使用你的测试 API Key

async function testAlerts() {
    console.log('=== 告警功能测试 ===\n');

    // 1. 获取告警规则列表
    console.log('1. 获取告警规则列表');
    try {
        const response = await fetch(`${BASE_URL}/api/admin/alerts/rules`, {
            headers: {
                'X-Gateway-API-Key': API_KEY
            }
        });
        const data = await response.json();
        console.log(`✓ 成功获取 ${data.data.length} 条告警规则`);
        console.log('规则列表:', data.data.map(r => ({ id: r.rule_id, name: r.rule_name, type: r.rule_type })));
    } catch (err) {
        console.error('✗ 失败:', err.message);
    }

    console.log('\n2. 创建新的告警规则');
    try {
        const newRule = {
            rule_name: '测试错误率告警',
            rule_type: 'error_rate',
            description: '这是一个测试告警规则',
            target_type: 'global',
            threshold_value: 10,
            threshold_unit: '%',
            time_window: 300,
            notification_channels: ['webhook'],
            webhook_url: 'https://webhook.site/unique-id',
            is_active: true
        };

        const response = await fetch(`${BASE_URL}/api/admin/alerts/rules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gateway-API-Key': API_KEY
            },
            body: JSON.stringify(newRule)
        });
        const data = await response.json();
        console.log('✓ 成功创建告警规则:', data);
    } catch (err) {
        console.error('✗ 失败:', err.message);
    }

    console.log('\n3. 获取告警历史');
    try {
        const response = await fetch(`${BASE_URL}/api/admin/alerts/history`, {
            headers: {
                'X-Gateway-API-Key': API_KEY
            }
        });
        const data = await response.json();
        console.log(`✓ 成功获取告警历史，共 ${data.pagination.total} 条`);
        if (data.data.length > 0) {
            console.log('最近的告警:', data.data.slice(0, 3).map(a => ({
                rule: a.rule_name,
                message: a.alert_message,
                time: a.created_at
            })));
        }
    } catch (err) {
        console.error('✗ 失败:', err.message);
    }

    console.log('\n4. 获取告警统计');
    try {
        const response = await fetch(`${BASE_URL}/api/admin/alerts/stats?period=today`, {
            headers: {
                'X-Gateway-API-Key': API_KEY
            }
        });
        const data = await response.json();
        console.log('✓ 告警统计:', data.stats);
    } catch (err) {
        console.error('✗ 失败:', err.message);
    }

    console.log('\n=== 测试完成 ===');
}

// 等待服务器启动
setTimeout(() => {
    testAlerts().catch(console.error);
}, 2000);
