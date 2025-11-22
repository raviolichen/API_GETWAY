# API Gateway 功能实现总结

## ✅ 已完成的功能

### 1. XML 格式转换 ✅

#### 实现内容
- **XML → JSON 转换**：完整支持 XML 解析为 JSON 对象
- **JSON → XML 转换**：支持 JSON 对象序列化为 XML
- **字段映射**：支持在 XML 和 JSON 转换时进行字段重命名和转换
- **Handlebars 辅助函数**：新增多个实用函数

#### 新增的 Handlebars 辅助函数
```javascript
// 数学运算
add, subtract, multiply, divide

// 字符串处理
concat, trim, replace, substring

// 条件判断
eq, ne, gt, gte, lt, lte

// 日期处理
formatDate, now
```

#### 使用示例
```javascript
// XML 转 JSON
const result = await transformer.transform(xmlData, {
    source_format: 'xml',
    target_format: 'json'
});

// JSON 转 XML
const result = await transformer.transform(jsonData, {
    source_format: 'json',
    target_format: 'xml'
});
```

#### 格式转换矩阵（全部通过 ✅）

| 源格式 → 目标格式 | JSON | CSV | XML |
|------------------|------|-----|-----|
| **JSON**         | ✅   | ✅  | ✅  |
| **CSV**          | ✅   | ✅  | ✅  |
| **XML**          | ✅   | ✅  | ✅  |

**测试结果：9/9 通过**

支持的转换：
- JSON ↔ JSON（字段重组）
- JSON ↔ CSV
- JSON ↔ XML
- CSV ↔ JSON
- CSV ↔ CSV（数据转换）
- CSV ↔ XML
- XML ↔ JSON
- XML ↔ CSV
- XML ↔ XML（结构转换）

#### 测试文件
- `test/test-xml-transform.js` - XML 转换基础测试
- `test/test-xml-structure.js` - XML 数据结构检查
- `test/test-all-format-conversions.js` - **完整格式转换测试（9种组合）**
- `test/test-xml-to-csv-mapping.js` - XML到CSV映射测试

---

### 2. 告警功能 ✅

#### 数据库表结构

**告警规则表 (alert_rules)**
- `rule_id` - 规则唯一标识
- `rule_name` - 规则名称
- `rule_type` - 告警类型（error_rate, response_time, traffic_anomaly）
- `target_type` - 监控目标（global, endpoint, system）
- `threshold_value` - 阈值
- `time_window` - 时间窗口（秒）
- `notification_channels` - 通知渠道（email, webhook）
- `webhook_url` - Webhook URL
- `is_active` - 是否启用

**告警历史表 (alert_history)**
- `alert_id` - 告警唯一标识
- `rule_id` - 关联的规则 ID
- `alert_level` - 告警级别（info, warning, critical）
- `alert_message` - 告警消息
- `metric_value` - 触发时的实际指标值
- `status` - 状态（active, acknowledged, resolved）
- `notification_sent` - 是否已发送通知
- `created_at` - 创建时间

#### 默认告警规则

系统启动时会自动创建 3 条默认告警规则：

1. **全局错误率告警**
   - 类型：error_rate
   - 阈值：5%
   - 时间窗口：5 分钟
   - 通知：Webhook

2. **全局响应时间告警**
   - 类型：response_time
   - 阈值：3000ms
   - 时间窗口：5 分钟
   - 通知：Webhook

3. **流量异常告警**
   - 类型：traffic_anomaly
   - 阈值：50%
   - 时间窗口：10 分钟
   - 通知：Webhook

#### 告警检测逻辑

**错误率检测**
```
错误率 = (HTTP 状态码 >= 400 的请求数 / 总请求数) × 100%
```

**响应时间检测**
```
平均响应时间 = 时间窗口内所有请求的平均 response_time_ms
```

**流量异常检测**
```
变化率 = ((最近半段流量 - 之前半段流量) / 之前半段流量) × 100%
流量异常 = |变化率| > 阈值
```

#### 通知机制

**Webhook 通知**
- 支持发送 HTTP POST 请求到指定 URL
- 包含告警详情：规则名称、类型、消息、指标值、阈值、时间戳

**Email 通知**
- 预留接口，需配置 SMTP 服务器后启用

#### 防重复告警
- 10 分钟内相同规则不会重复触发告警
- 避免告警风暴

#### API 端点

