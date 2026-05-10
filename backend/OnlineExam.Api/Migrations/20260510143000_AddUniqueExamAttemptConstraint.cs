using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    public partial class AddUniqueExamAttemptConstraint : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ExamAttempts_ExamId_StudentId",
                table: "ExamAttempts",
                columns: new[] { "ExamId", "StudentId" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExamAttempts_ExamId_StudentId",
                table: "ExamAttempts");
        }
    }
}
