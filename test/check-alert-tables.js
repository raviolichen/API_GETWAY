const db = require('../database');

console.log('=== 检查告警表数据 ===\n');

// 查询告警规则
db.all("SELECT * FROM alert_rules", (err, rules) => {
    if (err) {
        console.error('查询告警规则失败:', err);
        return;
    }

    console.log(`告警规则表: ${rules.length} 条记录`);
    rules.forEach((rule, i) => {
        console.log(`${i + 1}. ${rule.rule_name} (${rule.rule_type})`);
        console.log(`   - 阈值: ${rule.threshold_value}${rule.threshold_unit}`);
        console.log(`   - 目标: ${rule.target_type}`);
        console.log(`   - 状态: ${rule.is_active ? '启用' : '禁用'}`);
        console.log(`   - 通知渠道: ${rule.notification_channels}`);
    });

    // 查询告警历史
    db.all("SELECT * FROM alert_history ORDER BY created_at DESC LIMIT 10", (err, alerts) => {
        if (err) {
            console.error('查询告警历史失败:', err);
            db.close();
            return;
        }

        console.log(`\n告警历史表: ${alerts.length} 条记录`);
        alerts.forEach((alert, i) => {
            console.log(`${i + 1}. ${alert.rule_name}`);
            console.log(`   - 消息: ${alert.alert_message}`);
            console.log(`   - 级别: ${alert.alert_level}`);
            console.log(`   - 指标值: ${alert.metric_value}`);
            console.log(`   - 状态: ${alert.status}`);
            console.log(`   - 时间: ${alert.created_at}`);
        });

        db.close();
    });
});
