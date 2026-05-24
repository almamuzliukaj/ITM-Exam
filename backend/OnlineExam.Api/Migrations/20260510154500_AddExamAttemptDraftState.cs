using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    public partial class AddExamAttemptDraftState : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "ExamAttempts"
                ADD COLUMN IF NOT EXISTS "StartedAt" timestamp with time zone;

                ALTER TABLE "ExamAttempts"
                ADD COLUMN IF NOT EXISTS "LastSavedAt" timestamp with time zone NULL;

                ALTER TABLE "ExamAttempts"
                ADD COLUMN IF NOT EXISTS "Status" text;

                ALTER TABLE "ExamAttempts"
                ALTER COLUMN "SubmittedAt" DROP NOT NULL;

                UPDATE "ExamAttempts"
                SET "StartedAt" = COALESCE("StartedAt", "SubmittedAt", NOW()),
                    "Status" = COALESCE(NULLIF("Status", ''), 'InProgress');

                ALTER TABLE "ExamAttempts"
                ALTER COLUMN "StartedAt" SET DEFAULT NOW(),
                ALTER COLUMN "StartedAt" SET NOT NULL,
                ALTER COLUMN "Status" SET DEFAULT 'InProgress',
                ALTER COLUMN "Status" SET NOT NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE "ExamAttempts"
                SET "Status" = 'Submitted',
                    "StartedAt" = COALESCE("StartedAt", "SubmittedAt", NOW()),
                    "LastSavedAt" = COALESCE("LastSavedAt", "SubmittedAt")
                WHERE "SubmittedAt" IS NOT NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "ExamAttempts"
                SET "SubmittedAt" = COALESCE("SubmittedAt", "LastSavedAt", "StartedAt", NOW());
                """);

            migrationBuilder.AlterColumn<DateTime>(
                name: "SubmittedAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "LastSavedAt",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ExamAttempts");
        }
    }
}
