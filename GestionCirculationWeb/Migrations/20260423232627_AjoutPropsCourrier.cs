using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCirculationWeb.Migrations
{
    /// <inheritdoc />
    public partial class AjoutPropsCourrier : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EntitesDJ_Services_IdService",
                table: "EntitesDJ");

            migrationBuilder.DropForeignKey(
                name: "FK_NumerosDossierJuridique_EntitesDJ_EntiteDJId",
                table: "NumerosDossierJuridique");

            migrationBuilder.DropForeignKey(
                name: "FK_Retraits_EntitesDJ_EntiteDJId",
                table: "Retraits");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EntitesDJ",
                table: "EntitesDJ");

            migrationBuilder.RenameTable(
                name: "EntitesDJ",
                newName: "EntitesDJs");

            migrationBuilder.RenameIndex(
                name: "IX_EntitesDJ_IdService",
                table: "EntitesDJs",
                newName: "IX_EntitesDJs_IdService");

            migrationBuilder.AddColumn<string>(
                name: "Destinataire",
                table: "Entites",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Direction",
                table: "Entites",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                table: "Entites",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "EntitesDJs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Destinataire",
                table: "EntitesDJs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Direction",
                table: "EntitesDJs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LienPdf",
                table: "EntitesDJs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                table: "EntitesDJs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sujet",
                table: "EntitesDJs",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EntitesDJs",
                table: "EntitesDJs",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_EntitesDJs_Services_IdService",
                table: "EntitesDJs",
                column: "IdService",
                principalTable: "Services",
                principalColumn: "IdService",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NumerosDossierJuridique_EntitesDJs_EntiteDJId",
                table: "NumerosDossierJuridique",
                column: "EntiteDJId",
                principalTable: "EntitesDJs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Retraits_EntitesDJs_EntiteDJId",
                table: "Retraits",
                column: "EntiteDJId",
                principalTable: "EntitesDJs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EntitesDJs_Services_IdService",
                table: "EntitesDJs");

            migrationBuilder.DropForeignKey(
                name: "FK_NumerosDossierJuridique_EntitesDJs_EntiteDJId",
                table: "NumerosDossierJuridique");

            migrationBuilder.DropForeignKey(
                name: "FK_Retraits_EntitesDJs_EntiteDJId",
                table: "Retraits");

            migrationBuilder.DropPrimaryKey(
                name: "PK_EntitesDJs",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "Destinataire",
                table: "Entites");

            migrationBuilder.DropColumn(
                name: "Direction",
                table: "Entites");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Entites");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "Destinataire",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "Direction",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "LienPdf",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "EntitesDJs");

            migrationBuilder.DropColumn(
                name: "Sujet",
                table: "EntitesDJs");

            migrationBuilder.RenameTable(
                name: "EntitesDJs",
                newName: "EntitesDJ");

            migrationBuilder.RenameIndex(
                name: "IX_EntitesDJs_IdService",
                table: "EntitesDJ",
                newName: "IX_EntitesDJ_IdService");

            migrationBuilder.AddPrimaryKey(
                name: "PK_EntitesDJ",
                table: "EntitesDJ",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_EntitesDJ_Services_IdService",
                table: "EntitesDJ",
                column: "IdService",
                principalTable: "Services",
                principalColumn: "IdService",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NumerosDossierJuridique_EntitesDJ_EntiteDJId",
                table: "NumerosDossierJuridique",
                column: "EntiteDJId",
                principalTable: "EntitesDJ",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Retraits_EntitesDJ_EntiteDJId",
                table: "Retraits",
                column: "EntiteDJId",
                principalTable: "EntitesDJ",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
