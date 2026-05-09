using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;
using OnlineExam.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace OnlineExam.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private static readonly string[] AllowedRoles = ["Professor", "Assistant", "Student", "Admin"];
        private readonly AppDbContext _context;
        private readonly IAuditLogService _auditLogService;

        public UsersController(AppDbContext context, IAuditLogService auditLogService)
        {
            _context = context;
            _auditLogService = auditLogService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            var validationError = ValidateCreateOrUpdate(dto.FullName, dto.Email, dto.Role, dto.Password, requirePassword: true);
            if (validationError != null)
                return validationError;

            var normalizedEmail = NormalizeEmail(dto.Email);
            if (await _context.Users.AnyAsync(x => x.Email == normalizedEmail))
                return Conflict(new { message = "Email already exists." });

            var user = BuildUser(normalizedEmail, dto.FullName, dto.Role, dto.Password, dto.IsActive);
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("User.Created", "User", user.Id, new
            {
                user.Email,
                user.Role,
                user.IsActive
            }, "UserManagement");

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, ToResponse(user));
        }

        [HttpPost("import")]
        public async Task<IActionResult> ImportUsers([FromBody] ImportUsersDto dto)
        {
            if (dto.Users.Count == 0)
                return BadRequest(new { message = "At least one user row is required." });

            var importedUsers = new List<object>();
            var errors = new List<object>();
            var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var row in dto.Users)
            {
                var normalizedEmail = NormalizeEmail(row.Email);
                var fullName = row.FullName?.Trim() ?? string.Empty;
                var role = row.Role?.Trim() ?? string.Empty;
                var password = ResolvePassword(dto, row);

                if (string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    errors.Add(new { email = row.Email ?? string.Empty, message = "Email is required." });
                    continue;
                }

                if (!seenEmails.Add(normalizedEmail))
                {
                    errors.Add(new { email = normalizedEmail, message = "Duplicate email in import file." });
                    continue;
                }

                var validationError = ValidateCreateOrUpdate(fullName, normalizedEmail, role, password, requirePassword: true);
                if (validationError is BadRequestObjectResult badRequest)
                {
                    errors.Add(new { email = normalizedEmail, message = ExtractMessage(badRequest.Value) });
                    continue;
                }

                if (await _context.Users.AnyAsync(x => x.Email == normalizedEmail))
                {
                    errors.Add(new { email = normalizedEmail, message = "Email already exists." });
                    continue;
                }

                var user = BuildUser(normalizedEmail, fullName, role, password, row.IsActive);
                _context.Users.Add(user);

                importedUsers.Add(new
                {
                    user.Id,
                    user.Email,
                    user.FullName,
                    user.Role,
                    TemporaryPassword = row.Password.IsNullOrWhiteSpace() && dto.DefaultPassword.IsNullOrWhiteSpace() ? password : null
                });
            }

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("User.Imported", "User", null, new
            {
                Requested = dto.Users.Count,
                Imported = importedUsers.Count,
                Failed = errors.Count
            }, "UserManagement");

            return Ok(new
            {
                requested = dto.Users.Count,
                imported = importedUsers.Count,
                failed = errors.Count,
                users = importedUsers,
                errors
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] string? role, [FromQuery] bool? isActive, [FromQuery] string? search)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
            {
                var normalizedRole = role.Trim();
                query = query.Where(x => x.Role == normalizedRole);
            }

            if (isActive.HasValue)
                query = query.Where(x => x.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(x =>
                    x.FullName.ToLower().Contains(term) ||
                    x.Email.ToLower().Contains(term));
            }

            var users = await query
                .OrderBy(x => x.FullName)
                .Select(user => new UserResponseDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    FullName = user.FullName,
                    Role = user.Role,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            return Ok(ToResponse(user));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            var validationError = ValidateUpdate(dto.FullName, dto.Role);
            if (validationError != null)
                return validationError;

            user.FullName = dto.FullName.Trim();
            user.Role = dto.Role.Trim();
            user.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("User.Updated", "User", user.Id, new
            {
                user.Email,
                user.Role,
                user.IsActive
            }, "UserManagement");
            return Ok(ToResponse(user));
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            user.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("User.StatusUpdated", "User", user.Id, new
            {
                user.Email,
                user.IsActive
            }, "UserManagement");

            return Ok(ToResponse(user));
        }

        [HttpPut("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            if (!IsValidPassword(dto.NewPassword))
                return BadRequest(new { message = "Password must be at least 8 characters and include upper, lower, and number." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync("User.PasswordReset", "User", user.Id, new
            {
                user.Email
            }, "UserManagement");

            return Ok(new { message = "Password reset successfully." });
        }

        private IActionResult? ValidateCreateOrUpdate(string? fullName, string? email, string? role, string? password, bool requirePassword)
        {
            if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 2 || fullName.Trim().Length > 120)
                return BadRequest(new { message = "Full name must be between 2 and 120 characters." });

            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            var emailValidator = new EmailAddressAttribute();
            if (!emailValidator.IsValid(email))
                return BadRequest(new { message = "Email format is invalid." });

            if (!IsRoleAllowed(role))
                return BadRequest(new { message = "Role must be Student, Professor, Assistant, or Admin." });

            if (requirePassword && !IsValidPassword(password))
                return BadRequest(new { message = "Password must be at least 8 characters and include upper, lower, and number." });

            return null;
        }

        private IActionResult? ValidateUpdate(string? fullName, string? role)
        {
            if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 2 || fullName.Trim().Length > 120)
                return BadRequest(new { message = "Full name must be between 2 and 120 characters." });

            if (!IsRoleAllowed(role))
                return BadRequest(new { message = "Role must be Student, Professor, Assistant, or Admin." });

            return null;
        }

        private static bool IsRoleAllowed(string? role) =>
            AllowedRoles.Contains(role?.Trim(), StringComparer.OrdinalIgnoreCase);

        private static bool IsValidPassword(string? password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
                return false;

            var hasUpper = password.Any(char.IsUpper);
            var hasLower = password.Any(char.IsLower);
            var hasDigit = password.Any(char.IsDigit);
            return hasUpper && hasLower && hasDigit;
        }

        private static string NormalizeEmail(string? email) =>
            email?.Trim().ToLowerInvariant() ?? string.Empty;

        private static User BuildUser(string email, string fullName, string role, string password, bool isActive)
        {
            return new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                FullName = fullName.Trim(),
                Role = role.Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow
            };
        }

        private static string ResolvePassword(ImportUsersDto dto, ImportUserRowDto row)
        {
            if (!string.IsNullOrWhiteSpace(row.Password))
                return row.Password.Trim();

            if (!string.IsNullOrWhiteSpace(dto.DefaultPassword))
                return dto.DefaultPassword.Trim();

            return dto.GeneratePasswords ? $"Temp{Guid.NewGuid():N}"[..12] : string.Empty;
        }

        private static UserResponseDto ToResponse(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            };
        }

        private static string ExtractMessage(object? value)
        {
            if (value == null)
                return "Validation failed.";

            var messageProperty = value.GetType().GetProperty("message");
            return messageProperty?.GetValue(value)?.ToString() ?? "Validation failed.";
        }
    }

    internal static class StringExtensions
    {
        public static bool IsNullOrWhiteSpace(this string? value) => string.IsNullOrWhiteSpace(value);
    }
}
