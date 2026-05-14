using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCourrierAbp.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionSenderAndCirculationUserTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SenderServiceName",
                table: "AppTransactions",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderUserName",
                table: "AppTransactions",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmetteurUserName",
                table: "AppCirculations",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecepteurUserName",
                table: "AppCirculations",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SenderServiceName",
                table: "AppTransactions");

            migrationBuilder.DropColumn(
                name: "SenderUserName",
                table: "AppTransactions");

            migrationBuilder.DropColumn(
                name: "EmetteurUserName",
                table: "AppCirculations");

            migrationBuilder.DropColumn(
                name: "RecepteurUserName",
                table: "AppCirculations");
        }
    }
}