**告警规则管理**
```
GET    /api/admin/alerts/rules          - 获取告警规则列表
GET    /api/admin/alerts/rules/:id      - 获取单条告警规则
POST   /api/admin/alerts/rules          - 创建告警规则
PUT    /api/admin/alerts/rules/:id      - 更新告警规则
DELETE /api/admin/alerts/rules/:id      - 删除告警规则
```

**告警历史管理**
```
GET   /api/admin/alerts/history         - 获取告警历史（支持筛选）
PATCH /api/admin/alerts/history/:id     - 更新告警状态（确认/解决）
GET   /api/admin/alerts/stats           - 获取告警统计数据
```

#### 使用示例

**创建告警规则**
```javascript
POST /api/admin/alerts/rules
Content-Type: application/json
X-Gateway-API-Key: your-api-key

{
  "rule_name": "API 端点错误率告警",
  "rule_type": "error_rate",
  "description": "当特定 API 错误率超过 10% 时触发",
  "target_type": "endpoint",
  "target_id": "endpoint-uuid",
  "threshold_value": 10,
  "threshold_unit": "%",
  "time_window": 300,
  "notification_channels": ["webhook"],
  "webhook_url": "https://your-webhook.com/alerts",
  "is_active": true
}
```

**获取告警历史**
```javascript
GET /api/admin/alerts/history?status=active&page=1&limit=20
X-Gateway-API-Key: your-api-key
```

**确认/解决告警**
```javascript
PATCH /api/admin/alerts/history/{alert_id}
Content-Type: application/json
X-Gateway-API-Key: your-api-key

{
  "status": "resolved"  // 或 "acknowledged"
}
```

#### 告警监控服务

**AlertMonitor 类**
- 位置：`alert-monitor.js`
- 功能：定期检查告警规则，触发告警并发送通知
- 检查间隔：60 秒（可配置）
- 自动启动：服务器启动时自动运行

**日志输出示例**
```
[AlertMonitor] 启动告警监控服务...
[AlertMonitor] 检查 3 条告警规则...
[AlertMonitor] 🚨 触发告警: 全局错误率告警 - 错误率 12.50% 超过阈值 5%
[AlertMonitor] ✓ Webhook 通知已发送: https://webhook.site/...
```

---

## 📝 测试方法

### 测试 XML 转换
```bash
node test/test-xml-transform.js
```

### 检查告警表数据
```bash
node test/check-alert-tables.js
```

### 触发测试告警
可以通过发送大量错误请求来触发错误率告警：
```bash
# 发送失败请求（假设没有权限）
for i in {1..10}; do
  curl http://localhost:3000/api/some-endpoint
done
```

---

## 🎯 核心文件清单

### XML 转换相关
- `transformer.js` - 数据转换核心引擎
- `helpers.js` - Handlebars 辅助函数（已增强）
- `test/test-xml-transform.js` - XML 测试

### 告警功能相关
- `alert-monitor.js` - 告警监控服务
- `migrations/002_add_alerts.sql` - 告警表结构
- `server.js` - 集成告警 API 和监控服务
- `test/check-alert-tables.js` - 告警数据检查

---

## 🚀 启动服务

```bash
node server.js
```

启动后会看到：
```
Database initialized successfully.
[AlertMonitor] 启动告警监控服务...
API Gateway running on http://localhost:3000
Alert monitoring service started
```

---

## 📊 后续建议

### 可选增强功能

1. **Email 通知配置**
   - 配置 SMTP 服务器
   - 实现邮件模板

2. **告警管理界面**
   - 在前端添加告警规则配置页面
   - 添加告警历史查看和筛选界面
   - 实时告警提示

3. **告警聚合**
   - 相似告警合并
   - 告警摘要报告

4. **更多告警类型**
   - 磁盘使用率告警
   - 内存使用率告警
   - 依赖服务健康检查

5. **告警级别升级**
   - 连续触发自动升级告警级别
   - 不同级别不同通知渠道

---

## ✨ 总结

**XML 转换功能**已完整实现并测试通过，支持 XML ↔ JSON 双向转换和字段映射。

**告警功能**已完整实现，包括：
- ✅ 三种告警类型（错误率、响应时间、流量异常）
- ✅ 灵活的监控目标（全局、端点、系统）
- ✅ Webhook 通知机制
- ✅ 完整的 RESTful API
- ✅ 自动监控服务
- ✅ 防重复告警机制
- ✅ 告警历史记录和状态管理

系统现在具备完善的监控和告警能力，可以及时发现和响应系统异常！
