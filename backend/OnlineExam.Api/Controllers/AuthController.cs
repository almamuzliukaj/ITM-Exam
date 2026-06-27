using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace OnlineExam.Api.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequestDto dto)
        {
            var normalizedEmail = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            var user = _db.Users.FirstOrDefault(u => u.Email.ToLower() == normalizedEmail);

            if (user == null || !user.IsActive)
                return Unauthorized(new { message = "Invalid credentials." });

            if (!PasswordMatches(user.PasswordHash, dto.Password))
                return Unauthorized(new { message = "Invalid credentials." });

            // Preserve compatibility with seeded plaintext demo users by upgrading them after first successful login.
            if (!IsBcryptHash(user.PasswordHash))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                _db.SaveChanges();
            }

            var jwtKey = _config["Jwt:Key"];
            var jwtIssuer = _config["Jwt:Issuer"];

            if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer))
                return StatusCode(500, new { message = "JWT configuration is missing." });

            var key = Encoding.UTF8.GetBytes(jwtKey);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(24),
                Issuer = jwtIssuer,
                Audience = jwtIssuer,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256
                )
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new LoginResponseDto
            {
                Token = tokenHandler.WriteToken(token),
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                StudentNumber = user.Role == "Student" ? BuildStudentNumber(user) : string.Empty,
                PhotoUrl = user.Role == "Student" && !string.IsNullOrWhiteSpace(user.OfficialPhotoFileName)
                    ? Url.Action("GetStudentPhoto", "StudentIdentities", new { studentId = user.Id }) ?? string.Empty
                    : string.Empty,
                Initials = BuildInitials(user.FullName, user.Email)
            });
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            var userIdRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdRaw, out var parsedUserId))
                return Unauthorized(new { message = "Invalid user session." });

            var user = _db.Users.AsNoTracking().FirstOrDefault(x => x.Id == parsedUserId);
            if (user == null || !user.IsActive)
                return Unauthorized(new { message = "Invalid user session." });

            return Ok(new
            {
                userId = user.Id,
                email = user.Email,
                fullName = user.FullName,
                role = user.Role,
                studentNumber = user.Role == "Student" ? BuildStudentNumber(user) : string.Empty,
                photoUrl = user.Role == "Student" && !string.IsNullOrWhiteSpace(user.OfficialPhotoFileName)
                    ? Url.Action("GetStudentPhoto", "StudentIdentities", new { studentId = user.Id }) ?? string.Empty
                    : string.Empty,
                initials = BuildInitials(user.FullName, user.Email)
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin/ping")]
        public IActionResult Ping()
        {
            return Ok("Hello Admin!");
        }

        private static bool IsBcryptHash(string value)
        {
            return !string.IsNullOrWhiteSpace(value) &&
                   (value.StartsWith("$2a$") || value.StartsWith("$2b$") || value.StartsWith("$2y$"));
        }

        private static bool PasswordMatches(string storedHash, string inputPassword)
        {
            if (string.IsNullOrWhiteSpace(storedHash) || string.IsNullOrWhiteSpace(inputPassword))
                return false;

            if (!IsBcryptHash(storedHash))
                return storedHash == inputPassword;

            try
            {
                return BCrypt.Net.BCrypt.Verify(inputPassword, storedHash);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                return false;
            }
        }

        private static string BuildStudentNumber(OnlineExam.Api.Models.User student)
        {
            if (!string.IsNullOrWhiteSpace(student.StudentNumber))
                return student.StudentNumber.Trim();

            var localPart = student.Email.Split('@', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(localPart) && localPart.Any(char.IsDigit))
                return localPart.Trim();

            return $"STU-{student.Id.ToString("N")[..8].ToUpperInvariant()}";
        }

        private static string BuildInitials(string? fullName, string? email)
        {
            var parts = (fullName ?? string.Empty)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Take(2)
                .Select(part => char.ToUpperInvariant(part[0]))
                .ToArray();

            if (parts.Length > 0)
                return new string(parts);

            return string.IsNullOrWhiteSpace(email) ? "ST" : email[..1].ToUpperInvariant();
        }
    }
}
