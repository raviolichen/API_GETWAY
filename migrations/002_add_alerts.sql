-- 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
    rule_id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'error_rate', 'response_time', 'traffic_anomaly'
    description TEXT,

    -- 监控目标
    target_type TEXT NOT NULL, -- 'global', 'endpoint', 'system'
    target_id TEXT, -- endpoint_id 或 system_id (如果是 global 则为 NULL)

    -- 告警条件
    threshold_value REAL NOT NULL, -- 阈值
    threshold_unit TEXT, -- 单位，如 '%', 'ms', 'requests'
    time_window INTEGER DEFAULT 300, -- 时间窗口（秒），默认 5 分钟

    -- 通知配置
    notification_channels TEXT, -- JSON 数组: ["email", "webhook"]
    email_recipients TEXT, -- 逗号分隔的邮箱地址
    webhook_url TEXT,

    -- 状态
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 告警历史记录表
CREATE TABLE IF NOT EXISTS alert_history (
    alert_id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,

    -- 告警详情
    alert_level TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
    alert_message TEXT NOT NULL,
    metric_value REAL, -- 触发时的实际指标值
    threshold_value REAL, -- 阈值

    -- 相关信息
    endpoint_id TEXT,
    endpoint_name TEXT,
    system_id TEXT,
    system_name TEXT,

    -- 通知状态
    notification_sent INTEGER DEFAULT 0,
    notification_channels TEXT, -- 实际发送的通知渠道
    notification_error TEXT,

    -- 状态
    status TEXT DEFAULT 'active', -- 'active', 'resolved', 'acknowledged'
    resolved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rule_id) REFERENCES alert_rules(rule_id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at);

-- 插入一些默认的告警规则
INSERT INTO alert_rules (rule_id, rule_name, rule_type, description, target_type, threshold_value, threshold_unit, time_window, notification_channels, is_active)
VALUES
    ('default-error-rate', '全局錯誤率告警', 'error_rate', '當全局錯誤率超過 5% 時觸發告警', 'global', 5.0, '%', 300, '["webhook"]', 1),
    ('default-response-time', '全局回應時間告警', 'response_time', '當平均回應時間超過 3000ms 時觸發告警', 'global', 3000, 'ms', 300, '["webhook"]', 1),
    ('default-traffic', '流量異常告警', 'traffic_anomaly', '當請求量突增或驟降 50% 時觸發告警', 'global', 50, '%', 600, '["webhook"]', 1);
