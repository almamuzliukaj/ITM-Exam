using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExamIntegrityPolicyState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttemptViolationCount",
                table: "ExamIntegrityEvents",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PolicyAction",
                table: "ExamIntegrityEvents",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "StudentViolationCount",
                table: "ExamIntegrityEvents",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "IntegrityAutoActionTriggeredAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "IntegrityLastViolationAt",
                table: "ExamAttempts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntegrityPolicyAction",
                table: "ExamAttempts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "IntegrityViolationCount",
                table: "ExamAttempts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql(
                """
                WITH ranked_events AS (
                    SELECT
                        "Id",
                        ROW_NUMBER() OVER (
                            PARTITION BY "ExamAttemptId"
                            ORDER BY "RecordedAt", "OccurredAt", "Id"
                        ) AS attempt_violation_count,
                        ROW_NUMBER() OVER (
                            PARTITION BY "StudentId"
                            ORDER BY "RecordedAt", "OccurredAt", "Id"
                        ) AS student_violation_count
                    FROM "ExamIntegrityEvents"
                )
                UPDATE "ExamIntegrityEvents" AS events
                SET
                    "AttemptViolationCount" = ranked_events.attempt_violation_count,
                    "StudentViolationCount" = ranked_events.student_violation_count,
                    "PolicyAction" = CASE
                        WHEN ranked_events.attempt_violation_count >= 5 THEN 'AutoSubmit'
                        WHEN ranked_events.attempt_violation_count >= 3 THEN 'FinalWarning'
                        WHEN ranked_events.attempt_violation_count > 0 THEN 'Warning'
                        ELSE 'None'
                    END
                FROM ranked_events
                WHERE events."Id" = ranked_events."Id";
                """);

            migrationBuilder.Sql(
                """
                WITH attempt_policy AS (
                    SELECT
                        "ExamAttemptId",
                        COUNT(*) AS violation_count,
                        MAX("OccurredAt") AS last_violation_at,
                        MAX(CASE
                            WHEN "AttemptViolationCount" >= 5 THEN "RecordedAt"
                            ELSE NULL
                        END) AS auto_action_triggered_at
                    FROM "ExamIntegrityEvents"
                    GROUP BY "ExamAttemptId"
                )
                UPDATE "ExamAttempts" AS attempts
                SET
                    "IntegrityViolationCount" = attempt_policy.violation_count,
                    "IntegrityLastViolationAt" = attempt_policy.last_violation_at,
                    "IntegrityAutoActionTriggeredAt" = attempt_policy.auto_action_triggered_at,
                    "IntegrityPolicyAction" = CASE
                        WHEN attempt_policy.violation_count >= 5 THEN 'AutoSubmit'
                        WHEN attempt_policy.violation_count >= 3 THEN 'FinalWarning'
                        WHEN attempt_policy.violation_count > 0 THEN 'Warning'
                        ELSE 'None'
                    END
                FROM attempt_policy
                WHERE attempts."Id" = attempt_policy."ExamAttemptId";
                """);

            migrationBuilder.Sql(
                """
                UPDATE "ExamAttempts"
                SET "IntegrityPolicyAction" = 'None'
                WHERE "IntegrityPolicyAction" = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttemptViolationCount",
                table: "ExamIntegrityEvents");

            migrationBuilder.DropColumn(
                name: "PolicyAction",
                table: "ExamIntegrityEvents");

            migrationBuilder.DropColumn(
                name: "StudentViolationCount",
                table: "ExamIntegrityEvents");

            migrationBuilder.DropColumn(
                name: "IntegrityAutoActionTriggeredAt",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "IntegrityLastViolationAt",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "IntegrityPolicyAction",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "IntegrityViolationCount",
                table: "ExamAttempts");
        }
    }
}
