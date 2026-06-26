using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOfficialStudentIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OfficialPhotoContentType",
                table: "Users",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OfficialPhotoFileName",
                table: "Users",
                type: "character varying(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "OfficialPhotoSizeBytes",
                table: "Users",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OfficialPhotoUpdatedByUserId",
                table: "Users",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OfficialPhotoUploadedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentNumber",
                table: "Users",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                columns: new[] { "OfficialPhotoContentType", "OfficialPhotoFileName", "OfficialPhotoSizeBytes", "OfficialPhotoUpdatedByUserId", "OfficialPhotoUploadedAt", "StudentNumber" },
                values: new object[] { null, null, null, null, null, "STU-DEMO-001" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("b5769729-e575-4789-b6e7-f7327ede1acc"),
                columns: new[] { "OfficialPhotoContentType", "OfficialPhotoFileName", "OfficialPhotoSizeBytes", "OfficialPhotoUpdatedByUserId", "OfficialPhotoUploadedAt", "StudentNumber" },
                values: new object[] { null, null, null, null, null, "" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("d4c36f34-d494-42f7-9af6-77cf635b2d22"),
                columns: new[] { "OfficialPhotoContentType", "OfficialPhotoFileName", "OfficialPhotoSizeBytes", "OfficialPhotoUpdatedByUserId", "OfficialPhotoUploadedAt", "StudentNumber" },
                values: new object[] { null, null, null, null, null, "" });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                columns: new[] { "OfficialPhotoContentType", "OfficialPhotoFileName", "OfficialPhotoSizeBytes", "OfficialPhotoUpdatedByUserId", "OfficialPhotoUploadedAt", "StudentNumber" },
                values: new object[] { null, null, null, null, null, "" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_StudentNumber",
                table: "Users",
                column: "StudentNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_StudentNumber",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OfficialPhotoContentType",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OfficialPhotoFileName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OfficialPhotoSizeBytes",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OfficialPhotoUpdatedByUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OfficialPhotoUploadedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StudentNumber",
                table: "Users");
        }
    }
}
