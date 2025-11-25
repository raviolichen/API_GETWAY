const db = require('./database');
const crypto = require('crypto');

class AlertMonitor {
    constructor() {
        this.checkInterval = 60000; // 每分鐘檢查一次
        this.intervalId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('[AlertMonitor] 已在運行中');
            return;
        }

        console.log('[AlertMonitor] 啟動告警監控服務...');
        this.isRunning = true;

        // 立即執行一次檢查
        this.checkAllRules();

        // 定期檢查
        this.intervalId = setInterval(() => {
            this.checkAllRules();
        }, this.checkInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[AlertMonitor] 告警監控服務已停止');
    }

    async checkAllRules() {
        try {
            const rules = await this.getActiveRules();
            console.log(`[AlertMonitor] 檢查 ${rules.length} 條告警規則...`);

            for (const rule of rules) {
                await this.checkRule(rule);
            }
        } catch (err) {
            console.error('[AlertMonitor] 檢查告警規則時出錯:', err);
        }
    }

    getActiveRules() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM alert_rules WHERE is_active = 1', (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    async checkRule(rule) {
        try {
            let metricValue = null;
            let shouldAlert = false;
            let alertMessage = '';

            switch (rule.rule_type) {
                case 'error_rate':
                    const errorRate = await this.calculateErrorRate(rule);
                    metricValue = errorRate;
                    shouldAlert = errorRate > rule.threshold_value;
                    alertMessage = `錯誤率 ${errorRate.toFixed(2)}% 超過閾值 ${rule.threshold_value}%`;
                    break;

                case 'response_time':
                    const avgResponseTime = await this.calculateAvgResponseTime(rule);
                    metricValue = avgResponseTime;
                    shouldAlert = avgResponseTime > rule.threshold_value;
                    alertMessage = `平均響應時間 ${avgResponseTime.toFixed(0)}ms 超過閾值 ${rule.threshold_value}ms`;
                    break;

                case 'traffic_anomaly':
                    const trafficAnomaly = await this.detectTrafficAnomaly(rule);
                    metricValue = trafficAnomaly.changePercent;
                    shouldAlert = trafficAnomaly.isAnomalous;
                    alertMessage = `流量${trafficAnomaly.changePercent > 0 ? '突增' : '驟降'} ${Math.abs(trafficAnomaly.changePercent).toFixed(1)}% 超過閾值 ${rule.threshold_value}%`;
                    break;

                default:
                    console.warn(`[AlertMonitor] 未知的告警類型: ${rule.rule_type}`);
                    return;
            }

            if (shouldAlert) {
                await this.triggerAlert(rule, metricValue, alertMessage);
            }
        } catch (err) {
            console.error(`[AlertMonitor] 檢查規則 ${rule.rule_name} 時出錯:`, err);
        }
    }

    async calculateErrorRate(rule) {
        return new Promise((resolve, reject) => {
            const timeWindowSeconds = rule.time_window || 300;
            const query = `
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN http_status >= 400 THEN 1 ELSE 0 END) as errors
                FROM request_logs
                WHERE created_at >= datetime('now', '-${timeWindowSeconds} seconds')
                ${rule.target_type === 'endpoint' ? 'AND endpoint_id = ?' : ''}
                ${rule.target_type === 'system' ? 'AND system_id = ?' : ''}
            `;

            const params = [];
            if (rule.target_type === 'endpoint' || rule.target_type === 'system') {
                params.push(rule.target_id);
            }

            db.get(query, params, (err, row) => {
                if (err) return reject(err);
                if (!row || row.total === 0) return resolve(0);
                const errorRate = (row.errors / row.total) * 100;
                resolve(errorRate);
            });
        });
    }

    async calculateAvgResponseTime(rule) {
        return new Promise((resolve, reject) => {
            const timeWindowSeconds = rule.time_window || 300;
            const query = `
                SELECT AVG(response_time_ms) as avg_time
                FROM request_logs
                WHERE created_at >= datetime('now', '-${timeWindowSeconds} seconds')
                ${rule.target_type === 'endpoint' ? 'AND endpoint_id = ?' : ''}
                ${rule.target_type === 'system' ? 'AND system_id = ?' : ''}
            `;

            const params = [];
            if (rule.target_type === 'endpoint' || rule.target_type === 'system') {
                params.push(rule.target_id);
            }

            db.get(query, params, (err, row) => {
                if (err) return reject(err);
                resolve(row?.avg_time || 0);
            });
        });
    }

    async detectTrafficAnomaly(rule) {
        return new Promise((resolve, reject) => {
            const timeWindowSeconds = rule.time_window || 600;
            const halfWindow = Math.floor(timeWindowSeconds / 2);

            // 獲取前半段和後半段的請求數
            const query = `
                SELECT
                    SUM(CASE WHEN created_at >= datetime('now', '-${halfWindow} seconds') THEN 1 ELSE 0 END) as recent_count,
                    SUM(CASE WHEN created_at >= datetime('now', '-${timeWindowSeconds} seconds') AND created_at < datetime('now', '-${halfWindow} seconds') THEN 1 ELSE 0 END) as previous_count
                FROM request_logs
                WHERE created_at >= datetime('now', '-${timeWindowSeconds} seconds')
                ${rule.target_type === 'endpoint' ? 'AND endpoint_id = ?' : ''}
                ${rule.target_type === 'system' ? 'AND system_id = ?' : ''}
            `;

            const params = [];
            if (rule.target_type === 'endpoint' || rule.target_type === 'system') {
                params.push(rule.target_id);
            }

            db.get(query, params, (err, row) => {
                if (err) return reject(err);

                const recentCount = row?.recent_count || 0;
                const previousCount = row?.previous_count || 0;

                // 避免除以零
                if (previousCount === 0) {
                    return resolve({ isAnomalous: false, changePercent: 0 });
                }

                const changePercent = ((recentCount - previousCount) / previousCount) * 100;
                const isAnomalous = Math.abs(changePercent) > rule.threshold_value;

                resolve({ isAnomalous, changePercent });
            });
        });
    }

    async triggerAlert(rule, metricValue, alertMessage) {
        // 檢查是否最近已經觸發過相同告警（避免重複告警）
        const recentAlert = await this.checkRecentAlert(rule.rule_id, 600); // 10 分鐘內

        if (recentAlert) {
            console.log(`[AlertMonitor] 規則 "${rule.rule_name}" 最近已觸發告警，跳過`);
            return;
        }

        console.log(`[AlertMonitor] 🚨 觸發告警: ${rule.rule_name} - ${alertMessage}`);

        const alertId = crypto.randomUUID();
        const notificationChannels = this.parseNotificationChannels(rule.notification_channels);

        // 記錄告警歷史
        await this.recordAlert({
            alert_id: alertId,
            rule_id: rule.rule_id,
            rule_name: rule.rule_name,
            alert_level: this.determineAlertLevel(rule.rule_type, metricValue, rule.threshold_value),
            alert_message: alertMessage,
            metric_value: metricValue,
            threshold_value: rule.threshold_value,
            notification_channels: JSON.stringify(notificationChannels)
        });

        // 發送通知
        await this.sendNotifications(rule, alertMessage, metricValue, notificationChannels);
    }

    checkRecentAlert(ruleId, withinSeconds) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM alert_history
                 WHERE rule_id = ?
                 AND created_at >= datetime('now', '-${withinSeconds} seconds')
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [ruleId],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
    }

    recordAlert(alertData) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO alert_history (
                    alert_id, rule_id, rule_name, alert_level, alert_message,
                    metric_value, threshold_value, notification_channels
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    alertData.alert_id,
                    alertData.rule_id,
                    alertData.rule_name,
                    alertData.alert_level,
                    alertData.alert_message,
                    alertData.metric_value,
                    alertData.threshold_value,
                    alertData.notification_channels
                ],
                (err) => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
    }

    async sendNotifications(rule, message, metricValue, channels) {
        const results = [];

        for (const channel of channels) {
            try {
                if (channel === 'webhook' && rule.webhook_url) {
                    await this.sendWebhook(rule.webhook_url, {
                        rule_name: rule.rule_name,
                        rule_type: rule.rule_type,
                        message: message,
                        metric_value: metricValue,
                        threshold_value: rule.threshold_value,
                        timestamp: new Date().toISOString()
                    });
                    results.push({ channel: 'webhook', success: true });
                } else if (channel === 'email' && rule.email_recipients) {
                    // 郵件通知實現（需要配置 SMTP）
                    console.log(`[AlertMonitor] 郵件通知功能尚未配置: ${rule.email_recipients}`);
                    results.push({ channel: 'email', success: false, error: '未配置' });
                }
            } catch (err) {
                console.error(`[AlertMonitor] 發送 ${channel} 通知失敗:`, err.message);
                results.push({ channel, success: false, error: err.message });
            }
        }

        return results;
    }

    async sendWebhook(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook 請求失敗: ${response.status} ${response.statusText}`);
        }

        console.log(`[AlertMonitor] ✓ Webhook 通知已發送: ${url}`);
    }

    parseNotificationChannels(channelsJson) {
        try {
            if (!channelsJson) return [];
            return JSON.parse(channelsJson);
        } catch (err) {
            return [];
        }
    }

    determineAlertLevel(ruleType, metricValue, threshold) {
        // 簡單的告警級別判斷
        if (ruleType === 'error_rate') {
            if (metricValue > threshold * 2) return 'critical';
            if (metricValue > threshold * 1.5) return 'warning';
            return 'info';
        }

        if (ruleType === 'response_time') {
            if (metricValue > threshold * 2) return 'critical';
            if (metricValue > threshold * 1.5) return 'warning';
            return 'info';
        }

        return 'warning';
    }
}

module.exports = AlertMonitor;
