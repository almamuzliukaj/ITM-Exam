using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExam.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionOptionsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OptionsJson",
                table: "Questions",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 4, 10, 7, 16, 244, DateTimeKind.Utc).AddTicks(5624));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("b5769729-e575-4789-b6e7-f7327ede1acc"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 4, 10, 7, 16, 244, DateTimeKind.Utc).AddTicks(5622));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                column: "CreatedAt",
                value: new DateTime(2026, 5, 4, 10, 7, 16, 244, DateTimeKind.Utc).AddTicks(5618));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OptionsJson",
                table: "Questions");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("4c7b418b-5853-4c9c-9ef4-5e1d4e65cad1"),
                column: "CreatedAt",
                value: new DateTime(2026, 4, 17, 8, 21, 26, 122, DateTimeKind.Utc).AddTicks(549));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("b5769729-e575-4789-b6e7-f7327ede1acc"),
                column: "CreatedAt",
                value: new DateTime(2026, 4, 17, 8, 21, 26, 122, DateTimeKind.Utc).AddTicks(546));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("f9635e15-1d90-4e3b-b722-331a8fc2fbe9"),
                column: "CreatedAt",
                value: new DateTime(2026, 4, 17, 8, 21, 26, 122, DateTimeKind.Utc).AddTicks(538));
        }
    }
}
