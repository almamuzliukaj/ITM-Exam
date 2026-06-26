using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExamSessionBindings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExamSessionBindings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExamStudentAccessId = table.Column<Guid>(type: "uuid", nullable: true),
                    SessionReferenceHash = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    BoundAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastHeartbeatAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DisconnectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevokedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RevocationReason = table.Column<string>(type: "text", nullable: false),
                    ReplacedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByBindingId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserAgent = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamSessionBindings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamSessionBindings_ExamAttempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "ExamAttempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ExamSessionBindings_ExamStudentAccesses_ExamStudentAccessId",
                        column: x => x.ExamStudentAccessId,
                        principalTable: "ExamStudentAccesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ExamSessionBindings_Exams_ExamId",
                        column: x => x.ExamId,
                        principalTable: "Exams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExamSessionBindings_AttemptId",
                table: "ExamSessionBindings",
                column: "AttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamSessionBindings_ExamId_StudentId_SessionReferenceHash",
                table: "ExamSessionBindings",
                columns: new[] { "ExamId", "StudentId", "SessionReferenceHash" });

            migrationBuilder.CreateIndex(
                name: "IX_ExamSessionBindings_ExamId_StudentId_Status",
                table: "ExamSessionBindings",
                columns: new[] { "ExamId", "StudentId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ExamSessionBindings_ExamStudentAccessId",
                table: "ExamSessionBindings",
                column: "ExamStudentAccessId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExamSessionBindings");
        }
    }
}
