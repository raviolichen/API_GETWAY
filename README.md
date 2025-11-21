# API Gateway - 資料交換平台

基於需求文件實作的 API Gateway 系統，提供統一的 API 管理、認證、流量控制、快取與資料轉換功能。

---

## 📖 目錄 / Table of Contents

- [中文版 (Chinese Version)](#-中文版-chinese-version)
- [English Version](#-english-version)

---

## 🇹🇼 中文版 (Chinese Version)

### 主要功能

#### ✅ 已實現功能

1. **授權與認證**
   - API Key 哈希加密存儲（SHA-256）
   - 安全的密鑰驗證機制
   - API Key 生成與重置功能

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

10. **日誌與監控**
    - 請求日誌記錄
    - 響應時間追蹤
    - 系統統計資訊

11. **管理後台**
    - 現代化 Web 界面
    - 儀表板概覽
    - API 端點管理
    - 系統管理
    - 資料轉換規則管理
    - 日誌查詢

12. **測試工具**
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
- **資料處理**: csv-parse, xml2js, handlebars

#### 前端
- **純 HTML/CSS/JavaScript**
- **無框架依賴**
- **響應式設計**

### 快速開始

#### 1. 安裝依賴
```bash
npm install
```

#### 2. 啟動服務
```bash
node server.js
```

服務將在 http://localhost:3000 啟動

#### 3. 訪問管理後台
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
```

#### 3. AI API 透傳
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
- `systems` - 系統註冊與認證
- `rate_limit_tracking` - 流量限制追蹤
- `request_logs` - 請求日誌
- `transformation_rules` - 資料轉換與驗證規則
- `system_permissions` - 系統權限設定

### 後續開發建議

#### 高優先級
1. **更多資料格式支援**
   - Excel ↔ JSON
   - 更多文件格式解析 (Word/PDF)

2. **權限控制管理**
   - 細粒度權限設定
   - 角色與權限群組

#### 中優先級
3. **告警功能**
   - Email 通知
   - Webhook 整合
   - 異常檢測

4. **效能優化**
   - Redis 快取
   - 資料庫連接池

---

## 🇺🇸 English Version

### Overview

An API Gateway system implemented based on requirements, providing unified API management, authentication, rate limiting, caching, and data transformation capabilities for the Yunlin County Health Bureau.

### Key Features

#### ✅ Implemented Features

1. **Authentication & Authorization**
   - SHA-256 hashed API Key storage
   - Secure key validation mechanism
   - API Key generation and reset functionality

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

10. **Logging & Monitoring**
    - Request logging
    - Response time tracking
    - System statistics

11. **Admin Dashboard**
    - Modern Web Interface
    - Dashboard Overview
    - API Endpoint Management
    - System Management
    - Transformation Rule Management
    - Log Querying

12. **Test Tools**
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
- **Data Processing**: csv-parse, xml2js, handlebars

#### Frontend
- **Pure HTML/CSS/JavaScript**
- **No Framework Dependencies**
- **Responsive Design**

### Quick Start

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Start Server
```bash
node server.js
```

The server will start at http://localhost:3000

#### 3. Access Admin Dashboard
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
```

#### 3. AI API Passthrough
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
- `systems` - System Registration & Authentication
- `rate_limit_tracking` - Rate Limit Tracking
- `request_logs` - Request Logs
- `transformation_rules` - Data Transformation & Validation Rules
- `system_permissions` - System Permission Settings

### Roadmap

#### High Priority
1. **More Data Format Support**
   - Excel ↔ JSON
   - Document parsing (Word/PDF)

2. **Access Control Management**
   - Fine-grained permission settings
   - Roles and permission groups

#### Medium Priority
3. **Alerting System**
   - Email Notifications
   - Webhook Integration
   - Anomaly Detection

4. **Performance Optimization**
   - Redis Caching
   - Database Connection Pooling

---

## License

This project is for internal use by the Yunlin County Health Bureau.

## Contact

For questions or suggestions, please contact the system administrator.
