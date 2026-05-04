using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    public partial class AddMissingExamCourseOfferingColumn : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Exams"
                ADD COLUMN IF NOT EXISTS "CourseOfferingId" uuid NULL;
                """);

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_Exams_CourseOfferingId"
                ON "Exams" ("CourseOfferingId");
                """);

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'FK_Exams_CourseOfferings_CourseOfferingId'
                    ) THEN
                        ALTER TABLE "Exams"
                        ADD CONSTRAINT "FK_Exams_CourseOfferings_CourseOfferingId"
                        FOREIGN KEY ("CourseOfferingId")
                        REFERENCES "CourseOfferings" ("Id")
                        ON DELETE SET NULL;
                    END IF;
                END
                $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE "Exams"
                DROP CONSTRAINT IF EXISTS "FK_Exams_CourseOfferings_CourseOfferingId";
                """);

            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS "IX_Exams_CourseOfferingId";
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE "Exams"
                DROP COLUMN IF EXISTS "CourseOfferingId";
                """);
        }
    }
}
