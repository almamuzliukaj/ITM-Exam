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
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Exceptions;
using OnlineExam.Api.Filters;
using OnlineExam.Api.Services;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// JWT config
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];

if (string.IsNullOrEmpty(jwtKey))
    throw new Exception("JWT Key is missing in appsettings.json");
if (string.IsNullOrEmpty(jwtIssuer))
    throw new Exception("JWT Issuer is missing in appsettings.json");

// Add services to the container.
builder.Services.AddControllers(options =>
    {
        options.Filters.Add<ApiErrorResponseFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errorResponse = ApiErrorResponse.Create(
            context.HttpContext,
            StatusCodes.Status400BadRequest,
            "Validation failed.",
            context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    x => x.Key,
                    x => x.Value!.Errors.Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage) ? "Invalid value." : error.ErrorMessage).ToArray()),
            "validation_error");

        return new BadRequestObjectResult(errorResponse);
    };
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.Configure<SmuIntegrationOptions>(builder.Configuration.GetSection("SmuIntegration"));
builder.Services.AddScoped<ISmuMappingService, SmuMappingService>();
builder.Services.AddScoped<ISmuSyncService, SmuSyncService>();
builder.Services.AddHttpClient<ISmuApiClient, SmuApiClient>((serviceProvider, client) =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<SmuIntegrationOptions>>().Value;

    if (!string.IsNullOrWhiteSpace(options.BaseUrl))
        client.BaseAddress = new Uri(options.BaseUrl);

    client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds > 0 ? options.TimeoutSeconds : 15);
});

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
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var response = ApiErrorResponse.Create(
                    context.HttpContext,
                    StatusCodes.Status401Unauthorized,
                    "Authentication is required to access this resource.");

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";

                var response = ApiErrorResponse.Create(
                    context.HttpContext,
                    StatusCodes.Status403Forbidden,
                    "You do not have permission to perform this action.");

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
        };
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
            EnsureRuntimeSchema(db, logger);
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
    EnsureStableDemoData(app);
    app.UseSwagger();
    app.UseSwaggerUI(); // <-- Kjo është për Swagger!
}

// KJO ËSHTË VIJA QË ZGJIDH PROBLEMIN E FETCH (CORS)!
// Duhet të jetë PARA Authentication dhe Authorization:
app.UseExceptionHandler(handler =>
{
    handler.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        if (exception == null || context.Response.HasStarted)
            return;

        var (statusCode, message, code, details) = exception switch
        {
            ExternalServiceException externalServiceException => (
                externalServiceException.StatusCode,
                externalServiceException.Message,
                externalServiceException.ErrorCode,
                externalServiceException.Details),
            TaskCanceledException when !context.RequestAborted.IsCancellationRequested => (
                StatusCodes.Status504GatewayTimeout,
                "The request timed out while waiting for a dependent service.",
                "request_timeout",
                null),
            OperationCanceledException when !context.RequestAborted.IsCancellationRequested => (
                StatusCodes.Status504GatewayTimeout,
                "The request timed out while waiting for a dependent service.",
                "request_timeout",
                null),
            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected server error occurred.",
                "server_error",
                null)
        };

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var errorResponse = ApiErrorResponse.Create(context, statusCode, message, details, code);
        await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse));
    });
});

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    if (response.StatusCode < 400 || response.ContentLength.GetValueOrDefault() > 0 || response.HasStarted)
        return;

    response.ContentType = "application/json";
    var errorResponse = ApiErrorResponse.Create(
        context.HttpContext,
        response.StatusCode,
        response.StatusCode switch
        {
            StatusCodes.Status401Unauthorized => "Authentication is required to access this resource.",
            StatusCodes.Status403Forbidden => "You do not have permission to perform this action.",
            StatusCodes.Status404NotFound => "The requested resource was not found.",
            _ => "The request failed."
        });

    await response.WriteAsync(JsonSerializer.Serialize(errorResponse));
});
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
        new { Id = Guid.Parse("d4c36f34-d494-42f7-9af6-77cf635b2d22"), FullName = "Assistant", Email = "assistant@onlineexam.com", Password = "Password123!", Role = "Assistant" },
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

