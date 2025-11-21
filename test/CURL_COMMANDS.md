# API Gateway 整合測試 - curl 指令

## 完整流程測試

### 1️⃣ 創建 API Endpoint

```bash
curl -X POST http://localhost:3000/api/admin/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "員工訓練資料 API",
    "gateway_path": "/api/training/employees",
    "target_url": "https://example.com/api/training/employees",
    "api_type": "data",
    "timeout": 30
  }'
```

**回應範例：**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Endpoint created"
}
```

記下回應中的 `id`，這是 `endpoint_id`。

---

### 2️⃣ 創建 Transformation Rule（綁定驗證規則）

**替換 `ENDPOINT_ID` 為上一步獲得的 endpoint_id：**

```bash
curl -X POST http://localhost:3000/api/admin/transformations \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "ENDPOINT_ID",
    "rule_name": "員工訓練資料轉換規則",
    "description": "包含 schema.gov.tw 驗證規則的轉換",
    "source_format": "json",
    "target_format": "csv",
    "transformation_type": "mapping",
    "mapping_config": "{\"name\": \"employee_name\", \"birthday\": \"birth_date\", \"age\": \"employee_age\", \"id\": \"employee_id\"}",
    "validation_config": "[{\"field\": \"birthday\", \"schemaUri\": \"https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday\"}, {\"field\": \"name\", \"schemaUri\": \"https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName\"}, {\"field\": \"age\", \"type\": \"number\", \"min\": 18, \"max\": 65, \"message\": \"年齡必須在 18 到 65 之間\"}]",
    "validation_on_fail": "filter",
    "is_active": true
  }'
```

**回應範例：**
```json
{
  "rule_id": "456e7890-e12b-34c5-d678-901234567890",
  "rule_name": "員工訓練資料轉換規則",
  ...
}
```

記下回應中的 `rule_id`。

---

### 3️⃣ 執行轉換（使用 Rule ID）

**替換 `RULE_ID` 為上一步獲得的 rule_id：**

```bash
curl -X POST http://localhost:3000/api/admin/transformations/test \
  -H "Content-Type: application/json" \
  -d '{
    "rule_id": "RULE_ID",
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
      },
      {
        "employee_id": "E004",
        "employee_name": "Patricia Brown",
        "birth_date": "19950315",
        "employee_age": 70
      },
      {
        "employee_id": "E005",
        "employee_name": "A",
        "birth_date": "invalid",
        "employee_age": 25
      }
    ]
  }'
```

---

### 4️⃣ 直接預覽轉換（不需要先創建規則）

**這個方法不需要先創建 endpoint 和 rule，可以直接測試：**

```bash
curl -X POST http://localhost:3000/api/admin/transformations/preview \
  -H "Content-Type: application/json" \
  -d '{
    "rule": {
      "source_format": "json",
      "target_format": "csv",
      "transformation_type": "mapping",
      "mapping_config": {
        "name": "employee_name",
        "birthday": "birth_date",
        "age": "employee_age",
        "id": "employee_id"
      },
      "validation_config": [
        {
          "field": "birthday",
          "schemaUri": "https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday"
        },
        {
          "field": "name",
          "schemaUri": "https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName"
        },
        {
          "field": "age",
          "type": "number",
          "min": 18,
          "max": 65,
          "message": "年齡必須在 18 到 65 之間"
        }
      ],
      "validation_on_fail": "filter"
    },
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
      },
      {
        "employee_id": "E004",
        "employee_name": "Patricia Brown",
        "birth_date": "19950315",
        "employee_age": 70
      },
      {
        "employee_id": "E005",
        "employee_name": "A",
        "birth_date": "invalid",
        "employee_age": 25
      }
    ]
  }'
```

**預期輸出：**
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
  }
}
```

---

### 5️⃣ 清理測試資料

**刪除 Transformation Rule：**

```bash
curl -X DELETE http://localhost:3000/api/admin/transformations/RULE_ID
```

**刪除 API Endpoint：**

```bash
curl -X DELETE http://localhost:3000/api/admin/endpoints/ENDPOINT_ID
```

---

## 📋 測試資料說明

| ID | 姓名 | 生日 | 年齡 | 預期結果 | 原因 |
|---|---|---|---|---|---|
| E001 | John Smith | 19900101 | 33 | ✅ 通過 | 所有欄位符合規則 |
| E002 | Mary Johnson | 1985-06-15 | 38 | ❌ 被過濾 | 日期格式錯誤（YYYY-MM-DD vs YYYYMMDD） |
| E003 | Robert Williams | 20000229 | 24 | ✅ 通過 | 閏年日期有效 |
| E004 | Patricia Brown | 19950315 | 70 | ❌ 被過濾 | 年齡超過 65 |
| E005 | A | invalid | 25 | ❌ 被過濾 | 日期無效 |

**驗證規則說明：**
- `birthday`: 從 schema.gov.tw 自動抓取，要求 YYYYMMDD 格式
- `name`: 從 schema.gov.tw 自動抓取，要求拉丁字母
- `age`: 手動設定，範圍 18-65

**欄位對應：**
- `employee_name` → `name`
- `birth_date` → `birthday`
- `employee_age` → `age`
- `employee_id` → `id`

---

## 🚀 快速開始（推薦）

**最簡單的方式是使用 Step 4 的 preview 指令，不需要先創建 endpoint 和 rule：**

```bash
# 複製 Step 4 的指令並執行
curl -X POST http://localhost:3000/api/admin/transformations/preview \
  -H "Content-Type: application/json" \
  -d '...'  # (完整內容見上方 Step 4)
```

這個指令會：
1. ✅ 從 schema.gov.tw 自動抓取驗證規則
2. ✅ 驗證所有資料
3. ✅ 過濾掉不符合規則的資料（filter 模式）
4. ✅ 進行欄位對應
5. ✅ 輸出 CSV 格式

---

## 🛠️ 執行 bash 腳本（自動化測試）

如果想要執行完整的自動化測試：

```bash
chmod +x test/curl-integration-test.sh
./test/curl-integration-test.sh
```

這個腳本會自動執行所有步驟並清理測試資料。
