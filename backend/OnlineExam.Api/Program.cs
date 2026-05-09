using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Logging;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// JWT config
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];

if (string.IsNullOrEmpty(jwtKey))
    throw new Exception("JWT Key is missing in appsettings.json");
if (string.IsNullOrEmpty(jwtIssuer))
    throw new Exception("JWT Issuer is missing in appsettings.json");

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();

// ================= SWAGGER JWT AUTH ======================
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "OnlineExam API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme.<br/>
        Enter 'Bearer' [SPACE] and then your token in the text input below.<br/>
        Example: <b>Bearer YOUR_TOKEN_HERE</b>",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new List<string>()
        }
    });
});
// ======================================================

// CORS configuration: lejon vetëm frontend-in (React/Vite) të komunikojë
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        b => b.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; // For development only
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    const int maxAttempts = 10;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            logger.LogInformation("Applying pending database migrations (attempt {Attempt}/{MaxAttempts})...", attempt, maxAttempts);
            db.Database.Migrate();
            logger.LogInformation("Database migrations applied successfully.");
            break;
        }
        catch (NpgsqlException ex) when (attempt < maxAttempts)
        {
            logger.LogWarning(ex, "Database is not ready yet. Retrying in 3 seconds...");
            Thread.Sleep(TimeSpan.FromSeconds(3));
        }
    }
}

if (app.Environment.IsDevelopment())
{
    EnsureDemoUsers(app);
    app.UseSwagger();
    app.UseSwaggerUI(); // <-- Kjo është për Swagger!
}

// KJO ËSHTË VIJA QË ZGJIDH PROBLEMIN E FETCH (CORS)!
// Duhet të jetë PARA Authentication dhe Authorization:
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

static void EnsureDemoUsers(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var demoUsers = new[]
    {
        new { Id = Guid.Parse("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"), FullName = "Admin User", Email = "admin@onlineexam.com", Password = "Password123!", Role = "Admin" },
        new { Id = Guid.Parse("b5769729-e575-4789-b6e7-f7327ede1acc"), FullName = "Professor", Email = "prof@onlineexam.com", Password = "Password123!", Role = "Professor" },
        new { Id = Guid.Parse("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"), FullName = "Student", Email = "student@onlineexam.com", Password = "Password123!", Role = "Student" }
    };

    foreach (var demo in demoUsers)
    {
        var user = db.Users.FirstOrDefault(x => x.Email == demo.Email);
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(demo.Password);

        if (user is null)
        {
            db.Users.Add(new User
            {
                Id = demo.Id,
                FullName = demo.FullName,
                Email = demo.Email,
                PasswordHash = passwordHash,
                Role = demo.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

            continue;
        }

        user.FullName = demo.FullName;
        user.Role = demo.Role;
        user.IsActive = true;
        user.PasswordHash = passwordHash;
    }

    db.SaveChanges();
}
