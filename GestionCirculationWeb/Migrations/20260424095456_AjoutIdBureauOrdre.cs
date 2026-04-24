using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCirculationWeb.Migrations
{
    /// <inheritdoc />
    public partial class AjoutIdBureauOrdre : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IdBureauOrdre",
                table: "EntitesDJs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "IdBureauOrdre",
                table: "Entites",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IdBureauOrdre",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "IdBureauOrdre",
                table: "Entites");
        }
    }
}
