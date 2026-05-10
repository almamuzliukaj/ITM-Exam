using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    public partial class AddExamAttemptDraftState : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSavedAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "ExamAttempts",
                type: "text",
                nullable: false,
                defaultValue: "InProgress");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SubmittedAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.Sql("""
                UPDATE "ExamAttempts"
                SET "Status" = 'Submitted',
                    "StartedAt" = COALESCE("SubmittedAt", NOW()),
                    "LastSavedAt" = "SubmittedAt"
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
