# API Gateway 轉換引擎 C# 遷移指南

## 目錄
1. [整體架構建議](#整體架構建議)
2. [核心套件對應表](#核心套件對應表)
3. [模板引擎實作](#模板引擎實作)
4. [資料轉換管線](#資料轉換管線)
5. [資料庫層](#資料庫層)
6. [API 服務層](#api-服務層)
7. [流量控制與告警](#流量控制與告警)
8. [完整實作範例](#完整實作範例)
9. [效能最佳化建議](#效能最佳化建議)

---

## 整體架構建議

### 建議技術棧

```
├── ASP.NET Core 8.0          # Web API 框架
├── Entity Framework Core     # ORM（可選，也可用 Dapper）
├── Handlebars.Net           # 模板引擎
├── CsvHelper                # CSV 處理
├── System.Text.Json         # JSON 處理
├── FluentValidation         # 資料驗證
├── Serilog                  # 日誌記錄
├── AspNetCoreRateLimit      # 流量限制
└── Quartz.NET               # 任務調度（告警監控）
```

### 專案結構建議

```
ApiGateway.Solution/
├── ApiGateway.Api/                    # Web API 專案
│   ├── Controllers/
│   ├── Middlewares/
│   ├── Program.cs
│   └── appsettings.json
├── ApiGateway.Core/                   # 核心業務邏輯
│   ├── Entities/                      # 實體模型
│   ├── Interfaces/                    # 介面定義
│   ├── Services/                      # 業務服務
│   │   ├── TransformationService.cs
│   │   ├── TemplateService.cs
│   │   └── RateLimitService.cs
│   └── Validators/                    # 驗證器
├── ApiGateway.Infrastructure/         # 基礎設施層
│   ├── Data/                          # 資料存取
│   │   ├── ApplicationDbContext.cs
│   │   └── Repositories/
│   ├── Transformers/                  # 轉換器實作
│   │   ├── HandlebarsTransformer.cs
│   │   ├── CsvTransformer.cs
│   │   └── XmlTransformer.cs
│   └── Helpers/                       # Helper 函數
│       └── HandlebarsHelpers.cs
└── ApiGateway.Tests/                  # 測試專案
    ├── Unit/
    └── Integration/
```

---

## 核心套件對應表

### 1. 模板引擎

| Node.js 套件 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| handlebars | Handlebars.Net | `Install-Package Handlebars.Net` |

**功能對應：**
- ✅ 基本模板語法 ({{variable}})
- ✅ Block Helpers ({{#if}}, {{#each}})
- ✅ 自訂 Helpers
- ✅ 部分模板 (Partials)

**備選方案：**
- **Scriban**: 更現代化的模板引擎，語法類似 Liquid，性能更好
  ```bash
  Install-Package Scriban
  ```
- **RazorEngine**: 使用 Razor 語法，適合 ASP.NET 開發者
  ```bash
  Install-Package RazorEngine
  ```

---

### 2. JSON 處理

| Node.js 功能 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| JSON.parse/stringify | System.Text.Json | 內建於 .NET |
| - | Newtonsoft.Json | `Install-Package Newtonsoft.Json` |

**建議使用：** `System.Text.Json`（.NET Core 內建，性能更好）

---

### 3. CSV 處理

| Node.js 套件 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| csv-stringify | CsvHelper | `Install-Package CsvHelper` |

**功能對應：**
- ✅ 陣列轉 CSV
- ✅ 自訂分隔符
- ✅ 標題列處理
- ✅ 型別映射

---

### 4. XML 處理

| Node.js 套件 | C# 套件 | 說明 |
|-------------|---------|------|
| xml2js | System.Xml.Linq | .NET 內建 (LINQ to XML) |
| - | System.Xml.Serialization | .NET 內建（序列化） |

---

### 5. 資料驗證

| Node.js 方法 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| 自訂驗證函數 | FluentValidation | `Install-Package FluentValidation` |
| - | DataAnnotations | .NET 內建 |

---

### 6. 資料庫

| Node.js 套件 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| sqlite3 | Microsoft.EntityFrameworkCore.Sqlite | `Install-Package Microsoft.EntityFrameworkCore.Sqlite` |
| - | Dapper | `Install-Package Dapper` |
| - | Microsoft.Data.Sqlite | `Install-Package Microsoft.Data.Sqlite` |

**建議：**
- **Entity Framework Core**: 功能完整，適合複雜查詢
- **Dapper**: 輕量級，性能更好，適合簡單查詢

---

### 7. HTTP Server

| Node.js 套件 | C# 框架 | 說明 |
|-------------|---------|------|
| express | ASP.NET Core | .NET 官方 Web 框架 |

---

### 8. 流量限制

| Node.js 套件 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| 自訂實作 | AspNetCoreRateLimit | `Install-Package AspNetCoreRateLimit` |
| - | Microsoft.AspNetCore.RateLimiting | .NET 7+ 內建 |

---

### 9. 任務調度（告警監控）

| Node.js 方法 | C# 套件 | NuGet 安裝指令 |
|-------------|---------|---------------|
| setInterval | Quartz.NET | `Install-Package Quartz` |
| - | Hangfire | `Install-Package Hangfire` |

---

## 模板引擎實作

### 安裝 Handlebars.Net

```bash
dotnet add package Handlebars.Net
```

### 基本使用

```csharp
using HandlebarsDotNet;

public class HandlebarsTransformer
{
    private readonly IHandlebars _handlebars;

    public HandlebarsTransformer()
    {
        _handlebars = Handlebars.Create();
        RegisterHelpers();
    }

    private void RegisterHelpers()
    {
        // 註冊自訂 Helper
        _handlebars.RegisterHelper("json", (writer, context, parameters) =>
        {
            if (parameters.Length > 0)
            {
                var json = JsonSerializer.Serialize(parameters[0]);
                writer.WriteSafeString(json);
            }
        });

        _handlebars.RegisterHelper("uppercase", (writer, context, parameters) =>
        {
            if (parameters.Length > 0 && parameters[0] != null)
            {
                writer.WriteSafeString(parameters[0].ToString().ToUpper());
            }
        });

        _handlebars.RegisterHelper("lowercase", (writer, context, parameters) =>
        {
            if (parameters.Length > 0 && parameters[0] != null)
            {
                writer.WriteSafeString(parameters[0].ToString().ToLower());
            }
        });
    }

    public string Transform(string template, object data)
    {
        var compiledTemplate = _handlebars.Compile(template);
        return compiledTemplate(data);
    }
}
```

---

### 完整 Helpers 實作

```csharp
using HandlebarsDotNet;
using System.Text.Json;

public class HandlebarsHelpers
{
    public static void RegisterAllHelpers(IHandlebars handlebars)
    {
        RegisterStringHelpers(handlebars);
        RegisterMathHelpers(handlebars);
        RegisterDateHelpers(handlebars);
        RegisterComparisonHelpers(handlebars);
        RegisterJsonHelpers(handlebars);
    }

    // JSON 處理
    private static void RegisterJsonHelpers(IHandlebars handlebars)
    {
        handlebars.RegisterHelper("json", (writer, context, parameters) =>
        {
            if (parameters.Length > 0)
            {
                var json = JsonSerializer.Serialize(parameters[0], new JsonSerializerOptions
                {
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
                writer.WriteSafeString(json);
            }
        });
    }

    // 字串處理
    private static void RegisterStringHelpers(IHandlebars handlebars)
    {
        handlebars.RegisterHelper("uppercase", (writer, context, parameters) =>
        {
            if (parameters.Length > 0 && parameters[0] != null)
            {
                writer.WriteSafeString(parameters[0].ToString().ToUpper());
            }
        });

        handlebars.RegisterHelper("lowercase", (writer, context, parameters) =>
        {
            if (parameters.Length > 0 && parameters[0] != null)
            {
                writer.WriteSafeString(parameters[0].ToString().ToLower());
            }
        });

        handlebars.RegisterHelper("concat", (writer, context, parameters) =>
        {
            var result = string.Join("", parameters.Select(p => p?.ToString() ?? ""));
            writer.WriteSafeString(result);
        });

        handlebars.RegisterHelper("trim", (writer, context, parameters) =>
        {
            if (parameters.Length > 0 && parameters[0] != null)
            {
                writer.WriteSafeString(parameters[0].ToString().Trim());
            }
        });

        handlebars.RegisterHelper("replace", (writer, context, parameters) =>
        {
            if (parameters.Length >= 3)
            {
                var str = parameters[0]?.ToString() ?? "";
                var oldValue = parameters[1]?.ToString() ?? "";
                var newValue = parameters[2]?.ToString() ?? "";
                writer.WriteSafeString(str.Replace(oldValue, newValue));
            }
        });

        handlebars.RegisterHelper("substring", (writer, context, parameters) =>
        {
            if (parameters.Length >= 3 && parameters[0] != null)
            {
                var str = parameters[0].ToString();
                var start = Convert.ToInt32(parameters[1]);
                var length = Convert.ToInt32(parameters[2]);
                writer.WriteSafeString(str.Substring(start, length));
            }
        });
    }

    // 數學運算
    private static void RegisterMathHelpers(IHandlebars handlebars)
    {
        handlebars.RegisterHelper("add", (writer, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                writer.WriteSafeString((a + b).ToString());
            }
        });

        handlebars.RegisterHelper("subtract", (writer, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                writer.WriteSafeString((a - b).ToString());
            }
        });

        handlebars.RegisterHelper("multiply", (writer, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                writer.WriteSafeString((a * b).ToString());
            }
        });

        handlebars.RegisterHelper("divide", (writer, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                if (b != 0)
                {
                    writer.WriteSafeString((a / b).ToString());
                }
                else
                {
                    writer.WriteSafeString("null");
                }
            }
        });

        handlebars.RegisterHelper("math", (writer, context, parameters) =>
        {
            if (parameters.Length >= 3)
            {
                var a = Convert.ToDouble(parameters[0]);
                var op = parameters[1]?.ToString();
                var b = Convert.ToDouble(parameters[2]);

                double result = op switch
                {
                    "+" => a + b,
                    "-" => a - b,
                    "*" => a * b,
                    "/" => b != 0 ? a / b : double.NaN,
                    _ => double.NaN
                };

                writer.WriteSafeString(double.IsNaN(result) ? "null" : result.ToString());
            }
        });
    }

    // 比較運算
    private static void RegisterComparisonHelpers(IHandlebars handlebars)
    {
        handlebars.RegisterHelper("eq", (writer, options, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var equals = parameters[0]?.Equals(parameters[1]) ?? false;
                if (equals)
                {
                    options.Template(writer, context);
                }
                else
                {
                    options.Inverse(writer, context);
                }
            }
        });

        handlebars.RegisterHelper("ne", (writer, options, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var notEquals = !(parameters[0]?.Equals(parameters[1]) ?? false);
                if (notEquals)
                {
                    options.Template(writer, context);
                }
                else
                {
                    options.Inverse(writer, context);
                }
            }
        });

        handlebars.RegisterHelper("gt", (writer, options, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                if (a > b)
                {
                    options.Template(writer, context);
                }
                else
                {
                    options.Inverse(writer, context);
                }
            }
        });

        handlebars.RegisterHelper("gte", (writer, options, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                if (a >= b)
                {
                    options.Template(writer, context);
                }
                else
                {
                    options.Inverse(writer, context);
                }
            }
        });

        handlebars.RegisterHelper("lt", (writer, options, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                if (a < b)
                {
                    options.Template(writer, context);
                }
                else
                {
                    options.Inverse(writer, context);
                }
            }
        });

        handlebars.RegisterHelper("lte", (writer, options, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var a = Convert.ToDouble(parameters[0]);
                var b = Convert.ToDouble(parameters[1]);
                if (a <= b)
                {
                    options.Template(writer, context);
                }
                else
                {
                    options.Inverse(writer, context);
                }
            }
        });
    }

    // 日期處理
    private static void RegisterDateHelpers(IHandlebars handlebars)
    {
        handlebars.RegisterHelper("formatDate", (writer, context, parameters) =>
        {
            if (parameters.Length >= 2)
            {
                var dateValue = parameters[0]?.ToString();
                var format = parameters[1]?.ToString() ?? "yyyy-MM-dd";

                if (DateTime.TryParse(dateValue, out var date))
                {
                    var formatted = format switch
                    {
                        "YYYY-MM-DD" => date.ToString("yyyy-MM-dd"),
                        "YYYY/MM/DD" => date.ToString("yyyy/MM/dd"),
                        "YYYYMMDD" => date.ToString("yyyyMMdd"),
                        _ => date.ToString(format)
                    };
                    writer.WriteSafeString(formatted);
                }
                else if (dateValue?.Length == 8) // YYYYMMDD format
                {
                    var year = dateValue.Substring(0, 4);
                    var month = dateValue.Substring(4, 2);
                    var day = dateValue.Substring(6, 2);

                    var formatted = format switch
                    {
                        "YYYY-MM-DD" => $"{year}-{month}-{day}",
                        "YYYY/MM/DD" => $"{year}/{month}/{day}",
                        "YYYYMMDD" => dateValue,
                        _ => $"{year}-{month}-{day}"
                    };
                    writer.WriteSafeString(formatted);
                }
                else
                {
                    writer.WriteSafeString(dateValue);
                }
            }
        });

        handlebars.RegisterHelper("now", (writer, context, parameters) =>
        {
            var format = parameters.Length > 0 ? parameters[0]?.ToString() : "o";
            var now = DateTime.Now;

            var formatted = format switch
            {
                "YYYY-MM-DD" => now.ToString("yyyy-MM-dd"),
                "YYYYMMDD" => now.ToString("yyyyMMdd"),
                _ => now.ToString("o")
            };
            writer.WriteSafeString(formatted);
        });

        handlebars.RegisterHelper("dateFormat", (writer, context, parameters) =>
        {
            if (parameters.Length >= 1)
            {
                var dateValue = parameters[0];
                var locale = parameters.Length > 1 ? parameters[1]?.ToString() : "en-US";

                if (dateValue != null && DateTime.TryParse(dateValue.ToString(), out var date))
                {
                    var culture = new System.Globalization.CultureInfo(locale);
                    writer.WriteSafeString(date.ToString("d", culture));
                }
            }
        });
    }
}
```

---

## 資料轉換管線

### Pipeline 架構設計

```csharp
using System.Text.Json;

// 管線步驟介面
public interface IPipelineStep
{
    string Type { get; }
    Task<object> ExecuteAsync(object input, Dictionary<string, object> config);
}

// 模板轉換步驟
public class TemplateStep : IPipelineStep
{
    private readonly HandlebarsTransformer _transformer;

    public string Type => "template";

    public TemplateStep(HandlebarsTransformer transformer)
    {
        _transformer = transformer;
    }

    public Task<object> ExecuteAsync(object input, Dictionary<string, object> config)
    {
        var templateBody = config["templateBody"].ToString();
        var result = _transformer.Transform(templateBody, input);

        // 嘗試解析為 JSON
        try
        {
            return Task.FromResult<object>(JsonSerializer.Deserialize<object>(result));
        }
        catch
        {
            return Task.FromResult<object>(result);
        }
    }
}

// 過濾步驟
public class FilterStep : IPipelineStep
{
    public string Type => "filter";

    public Task<object> ExecuteAsync(object input, Dictionary<string, object> config)
    {
        var condition = config["condition"].ToString();

        if (input is JsonElement element && element.ValueKind == JsonValueKind.Array)
        {
            var filtered = new List<object>();
            foreach (var item in element.EnumerateArray())
            {
                if (EvaluateCondition(item, condition))
                {
                    filtered.Add(item);
                }
            }
            return Task.FromResult<object>(filtered);
        }

        return Task.FromResult(input);
    }

    private bool EvaluateCondition(JsonElement record, string condition)
    {
        // 簡單實作，實際可使用 DynamicExpresso 或 Flee 套件
        // 這裡示範基本的條件判斷
        try
        {
            // 例如: record.employee_id && record.department
            var parts = condition.Split("&&");
            foreach (var part in parts)
            {
                var field = part.Trim().Replace("record.", "");
                if (!record.TryGetProperty(field, out var value) ||
                    value.ValueKind == JsonValueKind.Null)
                {
                    return false;
                }
            }
            return true;
        }
        catch
        {
            return false;
        }
    }
}

// CSV 轉換步驟
public class CsvStep : IPipelineStep
{
    public string Type => "csv";

    public async Task<object> ExecuteAsync(object input, Dictionary<string, object> config)
    {
        var delimiter = config.ContainsKey("delimiter") ? config["delimiter"].ToString() : ",";
        var header = config.ContainsKey("header") ? (bool)config["header"] : true;

        // 使用 CsvHelper 轉換
        using var writer = new StringWriter();
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = delimiter,
            HasHeaderRecord = header
        });

        if (input is JsonElement element && element.ValueKind == JsonValueKind.Array)
        {
            var records = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(element.GetRawText());
            await csv.WriteRecordsAsync(records);
        }

        return writer.ToString();
    }
}

// 管線執行器
public class TransformationPipeline
{
    private readonly Dictionary<string, IPipelineStep> _steps;

    public TransformationPipeline(IEnumerable<IPipelineStep> steps)
    {
        _steps = steps.ToDictionary(s => s.Type);
    }

    public async Task<object> ExecuteAsync(object input, List<PipelineConfig> pipeline)
    {
        var current = input;

        foreach (var config in pipeline)
        {
            if (_steps.TryGetValue(config.Type, out var step))
            {
                current = await step.ExecuteAsync(current, config.Config);
            }
        }

        return current;
    }
}

public class PipelineConfig
{
    public string Type { get; set; }
    public Dictionary<string, object> Config { get; set; }
}
```

---

## 資料庫層

### Entity Framework Core 實作

```csharp
using Microsoft.EntityFrameworkCore;

// 實體模型
public class TransformationRule
{
    public int Id { get; set; }
    public string RuleName { get; set; }
    public string Description { get; set; }
    public string InputFormat { get; set; }
    public string OutputFormat { get; set; }
    public string TemplateConfig { get; set; }
    public string PipelineConfig { get; set; }
    public string SampleInput { get; set; }
    public string SampleOutput { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ApiKey
{
    public int Id { get; set; }
    public string KeyHash { get; set; }
    public string KeyPrefix { get; set; }
    public string Name { get; set; }
    public bool IsSystem { get; set; }
    public int? RateLimitPerHour { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
}

public class ApiRequest
{
    public int Id { get; set; }
    public int ApiKeyId { get; set; }
    public string Endpoint { get; set; }
    public string Method { get; set; }
    public int StatusCode { get; set; }
    public int ResponseTimeMs { get; set; }
    public DateTime RequestedAt { get; set; }

    public ApiKey ApiKey { get; set; }
}

// DbContext
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<TransformationRule> TransformationRules { get; set; }
    public DbSet<ApiKey> ApiKeys { get; set; }
    public DbSet<ApiRequest> ApiRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TransformationRule>(entity =>
        {
            entity.ToTable("transformation_rules");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RuleName).HasMaxLength(255);
            entity.HasIndex(e => e.RuleName).IsUnique();
        });

        modelBuilder.Entity<ApiKey>(entity =>
        {
            entity.ToTable("api_keys");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.KeyHash).IsUnique();
            entity.HasIndex(e => e.KeyPrefix);
        });

        modelBuilder.Entity<ApiRequest>(entity =>
        {
            entity.ToTable("api_requests");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ApiKeyId);
            entity.HasIndex(e => e.RequestedAt);
        });

        base.OnModelCreating(modelBuilder);
    }
}
```

### Dapper 輕量實作（替代方案）

```csharp
using Dapper;
using Microsoft.Data.Sqlite;

public class TransformationRuleRepository
{
    private readonly string _connectionString;

    public TransformationRuleRepository(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<TransformationRule> GetByNameAsync(string ruleName)
    {
        using var connection = new SqliteConnection(_connectionString);
        var sql = "SELECT * FROM transformation_rules WHERE rule_name = @RuleName";
        return await connection.QueryFirstOrDefaultAsync<TransformationRule>(sql, new { RuleName = ruleName });
    }

    public async Task<IEnumerable<TransformationRule>> GetAllAsync()
    {
        using var connection = new SqliteConnection(_connectionString);
        var sql = "SELECT * FROM transformation_rules ORDER BY created_at DESC";
        return await connection.QueryAsync<TransformationRule>(sql);
    }

    public async Task<int> InsertAsync(TransformationRule rule)
    {
        using var connection = new SqliteConnection(_connectionString);
        var sql = @"
            INSERT INTO transformation_rules
            (rule_name, description, input_format, output_format, template_config, pipeline_config, sample_input, sample_output, created_at, updated_at)
            VALUES
            (@RuleName, @Description, @InputFormat, @OutputFormat, @TemplateConfig, @PipelineConfig, @SampleInput, @SampleOutput, @CreatedAt, @UpdatedAt)
            RETURNING id";

        return await connection.ExecuteScalarAsync<int>(sql, rule);
    }

    public async Task<int> UpdateAsync(TransformationRule rule)
    {
        using var connection = new SqliteConnection(_connectionString);
        var sql = @"
            UPDATE transformation_rules
            SET description = @Description,
                input_format = @InputFormat,
                output_format = @OutputFormat,
                template_config = @TemplateConfig,
                pipeline_config = @PipelineConfig,
                sample_input = @SampleInput,
                sample_output = @SampleOutput,
                updated_at = @UpdatedAt
            WHERE rule_name = @RuleName";

        return await connection.ExecuteAsync(sql, rule);
    }
}
```

---

## API 服務層

### ASP.NET Core Web API

```csharp
// Program.cs
using ApiGateway.Core.Services;
using ApiGateway.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 註冊服務
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 資料庫
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 業務服務
builder.Services.AddSingleton<HandlebarsTransformer>();
builder.Services.AddSingleton<HandlebarsHelpers>();
builder.Services.AddScoped<TransformationService>();
builder.Services.AddScoped<RateLimitService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### Controller 實作

```csharp
using Microsoft.AspNetCore.Mvc;
using ApiGateway.Core.Services;
using ApiGateway.Core.Entities;

[ApiController]
[Route("api/[controller]")]
public class TransformationsController : ControllerBase
{
    private readonly TransformationService _transformationService;
    private readonly ILogger<TransformationsController> _logger;

    public TransformationsController(
        TransformationService transformationService,
        ILogger<TransformationsController> logger)
    {
        _transformationService = transformationService;
        _logger = logger;
    }

    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] PreviewRequest request)
    {
        try
        {
            var result = await _transformationService.PreviewTransformationAsync(request);
            return Ok(new
            {
                success = true,
                output = result.Output,
                format = result.Format
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Preview transformation failed");
            return BadRequest(new
            {
                success = false,
                error = ex.Message
            });
        }
    }

    [HttpPost("transform/{ruleName}")]
    public async Task<IActionResult> Transform(string ruleName, [FromBody] object inputData)
    {
        try
        {
            var result = await _transformationService.TransformAsync(ruleName, inputData);

            if (result.Format == "csv")
            {
                return Content(result.Output.ToString(), "text/csv");
            }
            else if (result.Format == "xml")
            {
                return Content(result.Output.ToString(), "application/xml");
            }
            else
            {
                return Ok(result.Output);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transformation failed for rule: {RuleName}", ruleName);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rules = await _transformationService.GetAllRulesAsync();
        return Ok(rules);
    }

    [HttpGet("{ruleName}")]
    public async Task<IActionResult> GetByName(string ruleName)
    {
        var rule = await _transformationService.GetRuleByNameAsync(ruleName);
        if (rule == null)
        {
            return NotFound();
        }
        return Ok(rule);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TransformationRule rule)
    {
        var id = await _transformationService.CreateRuleAsync(rule);
        return CreatedAtAction(nameof(GetByName), new { ruleName = rule.RuleName }, new { id });
    }

    [HttpPut("{ruleName}")]
    public async Task<IActionResult> Update(string ruleName, [FromBody] TransformationRule rule)
    {
        rule.RuleName = ruleName;
        await _transformationService.UpdateRuleAsync(rule);
        return NoContent();
    }

    [HttpDelete("{ruleName}")]
    public async Task<IActionResult> Delete(string ruleName)
    {
        await _transformationService.DeleteRuleAsync(ruleName);
        return NoContent();
    }
}

public class PreviewRequest
{
    public string InputFormat { get; set; }
    public string OutputFormat { get; set; }
    public object SampleInput { get; set; }
    public string TemplateConfig { get; set; }
    public List<PipelineConfig> PipelineConfig { get; set; }
}
```

---

## 流量控制與告警

### 使用 AspNetCoreRateLimit

```bash
dotnet add package AspNetCoreRateLimit
```

### 配置流量限制

```csharp
// Program.cs
using AspNetCoreRateLimit;

builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// Middleware
app.UseIpRateLimiting();
```

### appsettings.json 配置

```json
{
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "ClientIdHeader": "X-ClientId",
    "HttpStatusCode": 429,
    "GeneralRules": [
      {
        "Endpoint": "*",
        "Period": "1h",
        "Limit": 100
      },
      {
        "Endpoint": "*/api/transformations/*",
        "Period": "1h",
        "Limit": 50
      }
    ]
  }
}
```

### 自訂 API Key 流量限制 Middleware

```csharp
public class ApiKeyRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly RateLimitService _rateLimitService;

    public ApiKeyRateLimitMiddleware(RequestDelegate next, RateLimitService rateLimitService)
    {
        _next = next;
        _rateLimitService = rateLimitService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var apiKey = context.Request.Headers["X-Gateway-API-Key"].FirstOrDefault();

        if (string.IsNullOrEmpty(apiKey))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "API Key is required" });
            return;
        }

        var isAllowed = await _rateLimitService.CheckRateLimitAsync(apiKey);
        if (!isAllowed)
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsJsonAsync(new { error = "Rate limit exceeded" });
            return;
        }

        await _rateLimitService.RecordRequestAsync(apiKey, context.Request.Path);
        await _next(context);
    }
}

public class RateLimitService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public RateLimitService(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<bool> CheckRateLimitAsync(string apiKey)
    {
        // 從 cache 或資料庫獲取 API Key 資訊
        var keyInfo = await GetApiKeyInfoAsync(apiKey);
        if (keyInfo == null || !keyInfo.IsActive)
        {
            return false;
        }

        // 檢查流量限制
        var cacheKey = $"rate_limit_{keyInfo.Id}";
        var count = _cache.Get<int?>(cacheKey);

        if (count.HasValue && count >= keyInfo.RateLimitPerHour)
        {
            return false;
        }

        return true;
    }

    public async Task RecordRequestAsync(string apiKey, string endpoint)
    {
        var keyInfo = await GetApiKeyInfoAsync(apiKey);
        if (keyInfo == null) return;

        // 更新 cache
        var cacheKey = $"rate_limit_{keyInfo.Id}";
        var count = _cache.Get<int?>(cacheKey) ?? 0;
        _cache.Set(cacheKey, count + 1, TimeSpan.FromHours(1));

        // 記錄請求
        var request = new ApiRequest
        {
            ApiKeyId = keyInfo.Id,
            Endpoint = endpoint,
            Method = "POST",
            StatusCode = 200,
            ResponseTimeMs = 0,
            RequestedAt = DateTime.UtcNow
        };

        _context.ApiRequests.Add(request);
        await _context.SaveChangesAsync();

        // 更新最後使用時間
        keyInfo.LastUsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private async Task<ApiKey> GetApiKeyInfoAsync(string apiKey)
    {
        var keyHash = ComputeHash(apiKey);
        return await _context.ApiKeys.FirstOrDefaultAsync(k => k.KeyHash == keyHash);
    }

    private string ComputeHash(string input)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(input);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
```

---

### 告警系統（使用 Quartz.NET）

```bash
dotnet add package Quartz
dotnet add package Quartz.Extensions.Hosting
```

### 配置告警監控

```csharp
// Program.cs
using Quartz;

builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    // 每 5 分鐘檢查一次告警
    var jobKey = new JobKey("AlertMonitorJob");
    q.AddJob<AlertMonitorJob>(opts => opts.WithIdentity(jobKey));
    q.AddTrigger(opts => opts
        .ForJob(jobKey)
        .WithIdentity("AlertMonitorTrigger")
        .WithCronSchedule("0 */5 * * * ?")); // 每 5 分鐘
});

builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);
```

### 告警 Job 實作

```csharp
using Quartz;

public class AlertMonitorJob : IJob
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AlertMonitorJob> _logger;

    public AlertMonitorJob(ApplicationDbContext context, ILogger<AlertMonitorJob> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("Running alert monitor at {Time}", DateTime.Now);

        // 獲取啟用的告警規則
        var alerts = await _context.Set<Alert>()
            .Where(a => a.IsActive)
            .ToListAsync();

        foreach (var alert in alerts)
        {
            await CheckAlertAsync(alert);
        }
    }

    private async Task CheckAlertAsync(Alert alert)
    {
        try
        {
            var threshold = alert.Threshold;
            var windowMinutes = alert.WindowMinutes;
            var since = DateTime.UtcNow.AddMinutes(-windowMinutes);

            int count = 0;

            if (alert.Metric == "request_count")
            {
                count = await _context.ApiRequests
                    .Where(r => r.RequestedAt >= since)
                    .CountAsync();
            }
            else if (alert.Metric == "error_rate")
            {
                var total = await _context.ApiRequests
                    .Where(r => r.RequestedAt >= since)
                    .CountAsync();

                var errors = await _context.ApiRequests
                    .Where(r => r.RequestedAt >= since && r.StatusCode >= 400)
                    .CountAsync();

                count = total > 0 ? (int)((double)errors / total * 100) : 0;
            }

            if (count > threshold)
            {
                await TriggerAlertAsync(alert, count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking alert {AlertName}", alert.Name);
        }
    }

    private async Task TriggerAlertAsync(Alert alert, int actualValue)
    {
        _logger.LogWarning("Alert triggered: {AlertName}, Value: {Value}, Threshold: {Threshold}",
            alert.Name, actualValue, alert.Threshold);

        // 記錄告警觸發
        var trigger = new AlertTrigger
        {
            AlertId = alert.Id,
            TriggeredAt = DateTime.UtcNow,
            ActualValue = actualValue,
            Message = $"{alert.Name} exceeded threshold. Current: {actualValue}, Threshold: {alert.Threshold}"
        };

        _context.Set<AlertTrigger>().Add(trigger);
        await _context.SaveChangesAsync();

        // 這裡可以發送通知（Email, Slack, 等）
        // await SendNotificationAsync(alert, trigger);
    }
}

public class Alert
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Metric { get; set; }
    public string Condition { get; set; }
    public int Threshold { get; set; }
    public int WindowMinutes { get; set; }
    public bool IsActive { get; set; }
}

public class AlertTrigger
{
    public int Id { get; set; }
    public int AlertId { get; set; }
    public DateTime TriggeredAt { get; set; }
    public int ActualValue { get; set; }
    public string Message { get; set; }
}
```

---

## 完整實作範例

### CSV 轉換完整範例

```csharp
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Text.Json;

public class CsvTransformationService
{
    private readonly HandlebarsTransformer _transformer;

    public CsvTransformationService(HandlebarsTransformer transformer)
    {
        _transformer = transformer;
    }

    public async Task<string> TransformToCsvAsync(object input, string template)
    {
        // 1. 應用 Handlebars 模板
        var jsonResult = _transformer.Transform(template, input);

        // 2. 解析 JSON 陣列
        var records = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(jsonResult);

        // 3. 轉換為 CSV
        using var writer = new StringWriter();
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = ",",
            HasHeaderRecord = true
        });

        // 動態寫入 CSV
        if (records != null && records.Count > 0)
        {
            // 寫入標題
            var headers = records[0].Keys.ToList();
            foreach (var header in headers)
            {
                csv.WriteField(header);
            }
            await csv.NextRecordAsync();

            // 寫入資料
            foreach (var record in records)
            {
                foreach (var header in headers)
                {
                    csv.WriteField(record.ContainsKey(header) ? record[header] : "");
                }
                await csv.NextRecordAsync();
            }
        }

        return writer.ToString();
    }
}
```

### 使用範例

```csharp
// 範例資料
var input = new
{
    users = new[]
    {
        new { id = 1, name = "Alice", email = "alice@example.com" },
        new { id = 2, name = "Bob", email = "bob@example.com" }
    }
};

// Handlebars 模板
var template = @"
[
{{#each users}}
  {{#unless @first}},{{/unless}}
  {
    ""id"": {{id}},
    ""name"": {{json name}},
    ""email"": {{json email}}
  }
{{/each}}
]";

// 執行轉換
var transformer = new HandlebarsTransformer();
var csvService = new CsvTransformationService(transformer);
var csv = await csvService.TransformToCsvAsync(input, template);

Console.WriteLine(csv);
// 輸出:
// id,name,email
// 1,Alice,alice@example.com
// 2,Bob,bob@example.com
```

---

## 效能最佳化建議

### 1. 模板快取

```csharp
using System.Collections.Concurrent;

public class HandlebarsTransformerWithCache
{
    private readonly IHandlebars _handlebars;
    private readonly ConcurrentDictionary<string, HandlebarsTemplate<object, object>> _templateCache;

    public HandlebarsTransformerWithCache()
    {
        _handlebars = Handlebars.Create();
        _templateCache = new ConcurrentDictionary<string, HandlebarsTemplate<object, object>>();
        HandlebarsHelpers.RegisterAllHelpers(_handlebars);
    }

    public string Transform(string template, object data)
    {
        var compiledTemplate = _templateCache.GetOrAdd(template, t => _handlebars.Compile(t));
        return compiledTemplate(data);
    }

    public void ClearCache()
    {
        _templateCache.Clear();
    }
}
```

### 2. 使用 Memory Pool

```csharp
using System.Buffers;

public class MemoryEfficientTransformer
{
    private readonly ArrayPool<byte> _pool = ArrayPool<byte>.Shared;

    public async Task<string> TransformLargeDataAsync(object input, string template)
    {
        var buffer = _pool.Rent(1024 * 1024); // 1MB buffer

        try
        {
            // 使用 buffer 進行處理
            // ...
            return "result";
        }
        finally
        {
            _pool.Return(buffer);
        }
    }
}
```

### 3. 非同步串流處理

```csharp
public class StreamingCsvTransformer
{
    public async IAsyncEnumerable<string> TransformToCSVStreamAsync(IAsyncEnumerable<object> input, string template)
    {
        await foreach (var item in input)
        {
            var result = Transform(item, template);
            yield return result;
        }
    }
}
```

### 4. 使用 System.Text.Json 的高效能選項

```csharp
public static class JsonConfig
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultBufferSize = 16 * 1024, // 16KB
        WriteIndented = false,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };
}
```

---

## 測試建議

### 單元測試範例

```csharp
using Xunit;
using FluentAssertions;

public class HandlebarsTransformerTests
{
    private readonly HandlebarsTransformer _transformer;

    public HandlebarsTransformerTests()
    {
        _transformer = new HandlebarsTransformer();
    }

    [Fact]
    public void Transform_SimpleTemplate_ReturnsExpectedOutput()
    {
        // Arrange
        var template = "Hello {{name}}!";
        var data = new { name = "Alice" };

        // Act
        var result = _transformer.Transform(template, data);

        // Assert
        result.Should().Be("Hello Alice!");
    }

    [Fact]
    public void Transform_WithJsonHelper_ReturnsValidJson()
    {
        // Arrange
        var template = @"{""name"": {{json name}}}";
        var data = new { name = "Alice" };

        // Act
        var result = _transformer.Transform(template, data);

        // Assert
        result.Should().Be(@"{""name"": ""Alice""}");
    }

    [Fact]
    public void Transform_ArrayExpansion_Strategy1()
    {
        // Arrange
        var template = @"
[
{{#each key}}
  {
    ""key"": {{json this}},
    ""name"": {{#if (lookup ../name @index)}}{{json (lookup ../name @index)}}{{else}}null{{/if}}
  }{{#unless @last}},{{/unless}}
{{/each}}
]";
        var data = new
        {
            key = new[] { 1, 2, 3 },
            name = new[] { "Alice", "Bob" }
        };

        // Act
        var result = _transformer.Transform(template, data);
        var parsed = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(result);

        // Assert
        parsed.Should().HaveCount(3);
        parsed[0]["name"].ToString().Should().Be("Alice");
        parsed[1]["name"].ToString().Should().Be("Bob");
        parsed[2]["name"].ToString().Should().Be("null");
    }
}
```

---

## 部署建議

### Docker 部署

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ApiGateway.Api/ApiGateway.Api.csproj", "ApiGateway.Api/"]
COPY ["ApiGateway.Core/ApiGateway.Core.csproj", "ApiGateway.Core/"]
COPY ["ApiGateway.Infrastructure/ApiGateway.Infrastructure.csproj", "ApiGateway.Infrastructure/"]
RUN dotnet restore "ApiGateway.Api/ApiGateway.Api.csproj"
COPY . .
WORKDIR "/src/ApiGateway.Api"
RUN dotnet build "ApiGateway.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ApiGateway.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ApiGateway.Api.dll"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api-gateway:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Data Source=/data/database.sqlite
    volumes:
      - ./data:/data
    restart: unless-stopped
```

---

## 總結

### 關鍵套件列表

```xml
<ItemGroup>
  <!-- 核心功能 -->
  <PackageReference Include="Handlebars.Net" Version="2.1.6" />
  <PackageReference Include="CsvHelper" Version="30.0.1" />

  <!-- 資料庫 -->
  <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.0" />
  <PackageReference Include="Dapper" Version="2.1.28" />

  <!-- 流量控制 -->
  <PackageReference Include="AspNetCoreRateLimit" Version="5.0.0" />

  <!-- 任務調度 -->
  <PackageReference Include="Quartz" Version="3.8.0" />
  <PackageReference Include="Quartz.Extensions.Hosting" Version="3.8.0" />

  <!-- 驗證 -->
  <PackageReference Include="FluentValidation" Version="11.9.0" />
  <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.0" />

  <!-- 日誌 -->
  <PackageReference Include="Serilog.AspNetCore" Version="8.0.0" />
  <PackageReference Include="Serilog.Sinks.Console" Version="5.0.0" />
  <PackageReference Include="Serilog.Sinks.File" Version="5.0.0" />
</ItemGroup>
```

### 開發步驟建議

1. **第一階段**：核心轉換功能
   - 實作 HandlebarsTransformer
   - 註冊所有 Helpers
   - 實作 Pipeline 架構

2. **第二階段**：資料存取層
   - 設計資料庫結構
   - 實作 Repository 或使用 EF Core
   - 資料遷移腳本

3. **第三階段**：API 服務層
   - 建立 Controllers
   - 實作業務邏輯服務
   - API 文件（Swagger）

4. **第四階段**：進階功能
   - 流量限制
   - 告警監控
   - 日誌記錄

5. **第五階段**：測試與部署
   - 單元測試
   - 整合測試
   - Docker 容器化

---

## 版本資訊

- **文件版本**: 1.0
- **最後更新**: 2025-11-25
- **適用 .NET 版本**: .NET 8.0+
- **對應 Node.js 版本**: API Gateway v1.0