static void EnsureRuntimeSchema(AppDbContext db, ILogger logger)
{
    try
    {
        db.Database.ExecuteSqlRaw("""
            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "Status" text NOT NULL DEFAULT 'Draft';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "RequiresLockdown" boolean NOT NULL DEFAULT FALSE;

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "AllowedClient" text NOT NULL DEFAULT 'StandardBrowser';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "LockdownMode" text NOT NULL DEFAULT 'Advisory';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "MaximumPoints" integer NOT NULL DEFAULT 100;
            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamp with time zone NULL;

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "PublishedAt" timestamp with time zone NULL;

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "UnpublishedAt" timestamp with time zone NULL;

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "AssessmentType" text NOT NULL DEFAULT 'Exam';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "ExamPeriod" text NOT NULL DEFAULT 'Custom';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "AcademicYear" text NOT NULL DEFAULT '';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "SemesterLabel" text NOT NULL DEFAULT '';

            ALTER TABLE IF EXISTS "Exams"
            ADD COLUMN IF NOT EXISTS "CohortLabel" text NOT NULL DEFAULT '';

            UPDATE "Exams" AS exams
            SET "MaximumPoints" = COALESCE(points.total_points, "MaximumPoints", 100)
            FROM (
                SELECT "ExamId", GREATEST(SUM("Points"), 1) AS total_points
                FROM "Questions"
                GROUP BY "ExamId"
            ) AS points
            WHERE exams."Id" = points."ExamId"
              AND (exams."MaximumPoints" IS NULL OR exams."MaximumPoints" <= 0);

            UPDATE "Exams"
            SET "Status" = CASE WHEN "IsPublished" THEN 'Published' ELSE 'Draft' END
            WHERE "Status" IS NULL OR "Status" = '';
            UPDATE "Exams"
            SET "AssessmentType" = 'Exam'
            WHERE "AssessmentType" IS NULL OR "AssessmentType" = '';

            UPDATE "Exams"
            SET "AssessmentType" = 'Exam'
            WHERE "AssessmentType" = 'Provim';

            UPDATE "Exams"
            SET "AssessmentType" = 'Colloquium 1'
            WHERE "AssessmentType" IN ('Kollokfium 1', 'Kollokfiumi 1');

            UPDATE "Exams"
            SET "AssessmentType" = 'Colloquium 2'
            WHERE "AssessmentType" IN ('Kollokfium 2', 'Kollokfiumi 2');

            UPDATE "Exams"
            SET "ExamPeriod" = 'January Exam Period'
            WHERE "ExamPeriod" = 'Afati i Janarit';

            UPDATE "Exams"
            SET "ExamPeriod" = 'April Exam Period'
            WHERE "ExamPeriod" = 'Afati i Prillit';

            UPDATE "Exams"
            SET "ExamPeriod" = 'June Exam Period'
            WHERE "ExamPeriod" = 'Afati i Qershorit';

            UPDATE "Exams"
            SET "ExamPeriod" = 'September Exam Period'
            WHERE "ExamPeriod" = 'Afati i Shtatorit';

            UPDATE "Exams"
            SET "ExamPeriod" = 'October Exam Period'
            WHERE "ExamPeriod" = 'Afati i Tetorit';

            UPDATE "Exams"
            SET "ExamPeriod" = 'Custom'
            WHERE "ExamPeriod" IS NULL OR "ExamPeriod" = '';

            UPDATE "Exams" AS exams
            SET "MaximumPoints" = COALESCE(points.total_points, exams."MaximumPoints", 100)
            FROM (
                SELECT "ExamId", GREATEST(SUM("Points"), 1) AS total_points
                FROM "Questions"
                GROUP BY "ExamId"
            ) AS points
            WHERE exams."Id" = points."ExamId"
              AND (exams."MaximumPoints" IS NULL OR exams."MaximumPoints" <= 0);
            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "Status" text NOT NULL DEFAULT 'InProgress';

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "StartedAt" timestamp with time zone NOT NULL DEFAULT NOW();

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "LastSavedAt" timestamp with time zone NULL;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "QuestionScoresJson" text NULL;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "AutoScore" double precision NOT NULL DEFAULT 0;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "ManualScore" double precision NOT NULL DEFAULT 0;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "FinalScore" double precision NOT NULL DEFAULT 0;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "RequiresManualGrading" boolean NOT NULL DEFAULT FALSE;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "IsGraded" boolean NOT NULL DEFAULT FALSE;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "IsPublished" boolean NOT NULL DEFAULT FALSE;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "GradedAt" timestamp with time zone NULL;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "GradedByUserId" uuid NULL;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "GradingNotes" text NULL;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "PublishedAt" timestamp with time zone NULL;

            ALTER TABLE IF EXISTS "ExamAttempts"
            ADD COLUMN IF NOT EXISTS "PublishedByUserId" uuid NULL;

            ALTER TABLE IF EXISTS "Questions"
            ADD COLUMN IF NOT EXISTS "Topic" text NULL;

            ALTER TABLE IF EXISTS "Questions"
            ADD COLUMN IF NOT EXISTS "Difficulty" text NULL;

            ALTER TABLE IF EXISTS "Questions"
            ADD COLUMN IF NOT EXISTS "MetadataJson" text NULL;

            CREATE TABLE IF NOT EXISTS "ExamAccessCodes" (
                "Id" uuid NOT NULL,
                "ExamId" uuid NOT NULL,
                "CodeHash" text NOT NULL,
                "GeneratedByUserId" uuid NOT NULL,
                "GeneratedAt" timestamp with time zone NOT NULL,
                "ExpiresAt" timestamp with time zone NOT NULL,
                "IsActive" boolean NOT NULL DEFAULT TRUE,
                "RevokedAt" timestamp with time zone NULL,
                "RevokedByUserId" uuid NULL,
                CONSTRAINT "PK_ExamAccessCodes" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_ExamAccessCodes_Exams_ExamId" FOREIGN KEY ("ExamId") REFERENCES "Exams" ("Id") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS "IX_ExamAccessCodes_ExamId_IsActive"
            ON "ExamAccessCodes" ("ExamId", "IsActive");

            CREATE TABLE IF NOT EXISTS "ExamStudentAccesses" (
                "Id" uuid NOT NULL,
                "ExamId" uuid NOT NULL,
                "StudentId" uuid NOT NULL,
                "AccessStatus" text NOT NULL DEFAULT 'NotVerified',
                "VerifiedAt" timestamp with time zone NULL,
                "ApprovedByUserId" uuid NULL,
                "ApprovedAt" timestamp with time zone NULL,
                "ApprovalReason" text NOT NULL DEFAULT '',
                "LastActivityAt" timestamp with time zone NULL,
                CONSTRAINT "PK_ExamStudentAccesses" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_ExamStudentAccesses_Exams_ExamId" FOREIGN KEY ("ExamId") REFERENCES "Exams" ("Id") ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_ExamStudentAccesses_ExamId_StudentId"
            ON "ExamStudentAccesses" ("ExamId", "StudentId");

            UPDATE "ExamAttempts"
            SET "Status" = CASE WHEN "SubmittedAt" IS NULL THEN 'InProgress' ELSE 'Submitted' END
            WHERE "Status" IS NULL OR "Status" = '';

            UPDATE "ExamAttempts"
            SET "StartedAt" = COALESCE("SubmittedAt", "StartedAt", NOW()),
                "LastSavedAt" = COALESCE("LastSavedAt", "SubmittedAt", "StartedAt");

            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'ExamAttempts'
                      AND column_name = 'Score'
                ) THEN
                    UPDATE "ExamAttempts"
                    SET "AutoScore" = CASE WHEN "AutoScore" = 0 THEN "Score" ELSE "AutoScore" END,
                        "FinalScore" = CASE WHEN "FinalScore" = 0 THEN "Score" ELSE "FinalScore" END;
                END IF;
            END $$;
            """);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Runtime schema compatibility check could not be completed.");
    }
}

