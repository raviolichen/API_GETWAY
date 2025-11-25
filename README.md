# API Gateway - 資料交換平台

基於需求文件實作的 API Gateway 系統，提供統一的 API 管理、認證、流量控制、快取與資料轉換功能。

---

## 目錄 / Table of Contents

- [中文版 (Chinese Version)](#中文版-chinese-version)
- [English Version](#english-version)

---

## 中文版 (Chinese Version)

### 主要功能

#### 已實現功能

1. **授權與認證**
   - API Key 哈希加密存儲（SHA-256）
   - 安全的密鑰驗證機制
   - API Key 生成與重置功能
   - 系統級與管理級 API Key 分離

2. **系統管理**
   - 完整的 CRUD 操作（新增、編輯、刪除系統）
   - 流量限制設定（每小時請求次數）
   - IP 白名單管理（支援通配符 *）
   - 自動生成安全的 API Key

3. **流量控制**
   - 基於滑動視窗的流量限制（每小時）
   - 自動清理過期記錄
   - HTTP 響應頭顯示限流信息
   - 超限返回 429 錯誤
   - 支援系統級別與管理端點的不同限流規則

4. **快取機制**
   - GET 請求自動快取（TTL: 1小時）
   - 快取命中率追蹤（X-Cache-Status header）
   - 快取管理 API（查看統計、清除快取）

5. **IP 白名單驗證**
   - 支援單一 IP 或 IP 範圍
   - 通配符匹配（如：192.168.*.*）
   - IPv4/IPv6 支援

6. **API 端點管理**
   - 端點註冊與配置
   - 支援 Data API 和 AI 透傳 API
   - Timeout 設定
   - 啟用/停用控制

7. **OpenData 支援**
   - 無需認證的公開資料 API
   - 支援 JSON 和 CSV 格式
   - 符合 schema.gov.tw 標準

8. **AI API 透傳**
   - 支援 OpenAI/Claude/xAI 等 LLM 服務
   - Gateway Key + Target Key 雙重驗證
   - 較長的 Timeout 設定
   - 隱私保護（不記錄 Prompt 內容）

9. **資料轉換與驗證引擎**
   - 支援 JSON, CSV, XML 格式互轉
   - 欄位映射 (Mapping) 與 過濾 (Filtering)
   - 強大的資料驗證 (Schema Validation)
   - 整合 schema.gov.tw 定義
   - 支援 Handlebars 模板轉換
   - 驗證模式：拒絕 (Reject)、過濾 (Filter)、警告 (Warn)
   - 管線式轉換架構（Pipeline）
   - 支援多種陣列展開策略

10. **告警與監控系統**
    - 自動告警監控（每5分鐘檢查）
    - 支援多種監控指標（請求數量、錯誤率、回應時間）
    - 可自訂告警條件與閾值
    - 告警觸發歷史記錄
    - 視覺化告警儀表板

11. **日誌與監控**
    - 請求日誌記錄
    - 回應時間追蹤
    - 系統統計資訊
    - API 使用統計

12. **管理後台**
    - 現代化 Web 界面
    - 儀表板概覽
    - API 端點管理
    - 系統管理
    - 資料轉換規則管理
    - 告警規則管理
    - 日誌查詢

13. **測試工具**
    - OpenData API 測試
    - AI API 透傳測試
    - 通用 API 測試
    - 流量限制測試
    - 轉換規則預覽與測試

### 技術架構

#### 後端
- **框架**: Express.js (Node.js)
- **資料庫**: SQLite3
- **加密**: crypto (SHA-256)
- **資料處理**: csv-stringify, xml2js
- **模板引擎**: Handlebars
- **任務調度**: 自訂定時器（告警監控）

#### 前端
- **純 HTML/CSS/JavaScript**
- **無框架依賴**
- **響應式設計**

### 專案結構

```
API_GW/
├── 核心程式
│   ├── server.js              主伺服器 (79K)
│   ├── transformer.js         轉換引擎核心 (25K)
│   ├── helpers.js            Handlebars helpers (5.1K)
│   ├── database.js           資料庫操作 (5.9K)
│   ├── alert-monitor.js      告警監控 (13K)
│   └── run-migration.js      資料庫遷移
│
├── 技術文件
│   ├── README.md                         專案說明
│   ├── IMPLEMENTATION_SUMMARY.md         實作總結
│   ├── API_TEST_TOOL_GUIDE.md           API 測試工具指南
│   ├── ALERT_FRONTEND_GUIDE.md          告警前端指南
│   ├── 轉換引擎HANDLEBARS_用法導覽.md    Handlebars 技術手冊
│   ├── C#_轉移參考指南.md                C# 遷移指南
│   └── API_Gateway功能需求文件.docx      需求文件
│
├── 測試檔案 (test/)
│   ├── test-integration-full.js         整合測試
│   ├── test-alerts.js                   告警測試
│   ├── setup-employee-api.js            測試環境設定
│   └── 其他測試腳本
│
├── 資料庫
│   ├── database.sqlite                  SQLite 資料庫 (200K)
│   └── migrations/                      資料庫遷移腳本
│       ├── 001_initial.sql
│       ├── 002_add_alerts.sql
│       └── 003_add_direction_to_transformations.sql
│
├── 前端 (public/)
│   ├── index.html                       管理主頁
│   ├── app.js                          主應用程式
│   ├── transformation.js               轉換規則管理
│   ├── alerts.js                       告警管理
│   ├── test.html                       測試工具
│   └── style.css                       樣式表
│
└── 設定檔
    ├── package.json
    └── package-lock.json
```

### 快速開始

#### 1. 安裝依賴
```bash
npm install
```

#### 2. 資料庫遷移（首次執行）
```bash
node run-migration.js
```

#### 3. 啟動服務
```bash
node server.js
```

服務將在 http://localhost:3000 啟動

#### 4. 訪問管理後台
開啟瀏覽器訪問: http://localhost:3000

預設管理員密鑰: `admin-key-12345`

### API 使用範例

#### 1. OpenData API（無需認證）
```bash
# JSON 格式
curl http://localhost:3000/opendata/health-centers

# CSV 格式
curl http://localhost:3000/opendata/health-centers?format=csv
```

#### 2. 管理 API（需要認證）
```bash
# 獲取系統統計
curl -H "X-Gateway-API-Key: admin-key-12345" \
     http://localhost:3000/api/admin/stats

# 查看告警規則
curl -H "X-Gateway-API-Key: admin-key-12345" \
     http://localhost:3000/api/admin/alerts
```

#### 3. 資料轉換 API
```bash
# 使用轉換規則
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"key":[1,2,3],"name":["Alice","Bob"]}' \
     http://localhost:3000/api/transform/rule-name
```

#### 4. AI API 透傳
```bash
curl -X POST \
     -H "X-Gateway-API-Key: your-gateway-key" \
     -H "X-Target-API-Key: your-openai-key" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}' \
     http://localhost:3000/external/openai/chat
```

### 資料庫結構

#### 核心資料表
- `api_endpoints` - API 端點配置
- `api_keys` - API Key 管理（新架構）
- `api_requests` - API 請求記錄（新架構）
- `systems` - 系統註冊與認證（舊架構）
- `rate_limit_tracking` - 流量限制追蹤
- `request_logs` - 請求日誌
- `transformation_rules` - 資料轉換與驗證規則
- `system_permissions` - 系統權限設定
- `alerts` - 告警規則
- `alert_triggers` - 告警觸發記錄

### 資料轉換功能

#### 支援的轉換策略

系統內建多種陣列展開策略範例：

1. **策略1：以最長陣列為準（補 null）**
   - 適用場景：需要保留所有資料，缺失值用 null 填充

2. **策略2：只取最短陣列長度**
   - 適用場景：只處理完整的資料記錄

3. **策略3：展開 + 過濾不完整資料**
   - 適用場景：展開後使用過濾條件移除不完整記錄

4. **策略4：巢狀結構展開**
   - 適用場景：將巢狀陣列展開為平面記錄

5. **策略5：處理空陣列和邊界情況**
   - 適用場景：處理空陣列或特殊邊界條件

#### Handlebars Helpers

系統提供完整的 Handlebars helper 函數：

**字串處理**: uppercase, lowercase, concat, trim, replace, substring
**數學運算**: add, subtract, multiply, divide, math
**條件判斷**: eq, ne, gt, gte, lt, lte
**日期處理**: formatDate, now, dateFormat
**JSON 處理**: json
**其他**: default, lookup

詳細使用方法請參考：`轉換引擎HANDLEBARS_用法導覽.md`

### 告警系統

#### 支援的監控指標
- `request_count` - 請求數量
- `error_rate` - 錯誤率（百分比）
- `response_time` - 平均回應時間

#### 告警條件
- `greater_than` - 大於閾值時觸發
- `less_than` - 小於閾值時觸發

#### 時間窗口
可設定監控時間窗口（單位：分鐘），如最近 5 分鐘、60 分鐘等。

### 技術文件

#### 中文文件
- **轉換引擎HANDLEBARS_用法導覽.md** - 完整的 Handlebars 使用指南
  - 基本語法
  - 內建 Helpers 說明
  - 陣列操作策略
  - 常見錯誤與解決方案
  - 實戰範例

- **C#_轉移參考指南.md** - C# 遷移完整指南
  - 核心套件對應表
  - 程式碼範例
  - 資料庫層設計
  - API 服務層實作
  - 效能最佳化建議

#### 英文文件
- **ALERT_FRONTEND_GUIDE.md** - 告警前端開發指南
- **API_TEST_TOOL_GUIDE.md** - API 測試工具使用指南
- **IMPLEMENTATION_SUMMARY.md** - 實作總結

### 後續開發建議

#### 已完成
- 基本 API Gateway 功能
- 流量控制與認證
- 資料轉換引擎
- 告警與監控系統
- 管理後台介面

#### 高優先級
1. **Redis 快取整合**
   - 替代記憶體快取
   - 提升效能與可擴展性

2. **更多資料格式支援**
   - Excel ↔ JSON
   - 更多文件格式解析 (Word/PDF)

3. **權限控制管理**
   - 細粒度權限設定
   - 角色與權限群組

#### 中優先級
4. **告警通知整合**
   - Email 通知
   - Webhook 整合
   - Slack/Teams 通知

5. **效能優化**
   - 資料庫連接池
   - 查詢優化
   - 負載平衡

---

## English Version

### Overview

An API Gateway system implemented based on requirements, providing unified API management, authentication, rate limiting, caching, and data transformation capabilities.

### Key Features

#### Implemented Features

1. **Authentication & Authorization**
   - SHA-256 hashed API Key storage
   - Secure key validation mechanism
   - API Key generation and reset functionality
   - Separation of system-level and admin-level API Keys

2. **System Management**
   - Full CRUD operations (Create, Read, Update, Delete systems)
   - Rate limiting configuration (requests per hour)
   - IP Whitelist management (supports wildcards *)
   - Automatic secure API Key generation

3. **Traffic Control**
   - Sliding window based rate limiting
   - Automatic cleanup of expired records
   - Rate limit headers in HTTP responses
   - 429 Too Many Requests error handling
   - Different rate limits for system and admin endpoints

4. **Caching Mechanism**
   - Automatic caching for GET requests (TTL: 1 hour)
   - Cache hit rate tracking (X-Cache-Status header)
   - Cache management API (view stats, clear cache)

5. **IP Whitelisting**
   - Support for single IP or IP ranges
   - Wildcard matching (e.g., 192.168.*.*)
   - IPv4/IPv6 support

6. **API Endpoint Management**
   - Endpoint registration and configuration
   - Support for Data APIs and AI Passthrough APIs
   - Timeout settings
   - Enable/Disable control

7. **OpenData Support**
   - Public data APIs without authentication
   - Support for JSON and CSV formats
   - Compliant with schema.gov.tw standards

8. **AI API Passthrough**
   - Support for LLM services like OpenAI/Claude/xAI
   - Dual authentication (Gateway Key + Target Key)
   - Extended timeout settings
   - Privacy protection (Prompt content not logged)

9. **Data Transformation & Validation Engine**
   - Conversion between JSON, CSV, and XML formats
   - Field Mapping and Filtering
   - Robust Data Validation (Schema Validation)
   - Integration with schema.gov.tw definitions
   - Handlebars template support
   - Validation Modes: Reject, Filter, Warn
   - Pipeline-based transformation architecture
   - Multiple array expansion strategies

10. **Alert & Monitoring System**
    - Automatic alert monitoring (every 5 minutes)
    - Multiple monitoring metrics (request count, error rate, response time)
    - Customizable alert conditions and thresholds
    - Alert trigger history
    - Visual alert dashboard

11. **Logging & Monitoring**
    - Request logging
    - Response time tracking
    - System statistics
    - API usage statistics

12. **Admin Dashboard**
    - Modern Web Interface
    - Dashboard Overview
    - API Endpoint Management
    - System Management
    - Transformation Rule Management
    - Alert Rule Management
    - Log Querying

13. **Test Tools**
    - OpenData API Testing
    - AI API Passthrough Testing
    - General API Testing
    - Rate Limit Testing
    - Transformation Rule Preview & Testing

### Technical Architecture

#### Backend
- **Framework**: Express.js (Node.js)
- **Database**: SQLite3
- **Encryption**: crypto (SHA-256)
- **Data Processing**: csv-stringify, xml2js
- **Template Engine**: Handlebars
- **Task Scheduling**: Custom timers (alert monitoring)

#### Frontend
- **Pure HTML/CSS/JavaScript**
- **No Framework Dependencies**
- **Responsive Design**

### Project Structure

```
API_GW/
├── Core Programs
│   ├── server.js              Main server (79K)
│   ├── transformer.js         Transformation engine (25K)
│   ├── helpers.js            Handlebars helpers (5.1K)
│   ├── database.js           Database operations (5.9K)
│   ├── alert-monitor.js      Alert monitoring (13K)
│   └── run-migration.js      Database migration
│
├── Documentation
│   ├── README.md                         Project overview
│   ├── IMPLEMENTATION_SUMMARY.md         Implementation summary
│   ├── API_TEST_TOOL_GUIDE.md           API testing guide
│   ├── ALERT_FRONTEND_GUIDE.md          Alert frontend guide
│   ├── 轉換引擎HANDLEBARS_用法導覽.md    Handlebars manual (Chinese)
│   ├── C#_轉移參考指南.md                C# migration guide (Chinese)
│   └── API_Gateway功能需求文件.docx      Requirements doc
│
├── Tests (test/)
│   ├── test-integration-full.js         Integration tests
│   ├── test-alerts.js                   Alert tests
│   ├── setup-employee-api.js            Test setup
│   └── Other test scripts
│
├── Database
│   ├── database.sqlite                  SQLite database (200K)
│   └── migrations/                      Migration scripts
│       ├── 001_initial.sql
│       ├── 002_add_alerts.sql
│       └── 003_add_direction_to_transformations.sql
│
├── Frontend (public/)
│   ├── index.html                       Admin home
│   ├── app.js                          Main application
│   ├── transformation.js               Transformation management
│   ├── alerts.js                       Alert management
│   ├── test.html                       Testing tool
│   └── style.css                       Styles
│
└── Configuration
    ├── package.json
    └── package-lock.json
```

### Quick Start

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Database Migration (First Run)
```bash
node run-migration.js
```

#### 3. Start Server
```bash
node server.js
```

The server will start at http://localhost:3000

#### 4. Access Admin Dashboard
Open browser and visit: http://localhost:3000

Default Admin Key: `admin-key-12345`

### API Usage Examples

#### 1. OpenData API (No Auth)
```bash
# JSON Format
curl http://localhost:3000/opendata/health-centers

# CSV Format
curl http://localhost:3000/opendata/health-centers?format=csv
```

#### 2. Admin API (Auth Required)
```bash
# Get System Stats
curl -H "X-Gateway-API-Key: admin-key-12345" \
     http://localhost:3000/api/admin/stats

# View Alert Rules
curl -H "X-Gateway-API-Key: admin-key-12345" \
     http://localhost:3000/api/admin/alerts
```

#### 3. Data Transformation API
```bash
# Use transformation rule
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"key":[1,2,3],"name":["Alice","Bob"]}' \
     http://localhost:3000/api/transform/rule-name
```

#### 4. AI API Passthrough
```bash
curl -X POST \
     -H "X-Gateway-API-Key: your-gateway-key" \
     -H "X-Target-API-Key: your-openai-key" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}' \
     http://localhost:3000/external/openai/chat
```

### Database Structure

#### Core Tables
- `api_endpoints` - API Endpoint Configuration
- `api_keys` - API Key Management (New Architecture)
- `api_requests` - API Request Records (New Architecture)
- `systems` - System Registration & Authentication (Legacy)
- `rate_limit_tracking` - Rate Limit Tracking
- `request_logs` - Request Logs
- `transformation_rules` - Data Transformation & Validation Rules
- `system_permissions` - System Permission Settings
- `alerts` - Alert Rules
- `alert_triggers` - Alert Trigger History

### Data Transformation Features

#### Supported Transformation Strategies

The system includes built-in array expansion strategy examples:

1. **Strategy 1: Use longest array (pad with null)**
   - Use case: Preserve all data, fill missing values with null

2. **Strategy 2: Use shortest array length**
   - Use case: Only process complete data records

3. **Strategy 3: Expand + Filter incomplete data**
   - Use case: Expand then filter out incomplete records

4. **Strategy 4: Nested structure expansion**
   - Use case: Flatten nested arrays into flat records

5. **Strategy 5: Handle empty arrays and edge cases**
   - Use case: Handle empty arrays or special edge conditions

#### Handlebars Helpers

Complete set of Handlebars helper functions:

**String Operations**: uppercase, lowercase, concat, trim, replace, substring
**Math Operations**: add, subtract, multiply, divide, math
**Comparisons**: eq, ne, gt, gte, lt, lte
**Date Operations**: formatDate, now, dateFormat
**JSON Processing**: json
**Other**: default, lookup

For detailed usage, see: `轉換引擎HANDLEBARS_用法導覽.md` (Chinese)

### Alert System

#### Supported Metrics
- `request_count` - Request count
- `error_rate` - Error rate (percentage)
- `response_time` - Average response time

#### Alert Conditions
- `greater_than` - Trigger when exceeds threshold
- `less_than` - Trigger when below threshold

#### Time Window
Configurable monitoring time window (in minutes), e.g., last 5 minutes, 60 minutes, etc.

### Technical Documentation

#### Chinese Documentation
- **轉換引擎HANDLEBARS_用法導覽.md** - Complete Handlebars guide
  - Basic syntax
  - Built-in Helpers
  - Array operation strategies
  - Common errors and solutions
  - Practical examples

- **C#_轉移參考指南.md** - C# migration guide
  - Package mapping
  - Code examples
  - Database layer design
  - API service layer implementation
  - Performance optimization

#### English Documentation
- **ALERT_FRONTEND_GUIDE.md** - Alert frontend development guide
- **API_TEST_TOOL_GUIDE.md** - API testing tool guide
- **IMPLEMENTATION_SUMMARY.md** - Implementation summary

### Roadmap

#### Completed
- Basic API Gateway functionality
- Traffic control and authentication
- Data transformation engine
- Alert and monitoring system
- Admin dashboard interface

#### High Priority
1. **Redis Cache Integration**
   - Replace in-memory cache
   - Improve performance and scalability

2. **More Data Format Support**
   - Excel ↔ JSON
   - Document parsing (Word/PDF)

3. **Access Control Management**
   - Fine-grained permission settings
   - Roles and permission groups

#### Medium Priority
4. **Alert Notification Integration**
   - Email notifications
   - Webhook integration
   - Slack/Teams notifications

5. **Performance Optimization**
   - Database connection pooling
   - Query optimization
   - Load balancing

---

## License

CC BY-NC

## Contact

For questions or suggestions, please contact the system administrator.
