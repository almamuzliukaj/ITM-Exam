namespace OnlineExam.Api.DTOs
{
    public class UpdateUserDto
    {
        public string FullName { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string? StudentNumber { get; set; }
        public bool IsActive { get; set; }
    }
}
