using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExamMaximumPoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Exams"
                ADD COLUMN IF NOT EXISTS "MaximumPoints" integer NOT NULL DEFAULT 100;

                UPDATE "Exams" AS exams
                SET "MaximumPoints" = COALESCE(points.total_points, 100)
                FROM (
                    SELECT "ExamId", GREATEST(SUM("Points"), 1) AS total_points
                    FROM "Questions"
                    GROUP BY "ExamId"
                ) AS points
                WHERE exams."Id" = points."ExamId";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaximumPoints",
                table: "Exams");
        }
    }
}
