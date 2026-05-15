using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using OnlineExam.Api.Data;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260510143000_AddUniqueExamAttemptConstraint")]
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
