# API Gateway 測試工具使用指南

## 簡介

全新升級的 API Gateway 測試工具提供了專業級的 API 測試功能，讓你能夠輕鬆測試、調試和驗證所有 API 端點。

## 訪問方式

1. 啟動服務器：`node server.js`
2. 在瀏覽器中訪問：http://localhost:3000/test.html
3. 或從管理後台點擊「API 測試工具」連結

## 主要功能

### 📊 1. HTTP Client（主要測試工具）

專業級的 HTTP 請求測試界面，類似 Postman。

#### 功能特點：

**URL 配置**
- 支援所有 HTTP 方法：GET、POST、PUT、DELETE、PATCH
- 智能 URL 輸入，支援環境變數替換（如 `{{baseUrl}}/api/admin/stats`）
- 一鍵發送請求

**Query Parameters**
- 動態添加/刪除參數
- 鍵值對管理
- 自動 URL 編碼
- 可摺疊區域，保持界面整潔

**Headers 管理**
- 自定義任意 HTTP Headers
- 預設常用 Headers（如 X-Gateway-API-Key）
- 支援環境變數（如 `{{adminKey}}`）
- 動態添加/移除

**Request Body**
- 支援三種模式：
  - **JSON**：語法高亮，格式化編輯
  - **Raw**：原始文本輸入
  - **None**：無 Body（GET 請求）
- 自動設置 Content-Type

**Response 顯示**
- **狀態資訊**：
  - HTTP 狀態碼（成功/失敗顏色標示）
  - 響應時間（毫秒）
  - 回應大小（字節/KB）

- **三個標籤頁**：
  - **Body**：格式化的回應內容（JSON 自動美化）
  - **Headers**：完整的回應 Headers
  - **Raw**：原始回應內容

**快速操作**
- 儲存為模板
- 清空請求
- 匯出回應（JSON 格式）

#### 使用示例：

```javascript
// 測試獲取統計資料
Method: GET
URL: {{baseUrl}}/api/admin/stats
Headers:
  X-Gateway-API-Key: {{adminKey}}

// 測試創建端點
Method: POST
URL: {{baseUrl}}/api/admin/endpoints
Headers:
  X-Gateway-API-Key: {{adminKey}}
  Content-Type: application/json
Body:
{
  "name": "Test Endpoint",
  "gateway_path": "/test/endpoint",
  "target_url": "https://api.example.com/data",
  "api_type": "data",
  "timeout": 30
}
```

### 📜 2. 歷史記錄

自動保存最近 50 個請求，方便重複測試。

#### 功能特點：

- **自動記錄**：每次請求自動保存
- **詳細資訊**：
  - HTTP 方法（彩色標籤）
  - 完整 URL
  - 狀態碼和回應時間
  - 請求時間戳

- **快速重放**：點擊歷史記錄即可重新載入該請求
- **清空功能**：一鍵清除所有歷史

#### 歷史記錄格式：

```
GET    200 (45ms)
http://localhost:3000/api/admin/stats
2025-11-22 下午3:45:12
```

### 🌍 3. 環境變數

管理不同環境的配置，快速切換測試環境。

#### 預設環境：

**Local Development**（預設）
- baseUrl: http://localhost:3000
- adminKey: admin-key-12345

#### 功能特點：

- **多環境管理**：本地、開發、測試、生產
- **變數替換**：在 URL 和 Headers 中使用 `{{variableName}}`
- **視覺化指示**：當前使用的環境會高亮顯示
- **新增環境**：可添加自定義環境

#### 變數使用示例：

```
URL: {{baseUrl}}/api/admin/endpoints
Header: X-Gateway-API-Key: {{adminKey}}

實際請求時自動替換為：
URL: http://localhost:3000/api/admin/endpoints
Header: X-Gateway-API-Key: admin-key-12345
```

#### 添加新環境：

1. 點擊「+ 新增環境」
2. 輸入環境名稱（如 "Production"）
3. 系統自動創建包含 baseUrl 和 adminKey 的環境
4. 可手動修改 localStorage 來自定義更多變數

### 📋 4. 預設模板

快速載入常用的 API 請求模板。

#### 內建模板：

1. **獲取統計資料**
   - 方法：GET
   - 路徑：/api/admin/stats
   - 用途：查看系統統計資訊

2. **建立 API 端點**
   - 方法：POST
   - 路徑：/api/admin/endpoints
   - 用途：快速創建新端點配置

3. **OpenData 測試**
   - 方法：GET
   - 路徑：/opendata/health-centers
   - 用途：測試公開資料 API

#### 功能特點：

- **一鍵載入**：點擊模板卡片即可載入完整請求
- **自動填充**：Headers、Params、Body 全部自動填入
- **自定義模板**：可將當前請求儲存為新模板

#### 儲存自定義模板：

1. 配置好請求（URL、Headers、Body 等）
2. 點擊「儲存為模板」
3. 輸入模板名稱和描述
4. 模板永久保存在 LocalStorage

## 進階功能

### 🔄 環境變數替換

支援在以下位置使用變數：
- URL
- Headers 值
- Query Parameters 值

語法：`{{variableName}}`

### 💾 資料持久化

