using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace GestionCirculationWeb.Migrations
{
    [Migration("20260428120000_AjoutEstTransmissible")]
    public partial class AjoutEstTransmissible : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ajoute la colonne dans les deux tables d'entites existantes avec false par defaut.
            migrationBuilder.AddColumn<bool>(
                name: "EstTransmissible",
                table: "EntitesDJs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EstTransmissible",
                table: "Entites",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstTransmissible",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "EstTransmissible",
                table: "Entites");
        }
    }
}
