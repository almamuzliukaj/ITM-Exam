namespace OnlineExam.Api.DTOs
{
    public class ResetPasswordDto
    {
        public string NewPassword { get; set; } = null!;
    }

    public class ChangeOwnPasswordDto
    {
        public string CurrentPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
        public string ConfirmPassword { get; set; } = null!;
    }
}