static void EnsureStableDemoData(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var adminId = Guid.Parse("f9635e15-1d90-4e3b-b722-331a8fc2fbe9");
    var professorId = Guid.Parse("b5769729-e575-4789-b6e7-f7327ede1acc");
    var assistantId = Guid.Parse("d4c36f34-d494-42f7-9af6-77cf635b2d22");
    var studentId = Guid.Parse("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1");

    var term = db.Terms.FirstOrDefault(x => x.Code == "DEMO-WS26");
    if (term is null)
    {
        term = new Term
        {
            Id = Guid.Parse("ebb72703-f0f0-48b6-b410-66ae03d2e11a"),
            Code = "DEMO-WS26"
        };
        db.Terms.Add(term);
    }

    term.Name = "Demo Winter Semester 2026/2027";
    term.Season = "Winter";
    term.AcademicYearLabel = "2026/2027";
    term.StartDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
    term.EndDate = new DateTime(2027, 1, 31, 0, 0, 0, DateTimeKind.Utc);
    term.EnrollmentOpenAt = new DateTime(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc);
    term.EnrollmentCloseAt = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc);
    term.Status = "Active";
    term.IsCurrent = true;

    var course = db.Courses.FirstOrDefault(x => x.Code == "SE-DEMO-101");
    if (course is null)
    {
        course = new Course
        {
            Id = Guid.Parse("5b8c781f-c0a6-44be-b6e2-49857332ea66"),
            Code = "SE-DEMO-101"
        };
        db.Courses.Add(course);
    }

    course.Name = "Software Engineering Demo";
    course.Credits = 6;
    course.YearOfStudy = 1;
    course.DefaultSemesterNo = 1;
    course.IsElective = false;
    course.IsActive = true;
    course.Description = "Stable seeded course used for permissions, grading, and walkthrough demos.";

    db.SaveChanges();

    var offering = db.CourseOfferings.FirstOrDefault(x =>
        x.CourseId == course.Id &&
        x.TermId == term.Id &&
        x.SectionCode == "A");

    if (offering is null)
    {
        offering = new CourseOffering
        {
            Id = Guid.Parse("7b236ee5-92ad-4bd4-ae0e-4897ef16dcb6"),
            CourseId = course.Id,
            TermId = term.Id,
            SectionCode = "A",
            CreatedAt = DateTime.UtcNow
        };
        db.CourseOfferings.Add(offering);
    }

    offering.YearOfStudy = 1;
    offering.SemesterNo = 1;
    offering.DeliveryType = "Regular";
    offering.Capacity = 80;
    offering.Status = "Published";
    offering.PrimaryProfessorId = professorId;
    offering.AssistantId = assistantId;
    offering.UpdatedAt = DateTime.UtcNow;

    db.SaveChanges();

    EnsureStaffAssignment(db, offering.Id, professorId, "Professor", "Primary", "FullTeaching", adminId);
    EnsureStaffAssignment(db, offering.Id, assistantId, "Assistant", "Secondary", "GradingOnly", adminId);

    var semesterEnrollment = db.SemesterEnrollments.FirstOrDefault(x => x.StudentId == studentId && x.TermId == term.Id);
    if (semesterEnrollment is null)
    {
        semesterEnrollment = new SemesterEnrollment
        {
            Id = Guid.Parse("7ae34779-c61a-4c4a-8142-a1183f6b84ca"),
            StudentId = studentId,
            TermId = term.Id,
            EnrolledAt = DateTime.UtcNow
        };
        db.SemesterEnrollments.Add(semesterEnrollment);
    }

    semesterEnrollment.YearOfStudy = 1;
    semesterEnrollment.SemesterNo = 1;
    semesterEnrollment.Status = "Approved";
    semesterEnrollment.ApprovedBy = adminId;
    semesterEnrollment.Notes = "Stable seeded semester enrollment for demo walkthroughs.";

    db.SaveChanges();

    var courseEnrollment = db.StudentCourseEnrollments.FirstOrDefault(x =>
        x.StudentId == studentId &&
        x.CourseOfferingId == offering.Id);

    if (courseEnrollment is null)
    {
        courseEnrollment = new StudentCourseEnrollment
        {
            Id = Guid.Parse("74009ddd-a42d-4b83-a466-af25ef1aa863"),
            StudentId = studentId,
            CourseOfferingId = offering.Id,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = adminId
        };
        db.StudentCourseEnrollments.Add(courseEnrollment);
    }

    courseEnrollment.LinkedSemesterEnrollmentId = semesterEnrollment.Id;
    courseEnrollment.EnrollmentSource = "RegularSemester";
    courseEnrollment.Status = "Eligible";
    courseEnrollment.EligibleForExam = true;

    db.SaveChanges();

    var exam = db.Exams.FirstOrDefault(x => x.CourseOfferingId == offering.Id && x.Title == "Seeded Demo Midterm");
    if (exam is null)
    {
        exam = new Exam
        {
            Id = Guid.Parse("0ec629c0-b1a7-4ec1-b968-f78dd4988ee2"),
            Title = "Seeded Demo Midterm",
            CreatedByUserId = professorId,
            CreatedAt = DateTime.UtcNow,
            CourseOfferingId = offering.Id
        };
        db.Exams.Add(exam);
    }

    exam.Description = "Stable demo exam used for Sprint 14 walkthroughs.";
    exam.StartsAt = DateTime.UtcNow.AddDays(-1);
    exam.EndsAt = DateTime.UtcNow.AddDays(30);
    exam.DurationMinutes = 60;
    exam.Status = "Published";
    exam.IsPublished = true;

    db.SaveChanges();

    EnsureQuestion(
        db,
        exam.Id,
        Guid.Parse("a6d4b20c-a9e9-4a1a-8740-8859e88b7107"),
        "MCQ",
        "Which role is allowed to publish exam results?",
        10,
        "[\"Admin\",\"Professor\",\"Student\",\"Assistant\"]",
        "Professor",
        course.Id);

    EnsureQuestion(
        db,
        exam.Id,
        Guid.Parse("8bbde00d-5472-4c17-a005-f60f76d7c4c0"),
        "Text",
        "Explain why audit logs matter in a role-based exam platform.",
        15,
        null,
        null,
        course.Id);

    var bankContainer = db.Exams.FirstOrDefault(x =>
        x.CourseOfferingId == offering.Id &&
        x.Description == $"__QUESTION_BANK__:{offering.Id}");

    if (bankContainer is null)
    {
        bankContainer = new Exam
        {
            Id = Guid.Parse("66303ee6-d2dd-4294-b0e3-f3f10d846ed4"),
            Title = "Question Bank Container",
            Description = $"__QUESTION_BANK__:{offering.Id}",
            StartsAt = DateTime.UtcNow,
            EndsAt = DateTime.UtcNow.AddYears(5),
            DurationMinutes = 0,
            CreatedByUserId = professorId,
            CreatedAt = DateTime.UtcNow,
            IsPublished = false,
            Status = "Draft",
            CourseOfferingId = offering.Id
        };
        db.Exams.Add(bankContainer);
        db.SaveChanges();
    }

    EnsureQuestion(
        db,
        bankContainer.Id,
        Guid.Parse("3d7693a8-c902-4a5f-bf74-66ea2ef6b340"),
        "MCQ",
        "JWT stands for which expansion?",
        10,
        "[\"Java Web Token\",\"JSON Web Token\",\"Joined Web Token\"]",
        "JSON Web Token",
        course.Id);

    db.SaveChanges();
}

