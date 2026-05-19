using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCourrierAbp.Migrations
{
    /// <inheritdoc />
    public partial class AddJudicialDocumentType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CourrierJudiciaireParentId",
                table: "AppCourriersJudiciaires",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TypeEnregistrementJudiciaire",
                table: "AppCourriersJudiciaires",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "Dossier");

            migrationBuilder.AddColumn<string>(
                name: "TypeDocumentJudiciaire",
                table: "AppCourriersJudiciaires",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_AppCourriersJudiciaires_CourrierJudiciaireParentId",
                table: "AppCourriersJudiciaires",
                column: "CourrierJudiciaireParentId");

            migrationBuilder.AddForeignKey(
                name: "FK_AppCourriersJudiciaires_AppCourriersJudiciaires_CourrierJudiciaireParentId",
                table: "AppCourriersJudiciaires",
                column: "CourrierJudiciaireParentId",
                principalTable: "AppCourriersJudiciaires",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppCourriersJudiciaires_AppCourriersJudiciaires_CourrierJudiciaireParentId",
                table: "AppCourriersJudiciaires");

            migrationBuilder.DropIndex(
                name: "IX_AppCourriersJudiciaires_CourrierJudiciaireParentId",
                table: "AppCourriersJudiciaires");

            migrationBuilder.DropColumn(
                name: "TypeDocumentJudiciaire",
                table: "AppCourriersJudiciaires");

            migrationBuilder.DropColumn(
                name: "TypeEnregistrementJudiciaire",
                table: "AppCourriersJudiciaires");

            migrationBuilder.DropColumn(
                name: "CourrierJudiciaireParentId",
                table: "AppCourriersJudiciaires");
        }
    }
}
