using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAttemptQuestionRandomization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "ExamAttempts"
                ADD COLUMN IF NOT EXISTS "AttemptQuestionOrderJson" text NULL;

                ALTER TABLE "ExamAttempts"
                ADD COLUMN IF NOT EXISTS "AttemptVersionSignature" text NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttemptQuestionOrderJson",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "AttemptVersionSignature",
                table: "ExamAttempts");
        }
    }
}
