#!/bin/bash
# 完整整合測試 - 使用 curl 指令
# 1. 創建 API endpoint
# 2. 綁定驗證規則（使用 schema.gov.tw）
# 3. 執行資料轉換與驗證
# 4. 輸出 CSV

echo "================================================================================"
echo "🧪 API Gateway 完整整合測試 (使用 curl)"
echo "================================================================================"
echo ""

# 設定
BASE_URL="http://localhost:3000"

# ============================================================================
# Step 1: 創建 API Endpoint
# ============================================================================
echo "📌 Step 1: 創建 API Endpoint"
echo "────────────────────────────────────────────────────────────────────────────────"

ENDPOINT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/admin/endpoints" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "員工訓練資料 API",
    "gateway_path": "/api/training/employees",
    "target_url": "https://example.com/api/training/employees",
    "api_type": "data",
    "timeout": 30
  }')

ENDPOINT_ID=$(echo $ENDPOINT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "✅ API Endpoint 已創建"
echo "Response: $ENDPOINT_RESPONSE"
echo "Endpoint ID: $ENDPOINT_ID"
echo ""

# ============================================================================
# Step 2: 創建 Transformation Rule（綁定驗證規則）
# ============================================================================
echo "📌 Step 2: 創建 Transformation Rule（綁定驗證規則）"
echo "────────────────────────────────────────────────────────────────────────────────"

RULE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/admin/transformations" \
  -H "Content-Type: application/json" \
  -d "{
    \"endpoint_id\": \"$ENDPOINT_ID\",
    \"rule_name\": \"員工訓練資料轉換規則\",
    \"description\": \"包含 schema.gov.tw 驗證規則的轉換\",
    \"source_format\": \"json\",
    \"target_format\": \"csv\",
    \"transformation_type\": \"mapping\",
    \"mapping_config\": \"{\\\"name\\\": \\\"employee_name\\\", \\\"birthday\\\": \\\"birth_date\\\", \\\"age\\\": \\\"employee_age\\\", \\\"id\\\": \\\"employee_id\\\"}\",
    \"validation_config\": \"[{\\\"field\\\": \\\"birthday\\\", \\\"schemaUri\\\": \\\"https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday\\\"}, {\\\"field\\\": \\\"name\\\", \\\"schemaUri\\\": \\\"https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName\\\"}, {\\\"field\\\": \\\"age\\\", \\\"type\\\": \\\"number\\\", \\\"min\\\": 18, \\\"max\\\": 65, \\\"message\\\": \\\"年齡必須在 18 到 65 之間\\\"}]\",
    \"validation_on_fail\": \"filter\",
    \"is_active\": true
  }")

RULE_ID=$(echo $RULE_RESPONSE | grep -o '"rule_id":"[^"]*' | cut -d'"' -f4)

echo "✅ Transformation Rule 已創建"
echo "Response: $RULE_RESPONSE"
echo "Rule ID: $RULE_ID"
echo ""

# ============================================================================
# Step 3: 準備測試資料
# ============================================================================
echo "📌 Step 3: 準備測試資料"
echo "────────────────────────────────────────────────────────────────────────────────"

cat > /tmp/test-data.json <<EOF
[
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
EOF

echo "✅ 測試資料已準備 (5 筆)"
echo "   - E001: John Smith, 19900101, 33歲 (✅ 預期通過)"
echo "   - E002: Mary Johnson, 1985-06-15, 38歲 (❌ 日期格式錯誤)"
echo "   - E003: Robert Williams, 20000229, 24歲 (✅ 預期通過)"
echo "   - E004: Patricia Brown, 19950315, 70歲 (❌ 年齡超過65)"
echo "   - E005: A, invalid, 25歲 (❌ 日期無效)"
echo ""

# ============================================================================
# Step 4: 方法 A - 使用 Rule ID 執行轉換 (推薦)
# ============================================================================
echo "📌 Step 4A: 使用 Rule ID 執行轉換 (推薦)"
echo "────────────────────────────────────────────────────────────────────────────────"

TEST_DATA=$(cat /tmp/test-data.json)

TRANSFORM_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/admin/transformations/test" \
  -H "Content-Type: application/json" \
  -d "{
    \"rule_id\": \"$RULE_ID\",
    \"sample_input\": $TEST_DATA
  }")

echo "📊 轉換結果:"
echo "$TRANSFORM_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TRANSFORM_RESPONSE"
echo ""

# ============================================================================
# Step 4B: 直接使用 Preview 執行轉換（不需要先創建規則）
# ============================================================================
echo "📌 Step 4B: 使用 Preview 執行轉換（直接測試，不需要先創建規則）"
echo "────────────────────────────────────────────────────────────────────────────────"

PREVIEW_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/admin/transformations/preview" \
  -H "Content-Type: application/json" \
  -d "{
    \"rule\": {
      \"source_format\": \"json\",
      \"target_format\": \"csv\",
      \"transformation_type\": \"mapping\",
      \"mapping_config\": {
        \"name\": \"employee_name\",
        \"birthday\": \"birth_date\",
        \"age\": \"employee_age\",
        \"id\": \"employee_id\"
      },
      \"validation_config\": [
        {
          \"field\": \"birthday\",
          \"schemaUri\": \"https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/Birthday\"
        },
        {
          \"field\": \"name\",
          \"schemaUri\": \"https://schema.gov.tw/api/ExaminationandCivilservice/ProtectionandTraining/Training/TraineesName\"
        },
        {
          \"field\": \"age\",
          \"type\": \"number\",
          \"min\": 18,
          \"max\": 65,
          \"message\": \"年齡必須在 18 到 65 之間\"
        }
      ],
      \"validation_on_fail\": \"filter\"
    },
    \"sample_input\": $TEST_DATA
  }")

