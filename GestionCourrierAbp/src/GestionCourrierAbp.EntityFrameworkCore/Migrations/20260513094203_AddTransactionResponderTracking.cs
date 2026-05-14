using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCourrierAbp.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionResponderTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ResponderServiceId",
                table: "AppTransactions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponderServiceName",
                table: "AppTransactions",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponderUserName",
                table: "AppTransactions",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ResponderServiceId",
                table: "AppTransactions");

            migrationBuilder.DropColumn(
                name: "ResponderServiceName",
                table: "AppTransactions");

            migrationBuilder.DropColumn(
                name: "ResponderUserName",
                table: "AppTransactions");
        }
    }
}
