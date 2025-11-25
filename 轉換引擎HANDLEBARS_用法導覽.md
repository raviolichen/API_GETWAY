# Handlebars 模板引擎技術手冊

## 目錄
1. [基本概念](#基本概念)
2. [基本語法](#基本語法)
3. [內建 Helpers](#內建-helpers)
4. [進階用法](#進階用法)
5. [陣列操作](#陣列操作)
6. [常見錯誤與解決方案](#常見錯誤與解決方案)
7. [實戰範例](#實戰範例)

---

## 基本概念

Handlebars 是一個邏輯較少的模板引擎，用於將 JSON 資料轉換為目標格式（如 CSV、JSON、XML 等）。

### 核心概念
- **Context（上下文）**: 傳入模板的資料物件
- **Helper（輔助函數）**: 自訂或內建的函數，用於處理資料
- **Block Helper（區塊輔助）**: 包含開始和結束標籤的結構化輔助函數（如 `{{#if}}...{{/if}}`）

---

## 基本語法

### 1. 變數輸出

```handlebars
{{name}}              <!-- 輸出 name 變數 -->
{{user.email}}        <!-- 輸出巢狀屬性 -->
{{../parentValue}}    <!-- 訪問上層作用域 -->
```

**範例資料：**
```json
{
  "name": "Alice",
  "user": {
    "email": "alice@example.com"
  }
}
```

**輸出：**
```
Alice
alice@example.com
```

### 2. 註解

```handlebars
{{! 這是單行註解 }}

{{!--
  這是多行註解
  可以跨行
--}}
```

### 3. HTML 跳脫

```handlebars
{{name}}              <!-- HTML 跳脫（預設） -->
{{{rawHtml}}}         <!-- 不跳脫 HTML -->
```

---

## 內建 Helpers

本系統提供了豐富的內建 Helper 函數，定義於 `helpers.js` 中。

### 字串處理

#### `uppercase` / `lowercase`
轉換字串大小寫。

```handlebars
{{uppercase name}}     <!-- 轉大寫 -->
{{lowercase name}}     <!-- 轉小寫 -->
```

**範例：**
```json
{"name": "Alice"}
```
```handlebars
{{uppercase name}}  → ALICE
{{lowercase name}}  → alice
```

---

#### `concat`
連接多個字串。

```handlebars
{{concat firstName " " lastName}}
```

**範例：**
```json
{"firstName": "John", "lastName": "Doe"}
```
```handlebars
{{concat firstName " " lastName}}  → John Doe
```

---

#### `trim`
移除字串前後空白。

```handlebars
{{trim text}}
```

---

#### `replace`
取代字串中的內容。

```handlebars
{{replace text "old" "new"}}
```

**範例：**
```json
{"text": "Hello World"}
```
```handlebars
{{replace text "World" "Handlebars"}}  → Hello Handlebars
```

---

#### `substring`
擷取子字串。

```handlebars
{{substring text 0 5}}
```

**範例：**
```json
{"text": "Hello World"}
```
```handlebars
{{substring text 0 5}}  → Hello
```

---

### JSON 處理

#### `json`
將物件或值轉換為 JSON 字串。

```handlebars
{{json user}}
```

**範例：**
```json
{"user": {"name": "Alice", "age": 30}}
```
```handlebars
{{json user}}  → {"name":"Alice","age":30}
```

**重要：** 此 helper 使用 `SafeString` 包裝，不會進行 HTML 跳脫。

---

### 數學運算

#### `math`
執行基本數學運算。

```handlebars
{{math a "+" b}}      <!-- 加法 -->
{{math a "-" b}}      <!-- 減法 -->
{{math a "*" b}}      <!-- 乘法 -->
{{math a "/" b}}      <!-- 除法 -->
```

**範例：**
```json
{"price": 100, "tax": 5}
```
```handlebars
{{math price "+" tax}}  → 105
```

---

#### `add` / `subtract` / `multiply` / `divide`
專用數學運算函數。

```handlebars
{{add a b}}
{{subtract a b}}
{{multiply a b}}
{{divide a b}}
```

---

### 條件判斷

#### `eq` / `ne` / `gt` / `gte` / `lt` / `lte`
比較運算符。

```handlebars
{{#if (eq status "active")}}
  使用者已啟用
{{/if}}

{{#if (gt score 60)}}
  及格
{{/if}}
```

**範例：**
```json
{"status": "active", "score": 85}
```
```handlebars
{{#if (eq status "active")}}Active{{/if}}  → Active
{{#if (gt score 60)}}Pass{{/if}}           → Pass
```

---

### 日期處理

#### `formatDate`
格式化日期。

```handlebars
{{formatDate date "YYYY-MM-DD"}}
{{formatDate date "YYYY/MM/DD"}}
{{formatDate date "YYYYMMDD"}}
```

**範例：**
```json
{"date": "2025-11-25"}
```
```handlebars
{{formatDate date "YYYY-MM-DD"}}  → 2025-11-25
{{formatDate date "YYYYMMDD"}}    → 20251125
```

**支援的格式：**
- `YYYY-MM-DD` (預設)
- `YYYY/MM/DD`
- `YYYYMMDD`

**特殊支援：** 可以解析 `YYYYMMDD` 格式的字串（如 `20251125`）。

---

#### `now`
取得當前時間。

```handlebars
{{now "YYYY-MM-DD"}}
{{now "YYYYMMDD"}}
```

---

#### `dateFormat`
使用 Intl.DateTimeFormat 格式化日期（支援多語系）。

```handlebars
{{dateFormat date "zh-TW" options}}
```

---

### 預設值處理

#### `default`
當值為 undefined、null 或空字串時，使用預設值。

```handlebars
{{default description "無描述"}}
```

**範例：**
```json
{"name": "Alice", "description": null}
```
```handlebars
{{default description "無描述"}}  → 無描述
```

---

## 進階用法

### 1. 區塊 Helpers

#### `if` / `else` / `unless`

```handlebars
{{#if condition}}
  條件為真
{{else}}
  條件為假
{{/if}}

{{#unless condition}}
  條件為假時顯示
{{/unless}}
```

**範例：**
```json
{"status": "active", "age": 25}
```
```handlebars
{{#if (eq status "active")}}
  使用者已啟用
{{else}}
  使用者未啟用
{{/if}}

{{#unless (lt age 18)}}
  成年人
{{/unless}}
```

---

#### `each`
迭代陣列或物件。

```handlebars
{{#each items}}
  {{this.name}}
{{/each}}
```

**特殊變數：**
- `@index` - 目前索引（從 0 開始）
- `@key` - 物件的鍵名
- `@first` - 是否為第一個元素
- `@last` - 是否為最後一個元素

**範例：**
```json
{
  "items": [
    {"name": "Apple", "price": 10},
    {"name": "Banana", "price": 5}
  ]
}
```
```handlebars
[
{{#each items}}
  {{#unless @first}},{{/unless}}
  {"name": "{{name}}", "price": {{price}}}
{{/each}}
]
```

**輸出：**
```json
[
  {"name": "Apple", "price": 10},
  {"name": "Banana", "price": 5}
]
```

---

### 2. 路徑與作用域

#### 相對路徑

```handlebars
{{../parentValue}}     <!-- 上一層作用域 -->
{{../../grandValue}}   <!-- 上兩層作用域 -->
{{this.property}}      <!-- 目前物件的屬性 -->
```

**範例：**
```json
{
  "company": "ACME",
  "departments": [
    {
      "name": "IT",
      "employees": [
        {"name": "Alice"},
        {"name": "Bob"}
      ]
    }
  ]
}
```
```handlebars
{{#each departments}}
  部門: {{name}}
  公司: {{../company}}
  {{#each employees}}
    - {{name}} ({{../../company}})
  {{/each}}
{{/each}}
```

---

#### `@root` 訪問根作用域

在深層巢狀結構中，使用 `@root` 可以直接訪問最頂層的資料。

```handlebars
{{@root.topLevelValue}}
```

**重要：** 本系統的 transformer 會將原始資料傳遞到 `@root`，即使經過 `unwrapDataStructure` 處理。

**範例：**
```json
{
  "order_id": ["ORD001", "ORD002"],
  "status": "pending"
}
```
```handlebars
{{#each @root.order_id}}
  {"order_id": {{json this}}, "status": {{json @root.status}}}
{{/each}}
```

---

### 3. 子表達式（Subexpressions）

在 Helper 中使用其他 Helper 的結果。

```handlebars
{{#if (gt (add a b) 100)}}
  總和大於 100
{{/if}}
```

**範例：**
```json
{"a": 60, "b": 50}
```
```handlebars
{{#if (gt (add a b) 100)}}
  總和大於 100
{{/if}}
```
→ 總和大於 100

---

### 4. `lookup` Helper

動態查找屬性或陣列元素。

```handlebars
{{lookup array index}}
{{lookup object key}}
```

**範例：** 根據索引查找對應的值
```json
{
  "ids": [101, 102, 103],
  "names": ["Alice", "Bob", "Carol"]
}
```
```handlebars
{{#each ids}}
  ID: {{this}}, Name: {{lookup ../names @index}}
{{/each}}
```

**輸出：**
```
ID: 101, Name: Alice
ID: 102, Name: Bob
ID: 103, Name: Carol
```

---

## 陣列操作

### 陣列展開策略

本系統支援多種陣列展開策略，用於將具有多個陣列屬性的物件轉換為表格式資料。

---

### 策略1：以最長陣列為準（補 null）

當陣列長度不一致時，以最長陣列為準，較短陣列的缺失值補 null。

**輸入資料：**
```json
{
  "key": [1, 2, 3, 4],
  "name": ["Alice", "Bob"],
  "score": [85, 90, 75]
}
```

**模板：**
```handlebars
[
{{#each key}}
  {
    "key": {{json this}},
    "name": {{#if (lookup ../name @index)}}{{json (lookup ../name @index)}}{{else}}null{{/if}},
    "score": {{#if (lookup ../score @index)}}{{json (lookup ../score @index)}}{{else}}null{{/if}}
  }{{#unless @last}},{{/unless}}
{{/each}}
]
```

**輸出（CSV 格式）：**
```csv
key,name,score
1,Alice,85
2,Bob,90
3,,75
4,,
```

---

### 策略2：只取最短陣列長度

只輸出所有陣列都有對應值的記錄。

**輸入資料：**
```json
{
  "id": [101, 102, 103, 104, 105],
  "product": ["Laptop", "Mouse", "Keyboard"],
  "price": [15000, 500]
}
```

**模板：**
```handlebars
[
{{#each id}}
  {{#if (lookup ../price @index)}}
    {{#if @index}},{{/if}}
    {
      "id": {{json this}},
      "product": {{json (lookup ../product @index)}},
      "price": {{json (lookup ../price @index)}}
    }
  {{/if}}
{{/each}}
]
```

**輸出（CSV 格式）：**
```csv
id,product,price
101,Laptop,15000
102,Mouse,500
```

**關鍵技巧：** 使用 `{{#if (lookup ../price @index)}}` 檢查最短陣列是否有值。

---

### 策略3：展開 + 過濾不完整資料

在管線中加入過濾條件，移除不完整的記錄。

**輸入資料：**
```json
{
  "employee_id": ["E001", "E002", "E003"],
  "department": ["IT", "HR"],
  "salary": [50000, 45000, 52000, 48000]
}
```

**模板：**
```handlebars
[
{{#each employee_id}}
  {
    "employee_id": {{json this}},
    "department": {{#if (lookup ../department @index)}}{{json (lookup ../department @index)}}{{else}}null{{/if}},
    "salary": {{#if (lookup ../salary @index)}}{{json (lookup ../salary @index)}}{{else}}null{{/if}}
  }{{#unless @last}},{{/unless}}
{{/each}}
]
```

**Pipeline 配置：**
```json
[
  {
    "type": "template",
    "config": { "templateBody": "..." }
  },
  {
    "type": "filter",
    "config": {
      "condition": "record.employee_id && record.department && record.salary !== null"
    }
  }
]
```

**輸出（CSV 格式）：**
```csv
employee_id,department,salary
E001,IT,50000
E002,HR,45000
```

---

### 策略4：巢狀結構展開

將巢狀陣列展開為平面記錄。

**輸入資料：**
```json
{
  "data": [
    {"id": 1, "name": "Alice", "skills": ["Java", "Python"]},
    {"id": 2, "name": "Bob", "skills": ["JavaScript"]},
    {"id": 3, "name": "Carol", "skills": ["C++", "Go", "Rust"]}
  ]
}
```

**模板：**
```handlebars
[
{{#each this}}
  {{#unless @first}},{{/unless}}
  {{#each this.skills}}
    {{#if @index}},{{/if}}
    {
      "id": {{json ../id}},
      "name": {{json ../name}},
      "skill": {{json this}}
    }
  {{/each}}
{{/each}}
]
```

**關鍵說明：**
- 使用 `{{#each this}}` 而非 `{{#each data}}`
- 原因：系統的 `unwrapDataStructure` 函數會自動提取 `data` 鍵，讓 `this` 直接指向陣列

**輸出（CSV 格式）：**
```csv
id,name,skill
1,Alice,Java
1,Alice,Python
2,Bob,JavaScript
3,Carol,C++
3,Carol,Go
3,Carol,Rust
```

---

### 策略5：處理空陣列和邊界情況

使用 `@root` 來處理空陣列情況。

**輸入資料：**
```json
{
  "order_id": ["ORD001", "ORD002"],
  "status": "pending",
  "items": [],
  "quantity": [5, 10, 3]
}
```

**模板：**
```handlebars
{{#if @root.order_id}}
[
{{#each @root.order_id}}
  {{#if @index}},{{/if}}
  {
    "order_id": {{json this}},
    "status": {{json @root.status}},
    "items": "N/A",
    "quantity": {{#if (lookup @root.quantity @index)}}{{json (lookup @root.quantity @index)}}{{else}}0{{/if}}
  }
{{/each}}
]
{{else}}
[]
{{/if}}
```

**關鍵說明：**
- 使用 `@root` 訪問原始資料
- 原因：`unwrapDataStructure` 會提取空的 `items` 陣列，使 context 變成空陣列

**輸出（CSV 格式）：**
```csv
order_id,status,items,quantity
ORD001,pending,N/A,5
ORD002,pending,N/A,10
```

---

## 常見錯誤與解決方案

### 1. 語法錯誤：Expecting 'CLOSE', got 'CLOSE_UNESCAPED'

**錯誤範例：**
```handlebars
{"field": "value"}}}{{#unless @last}}
```

**原因：** JSON 物件結束的 `}` 和 Handlebars 區塊 `{{#unless` 之間缺少空格。

**解決方案：**
```handlebars
{"field": "value"} }}{{#unless @last}}
```

**規則：** 在 JSON 字串結束的 `}}` 或 `}}}` 後面加空格再接 Handlebars 區塊。

---

### 2. 語法錯誤：Expecting 'CLOSE_RAW_BLOCK', got 'INVALID'

**錯誤範例：**
```handlebars
[{{#each this} }{{#unless @first}},{{/unless}}...]
```

**原因：** Handlebars 區塊之間不需要空格，這是自動修正邏輯過度修正的結果。

**解決方案：**
```handlebars
[{{#each this}}{{#unless @first}},{{/unless}}...]
```

**規則：** Handlebars 區塊之間（如 `{{#each}}{{#unless`）不需要空格。

---

### 3. CSV Invalid Record: Trailing Commas

**錯誤範例：**
```handlebars
[
{{#each items}}
  {"id": {{id}}}{{#unless @last}},{{/unless}}
{{/each}}
]
```

當陣列中有條件性輸出時，可能產生：`[{...},{...},,,]`

**解決方案：** 在物件前面加逗號，而不是後面
```handlebars
[
{{#each items}}
  {{#if @index}},{{/if}}
  {"id": {{id}}}
{{/each}}
]
```

---

### 4. HTML Entity Encoding (輸出變成 &quot;)

**問題：** JSON 輸出變成 `{"name":&quot;Alice&quot;}`

**原因：** `json` helper 沒有使用 `SafeString`。

**解決方案：** 確保 helpers.js 中的 `json` helper 使用 `SafeString`：
```javascript
Handlebars.registerHelper('json', function (context) {
    return new Handlebars.SafeString(JSON.stringify(context));
});
```

---

### 5. Context 不正確（空陣列）

**問題：** 模板輸出空陣列或找不到資料。

**原因：** 系統的 `unwrapDataStructure` 函數會自動提取候選鍵（data, items, results, records）。

**解決方案1：** 使用 `{{#each this}}` 而不是 `{{#each data}}`
```handlebars
{{#each this}}  <!-- 正確 -->
{{#each data}}  <!-- 錯誤：data 已被提取 -->
```

**解決方案2：** 使用 `@root` 訪問原始資料
```handlebars
{{@root.order_id}}
{{@root.status}}
```

---

### 6. lookup 找不到值

**問題：** `{{lookup ../array @index}}` 返回 undefined。

**檢查事項：**
1. 確認陣列路徑正確（使用 `../` 回到上層）
2. 確認索引變數正確（使用 `@index`）
3. 使用 `{{#if (lookup ...)}}` 檢查值是否存在

**範例：**
```handlebars
{{#each ids}}
  {{#if (lookup ../names @index)}}
    Name: {{lookup ../names @index}}
  {{else}}
    Name: N/A
  {{/if}}
{{/each}}
```

---

## 實戰範例

### 範例1：將使用者資料轉換為 CSV

**輸入：**
```json
{
  "users": [
    {"id": 1, "name": "Alice", "email": "alice@example.com", "age": 30},
    {"id": 2, "name": "Bob", "email": "bob@example.com", "age": 25}
  ]
}
```

**模板：**
```handlebars
[
{{#each users}}
  {{#unless @first}},{{/unless}}
  {
    "id": {{id}},
    "name": {{json name}},
    "email": {{json email}},
    "age": {{age}}
  }
{{/each}}
]
```

**輸出（經過 CSV 轉換）：**
```csv
id,name,email,age
1,Alice,alice@example.com,30
2,Bob,bob@example.com,25
```

---

### 範例2：產生 XML 格式

**輸入：**
```json
{
  "order": {
    "id": "ORD001",
    "date": "2025-11-25",
    "items": [
      {"product": "Laptop", "quantity": 1, "price": 15000},
      {"product": "Mouse", "quantity": 2, "price": 500}
    ]
  }
}
```

**模板：**
```handlebars
<Order id="{{order.id}}" date="{{formatDate order.date "YYYY-MM-DD"}}">
{{#each order.items}}
  <Item>
    <Product>{{product}}</Product>
    <Quantity>{{quantity}}</Quantity>
    <Price>{{price}}</Price>
  </Item>
{{/each}}
</Order>
```

**輸出：**
```xml
<Order id="ORD001" date="2025-11-25">
  <Item>
    <Product>Laptop</Product>
    <Quantity>1</Quantity>
    <Price>15000</Price>
  </Item>
  <Item>
    <Product>Mouse</Product>
    <Quantity>2</Quantity>
    <Price>500</Price>
  </Item>
</Order>
```

---

### 範例3：條件性資料轉換

**輸入：**
```json
{
  "employees": [
    {"name": "Alice", "age": 30, "department": "IT", "salary": 50000},
    {"name": "Bob", "age": 17, "department": "HR", "salary": 30000},
    {"name": "Carol", "age": 25, "department": "IT", "salary": 45000}
  ]
}
```

**模板：** 只輸出 IT 部門且年滿 18 歲的員工
```handlebars
[
{{#each employees}}
  {{#if (eq department "IT")}}
    {{#if (gte age 18)}}
      {{#unless @first}},{{/unless}}
      {
        "name": {{json name}},
        "age": {{age}},
        "salary": {{salary}}
      }
    {{/if}}
  {{/if}}
{{/each}}
]
```

**輸出：**
```json
[
  {"name": "Alice", "age": 30, "salary": 50000},
  {"name": "Carol", "age": 25, "salary": 45000}
]
```

---

### 範例4：複雜陣列展開與計算

**輸入：**
```json
{
  "invoice_id": "INV001",
  "products": ["Laptop", "Mouse", "Keyboard"],
  "quantities": [1, 2, 1],
  "prices": [15000, 500, 800]
}
```

**模板：**
```handlebars
[
{{#each products}}
  {{#if @index}},{{/if}}
  {
    "invoice_id": {{json @root.invoice_id}},
    "product": {{json this}},
    "quantity": {{lookup @root.quantities @index}},
    "price": {{lookup @root.prices @index}},
    "subtotal": {{multiply (lookup @root.quantities @index) (lookup @root.prices @index)}}
  }
{{/each}}
]
```

**輸出（CSV 格式）：**
```csv
invoice_id,product,quantity,price,subtotal
INV001,Laptop,1,15000,15000
INV001,Mouse,2,500,1000
INV001,Keyboard,1,800,800
```

---

### 範例5：日期格式轉換

**輸入：**
```json
{
  "events": [
    {"name": "會議", "date": "20251125"},
    {"name": "培訓", "date": "20251130"}
  ]
}
```

**模板：**
```handlebars
[
{{#each events}}
  {{#unless @first}},{{/unless}}
  {
    "event": {{json name}},
    "date": {{json (formatDate date "YYYY-MM-DD")}},
    "date_slash": {{json (formatDate date "YYYY/MM/DD")}}
  }
{{/each}}
]
```

**輸出（CSV 格式）：**
```csv
event,date,date_slash
會議,2025-11-25,2025/11/25
培訓,2025-11-30,2025/11/30
```

---

## 最佳實踐

### 1. 總是使用 `json` helper 包裝字串值
```handlebars
"name": {{json name}}        <!-- 正確 -->
"name": "{{name}}"           <!-- 錯誤：name 中若有引號會破壞 JSON -->
```

### 2. 使用 `@root` 處理深層巢狀
```handlebars
{{#each users}}
  {{#each posts}}
    User: {{@root.systemName}} - {{../../name}}
  {{/each}}
{{/each}}
```

### 3. 陣列長度不一致時，使用 `{{#if (lookup ...)}}`
```handlebars
{{#each primaryArray}}
  "value": {{#if (lookup ../secondaryArray @index)}}{{lookup ../secondaryArray @index}}{{else}}null{{/if}}
{{/each}}
```

### 4. 避免在迴圈中產生 trailing commas
```handlebars
<!-- 錯誤 -->
{{#each items}}
  {...}{{#unless @last}},{{/unless}}
{{/each}}

<!-- 正確（當有條件性輸出時） -->
{{#each items}}
  {{#if condition}}
    {{#if @index}},{{/if}}{...}
  {{/if}}
{{/each}}
```

### 5. 注意 unwrapDataStructure 的影響
系統會自動提取以下鍵的陣列值：
- `data`
- `items`
- `results`
- `records`

如果您的資料結構使用這些鍵名，請：
- 使用 `{{#each this}}` 而不是 `{{#each data}}`
- 或使用 `@root` 訪問原始資料

---

## 系統特定注意事項

### unwrapDataStructure 行為

在 `transformer.js` 中，`unwrapDataStructure` 函數會自動提取候選鍵：

```javascript
const candidateKeys = ['data', 'items', 'results', 'records'];
```

**影響：**
- 如果輸入 `{"data": [...]}` → context 變成 `[...]`
- 如果輸入 `{"items": []}` → context 變成 `[]`（空陣列）

**應對策略：**
1. 在模板中使用 `{{#each this}}`
2. 使用 `@root` 訪問原始資料：`{{@root.data}}`

---

### Root Context 傳遞

系統會將原始資料傳遞到 `@root`：

```javascript
const rendered = template(data, { data: { root: root || data } });
```

這確保即使 context 被 unwrap 修改，您仍可通過 `@root` 訪問原始結構。

---

## 參考資源

- [Handlebars 官方文件](https://handlebarsjs.com/)
- [Handlebars Built-in Helpers](https://handlebarsjs.com/guide/builtin-helpers.html)
- 本系統 Helper 定義：`helpers.js`
- 轉換邏輯：`transformer.js`

---

## 版本資訊

- **文件版本**: 1.0
- **最後更新**: 2025-11-25
- **適用系統**: API Gateway v1.0