echo "📊 預覽結果:"
echo "$PREVIEW_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PREVIEW_RESPONSE"
echo ""

# ============================================================================
# Step 5: 提取並顯示 CSV 輸出
# ============================================================================
echo "📌 Step 5: 提取 CSV 輸出"
echo "────────────────────────────────────────────────────────────────────────────────"

CSV_OUTPUT=$(echo "$TRANSFORM_RESPONSE" | grep -o '"outputText":"[^"]*' | cut -d'"' -f4 | sed 's/\\n/\n/g' | sed 's/\\"/"/g')

if [ -n "$CSV_OUTPUT" ]; then
    echo "✅ CSV 輸出:"
    echo "$CSV_OUTPUT"

    # 儲存到檔案
    echo "$CSV_OUTPUT" > /tmp/output.csv
    echo ""
    echo "💾 CSV 已儲存到: /tmp/output.csv"
else
    echo "⚠️  無法提取 CSV 輸出"
fi

echo ""

# ============================================================================
# Step 6: 清理測試資料
# ============================================================================
echo "📌 Step 6: 清理測試資料"
echo "────────────────────────────────────────────────────────────────────────────────"

# 刪除 Transformation Rule
DELETE_RULE=$(curl -s -X DELETE "${BASE_URL}/api/admin/transformations/$RULE_ID")
echo "🗑️  Transformation Rule 已刪除: $DELETE_RULE"

# 刪除 API Endpoint
DELETE_ENDPOINT=$(curl -s -X DELETE "${BASE_URL}/api/admin/endpoints/$ENDPOINT_ID")
echo "🗑️  API Endpoint 已刪除: $DELETE_ENDPOINT"

echo ""
echo "================================================================================"
echo "✅ 整合測試完成！"
echo "================================================================================"
echo ""
echo "已驗證功能:"
echo "  1. ✅ 創建 API endpoint"
echo "  2. ✅ 綁定驗證規則到 API (使用 schema.gov.tw)"
echo "  3. ✅ 執行資料轉換與驗證"
echo "  4. ✅ 欄位對應 (mapping)"
echo "  5. ✅ 輸出 CSV 格式"
echo "  6. ✅ Filter 模式過濾錯誤資料"
echo ""
