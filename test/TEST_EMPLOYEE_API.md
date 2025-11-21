# 員工訓練 API 測試指令

## ✅ API 已創建

- **Endpoint ID**: `ep_employee_training`
- **Rule ID**: `rule_employee_training`
- **路徑**: `/api/training/employees`

---

## 🔑 重要：API Key

**所有 curl 指令都需要加上 API Key header：**

```
-H "X-Gateway-API-Key: admin-key-12345"
```

預設的測試用 API Key 是 `admin-key-12345`

---

## 🌐 前台查看

打開瀏覽器訪問：

```
http://localhost:3000
```

在前台可以：
- 查看 **Endpoints** 頁面，找到「員工訓練資料 API」
- 查看 **Transformations** 頁面，找到「員工訓練資料轉換規則」
- 直接在頁面上測試轉換

---

## 🧪 curl 測試指令

### 測試 1：使用資料庫中的範例資料（最簡單，推薦）

```bash
curl -X POST http://localhost:3000/api/admin/transformations/test \
  -H "Content-Type: application/json" \
  -H "X-Gateway-API-Key: admin-key-12345" \
  -d '{"rule_id": "rule_employee_training"}'
```

這個指令會使用資料庫中預設的 5 筆測試資料。

---

### 測試 2：使用自訂資料

```bash
curl -X POST http://localhost:3000/api/admin/transformations/test \
  -H "Content-Type: application/json" \
  -H "X-Gateway-API-Key: admin-key-12345" \
  -d '{
    "rule_id": "rule_employee_training",
    "sample_input": [
      {
        "employee_id": "E001",
        "employee_name": "John Smith",
        "birth_date": "19900101",
        "employee_age": 33
      },
      {
        "employee_id": "E002",
        "employee_name": "Mary Johnson",
        "birth_date": "1985-06-15",
        "employee_age": 38
      },
      {
        "employee_id": "E003",
        "employee_name": "Robert Williams",
        "birth_date": "20000229",
        "employee_age": 24
      }
    ]
  }'
```

---

### 測試 3：使用美化輸出（推薦）

如果你有安裝 `jq`：

```bash
curl -X POST http://localhost:3000/api/admin/transformations/test \
  -H "Content-Type: application/json" \
  -H "X-Gateway-API-Key: admin-key-12345" \
  -d '{"rule_id": "rule_employee_training"}' | jq
```

或使用 Python（通常已安裝）：

```bash
curl -X POST http://localhost:3000/api/admin/transformations/test \
  -H "Content-Type: application/json" \
  -H "X-Gateway-API-Key: admin-key-12345" \
  -d '{"rule_id": "rule_employee_training"}' | python3 -m json.tool
```

---

## 📊 預期結果

執行測試後，你應該會看到：

```json
{
  "output": [
    {
      "name": "John Smith",
      "birthday": "19900101",
      "age": 33,
      "id": "E001"
    },
    {
      "name": "Robert Williams",
      "birthday": "20000229",
      "age": 24,
      "id": "E003"
    }
  ],
  "outputText": "name,birthday,age,id\nJohn Smith,19900101,33,E001\nRobert Williams,20000229,24,E003\n",
  "validation": {
    "valid": true,
    "totalRecords": 5,
    "validRecords": 2,
    "invalidRecords": 3,
    "errors": [
      {
        "index": 1,
        "field": "birthday",
        "message": "欄位生日格式不符合規則"
      },
      {
        "index": 3,
        "field": "age",
        "message": "年齡必須在 18 到 65 之間"
      },
      {
        "index": 4,
        "field": "birthday",
        "message": "欄位生日格式不符合規則"
      }
    ]
  },
  "meta": {
    "sourceFormat": "json",
    "targetFormat": "csv",
    "validationApplied": true,
    "validationPassed": true
  }
}
```

---

## 📋 測試資料說明

資料庫中包含 5 筆測試資料：

| ID | 姓名 | 生日 | 年齡 | 預期結果 |
|---|---|---|---|---|
| E001 | John Smith | 19900101 | 33 | ✅ 通過 |
| E002 | Mary Johnson | 1985-06-15 | 38 | ❌ 日期格式錯誤 |
| E003 | Robert Williams | 20000229 | 24 | ✅ 通過 |
| E004 | Patricia Brown | 19950315 | 70 | ❌ 年齡超過 65 |
| E005 | A | invalid | 25 | ❌ 日期無效 |

**驗證規則：**
- `birthday`: 從 schema.gov.tw 抓取，要求 YYYYMMDD 格式
- `name`: 從 schema.gov.tw 抓取，要求拉丁字母
- `age`: 範圍 18-65

**過濾模式：** 不符合驗證規則的資料會被自動移除

---

## 🔍 查看所有 Transformation Rules

```bash
curl http://localhost:3000/api/admin/transformations \
  -H "X-Gateway-API-Key: admin-key-12345"
```

---

## 🔍 查看所有 API Endpoints

```bash
curl http://localhost:3000/api/admin/endpoints \
  -H "X-Gateway-API-Key: admin-key-12345"
```

---

## 🗑️ 如果需要重新設置

執行設置腳本會自動清理舊資料並重新創建：

```bash
node test/setup-employee-api.js
```

---

## 🚀 快速開始（複製貼上即可）

**最簡單的測試指令（含美化輸出）：**

```bash
curl -X POST http://localhost:3000/api/admin/transformations/test \
  -H "Content-Type: application/json" \
  -H "X-Gateway-API-Key: admin-key-12345" \
  -d '{"rule_id": "rule_employee_training"}' | python3 -m json.tool
```

這個指令會：
- ✅ 從 schema.gov.tw 自動抓取驗證規則
- ✅ 驗證 5 筆測試資料
- ✅ 過濾掉不符合規則的資料
- ✅ 輸出 CSV 格式
- ✅ 美化 JSON 輸出

---

## 💡 提示

1. **確保 server 正在運行**：
   ```bash
   node server.js
   ```

2. **在前台查看更方便**：
   - 開啟 http://localhost:3000
   - 可以直接在網頁上測試和查看結果

3. **CSV 輸出**：
   結果中的 `outputText` 欄位包含 CSV 格式的輸出

4. **API Key 是必須的**：
   所有 `/api/admin/*` 的端點都需要 `X-Gateway-API-Key` header
