using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExamAttemptGradingAndPublishing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Score",
                table: "ExamAttempts",
                newName: "AutoScore");

            migrationBuilder.AddColumn<double>(
                name: "FinalScore",
                table: "ExamAttempts",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<DateTime>(
                name: "GradedAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GradedByUserId",
                table: "ExamAttempts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GradingNotes",
                table: "ExamAttempts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGraded",
                table: "ExamAttempts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "ExamAttempts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "ManualScore",
                table: "ExamAttempts",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PublishedByUserId",
                table: "ExamAttempts",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresManualGrading",
                table: "ExamAttempts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("""
                UPDATE "ExamAttempts"
                SET "FinalScore" = "AutoScore",
                    "IsGraded" = TRUE,
                    "RequiresManualGrading" = FALSE;
                """);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 9, 14, 51, 56, 108, DateTimeKind.Utc).AddTicks(6724));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("b5769729-e575-4789-b6e7-f7327ede1acc"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 9, 14, 51, 56, 108, DateTimeKind.Utc).AddTicks(6721));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 9, 14, 51, 56, 108, DateTimeKind.Utc).AddTicks(6717));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FinalScore",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "GradedAt",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "GradedByUserId",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "GradingNotes",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "IsGraded",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "ManualScore",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "PublishedByUserId",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "RequiresManualGrading",
                table: "ExamAttempts");

            migrationBuilder.RenameColumn(
                name: "AutoScore",
                table: "ExamAttempts",
                newName: "Score");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 4, 21, 11, 19, 991, DateTimeKind.Utc).AddTicks(9407));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("b5769729-e575-4789-b6e7-f7327ede1acc"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 4, 21, 11, 19, 991, DateTimeKind.Utc).AddTicks(9405));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 4, 21, 11, 19, 991, DateTimeKind.Utc).AddTicks(9401));
        }
    }
}
