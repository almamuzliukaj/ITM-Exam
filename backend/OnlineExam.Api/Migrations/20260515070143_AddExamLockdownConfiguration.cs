using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExamLockdownConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Exams"
                ADD COLUMN IF NOT EXISTS "RequiresLockdown" boolean NOT NULL DEFAULT FALSE;

                ALTER TABLE "Exams"
                ADD COLUMN IF NOT EXISTS "AllowedClient" text NOT NULL DEFAULT 'StandardBrowser';

                ALTER TABLE "Exams"
                ADD COLUMN IF NOT EXISTS "LockdownMode" text NOT NULL DEFAULT 'Advisory';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowedClient",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "LockdownMode",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "RequiresLockdown",
                table: "Exams");
        }
    }
}