所有資料保存在瀏覽器 LocalStorage：
- 請求歷史（最多 50 條）
- 環境配置
- 自定義模板

### 📤 匯出功能

可匯出回應為 JSON 文件：
- 包含狀態碼
- 完整 Headers
- 回應 Body

## 常見使用場景

### 場景 1：測試新 API 端點

```
1. 選擇 HTTP 方法（如 POST）
2. 輸入 URL：{{baseUrl}}/api/admin/endpoints
3. 添加 Header：X-Gateway-API-Key: {{adminKey}}
4. 輸入 JSON Body
5. 點擊「發送」
6. 查看回應狀態和內容
```

### 場景 2：調試權限問題

```
1. 從模板載入請求
2. 修改 API Key 為測試用 Key
3. 發送請求
4. 檢查 403/401 錯誤
5. 查看 Headers 確認認證資訊
```

### 場景 3：批量測試

```
1. 配置第一個請求
2. 發送並查看結果
3. 從歷史記錄快速重放
4. 修改參數測試不同情況
5. 比較不同請求的回應時間
```

### 場景 4：OpenData 格式測試

```
1. 載入 "OpenData 測試" 模板
2. 修改 format 參數（json/csv）
3. 發送請求
4. 查看不同格式的輸出
5. 匯出回應進行分析
```

## 鍵盤快捷鍵

目前版本暫不支援鍵盤快捷鍵，未來版本將添加：
- Ctrl/Cmd + Enter：發送請求
- Ctrl/Cmd + K：清空請求
- Ctrl/Cmd + S：儲存為模板

## 與 Postman 的對比

| 功能 | API Gateway 測試工具 | Postman |
|------|---------------------|---------|
| 基本 HTTP 測試 | ✅ | ✅ |
| 環境變數 | ✅ | ✅ |
| 請求歷史 | ✅ (50條) | ✅ |
| 模板管理 | ✅ | ✅ (Collections) |
| 團隊協作 | ❌ | ✅ |
| 測試腳本 | ❌ | ✅ |
| Mock Server | ❌ | ✅ |
| API 文檔 | ❌ | ✅ |
| 完全離線 | ✅ | ❌ |
| 無需安裝 | ✅ | ❌ |
| 專為 Gateway 設計 | ✅ | ❌ |

## 技術細節

### 資料存儲

```javascript
// LocalStorage 結構
{
  "requestHistory": [/* 最多 50 個請求 */],
  "environments": [/* 環境配置 */],
  "templates": [/* 自定義模板 */],
  "currentEnv": "default" // 當前環境 ID
}
```

### 請求流程

```
1. 用戶配置請求
   ↓
2. 替換環境變數
   ↓
3. 構建 Query Parameters
   ↓
4. 收集 Headers
   ↓
5. 準備 Body（如需要）
   ↓
6. 發送 Fetch 請求
   ↓
7. 計算回應時間
   ↓
8. 解析回應
   ↓
9. 顯示結果
   ↓
10. 保存到歷史
```

## 疑難排解

### 問題：環境變數未替換

**解決方法**：
1. 確認環境變數語法正確：`{{variableName}}`
2. 檢查環境管理中是否有該變數
3. 確認已選擇正確的環境（高亮顯示）

### 問題：請求失敗（CORS 錯誤）

**解決方法**：
- API Gateway 已配置 CORS，應該不會出現此問題
- 如果出現，檢查瀏覽器控制台的具體錯誤信息

### 問題：歷史記錄消失

**解決方法**：
- 歷史記錄存儲在 LocalStorage
- 清除瀏覽器緩存會導致歷史記錄丟失
- 建議重要請求儲存為模板

### 問題：回應顯示亂碼

**解決方法**：
1. 切換到「Raw」標籤查看原始內容
2. 檢查 Content-Type Header
3. 確認 API 回應的編碼格式

## 未來改進計畫

### 高優先級
- [ ] 鍵盤快捷鍵支援
- [ ] 請求/回應的斷言驗證
- [ ] 批量請求功能
- [ ] 匯出/匯入模板集合

### 中優先級
- [ ] WebSocket 測試支援
- [ ] GraphQL 測試支援
- [ ] 測試腳本功能（Pre-request / Tests）
- [ ] 回應時間趨勢圖表

### 低優先級
- [ ] 深色模式
- [ ] 多語言支援
- [ ] Cookie 管理
- [ ] 代理設置

## 總結

這個全新的 API 測試工具從簡單的 MOCK 升級為專業級的測試平台，提供了：

✅ **完整的 HTTP 客戶端**：支援所有 HTTP 方法和配置
✅ **智能歷史管理**：自動保存，快速重放
✅ **環境變數系統**：輕鬆切換不同環境
✅ **模板管理**：保存和重用常用請求
✅ **響應式界面**：現代化、易用的 UI
✅ **完全離線**：無需網路，本地運行

現在你已經擁有一個功能強大、媲美 Postman 的 API 測試工具，專為你的 API Gateway 系統量身打造！

## 快速開始

1. 訪問：http://localhost:3000/test.html
2. 點擊「預設模板」標籤
3. 選擇「獲取統計資料」模板
4. 點擊「發送」按鈕
5. 查看回應結果

就是這麼簡單！現在開始探索所有功能吧 🚀