static void EnsureStaffAssignment(AppDbContext db, Guid offeringId, Guid userId, string role, string assignmentType, string permissionsProfile, Guid assignedBy)
{
    var assignment = db.CourseOfferingStaffAssignments.FirstOrDefault(x =>
        x.CourseOfferingId == offeringId &&
        x.UserId == userId &&
        x.RoleInOffering == role);

    if (assignment is null)
    {
        db.CourseOfferingStaffAssignments.Add(new CourseOfferingStaffAssignment
        {
            Id = Guid.NewGuid(),
            CourseOfferingId = offeringId,
            UserId = userId,
            RoleInOffering = role,
            AssignmentType = assignmentType,
            PermissionsProfile = permissionsProfile,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = assignedBy,
            IsActive = true
        });

        db.SaveChanges();
        return;
    }

    assignment.AssignmentType = assignmentType;
    assignment.PermissionsProfile = permissionsProfile;
    assignment.AssignedBy = assignedBy;
    assignment.IsActive = true;
    assignment.RevokedAt = null;
    assignment.RevokedBy = null;
}

static void EnsureQuestion(
    AppDbContext db,
    Guid examId,
    Guid questionId,
    string type,
    string text,
    int points,
    string? optionsJson,
    string? correctAnswer,
    Guid courseId)
{
    var question = db.Questions.FirstOrDefault(x => x.Id == questionId);
    if (question is null)
    {
        db.Questions.Add(new Question
        {
            Id = questionId,
            ExamId = examId,
            CourseId = courseId,
            Type = type,
            Text = text,
            Points = points,
            OptionsJson = optionsJson,
            CorrectAnswer = correctAnswer
        });

        return;
    }

    question.ExamId = examId;
    question.CourseId = courseId;
    question.Type = type;
    question.Text = text;
    question.Points = points;
    question.OptionsJson = optionsJson;
    question.CorrectAnswer = correctAnswer;
}
