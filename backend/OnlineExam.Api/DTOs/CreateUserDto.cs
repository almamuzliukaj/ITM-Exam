namespace OnlineExam.Api.DTOs
{
    public class CreateUserDto
    {
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string? StudentNumber { get; set; }
        public string Password { get; set; } = null!;
        public bool IsActive { get; set; } = true;
    }
}
