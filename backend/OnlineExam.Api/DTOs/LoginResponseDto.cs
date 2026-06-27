namespace OnlineExam.Api.DTOs
{
    public class LoginResponseDto
    {
        public string Token { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string StudentNumber { get; set; } = string.Empty;
        public string PhotoUrl { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
    }
}
