using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ActorRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Action = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    EntityType = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: true),
                    Scope = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    DetailsJson = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 9, 19, 13, 39, 246, DateTimeKind.Utc).AddTicks(6822));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("b5769729-e575-4789-b6e7-f7327ede1acc"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 9, 19, 13, 39, 246, DateTimeKind.Utc).AddTicks(6819));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 9, 19, 13, 39, 246, DateTimeKind.Utc).AddTicks(6811));

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CreatedAt",
                table: "AuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_EntityType_EntityId",
                table: "AuditLogs",
                columns: new[] { "EntityType", "EntityId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");

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
    }
}
