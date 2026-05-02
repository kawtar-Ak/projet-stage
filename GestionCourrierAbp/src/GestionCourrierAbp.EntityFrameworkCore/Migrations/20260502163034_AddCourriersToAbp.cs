using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCourrierAbp.Migrations
{
    /// <inheritdoc />
    public partial class AddCourriersToAbp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppCourriersAdministratifs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdBureauOrdre = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Sujet = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Destinataire = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Etat = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LienPdf = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TypeDocument = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NumeroDeCourrier = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    TypeRegistre = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TypeCorrespondance = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ParentId = table.Column<int>(type: "int", nullable: true),
                    EstTransmissible = table.Column<bool>(type: "bit", nullable: false),
                    EstArchive = table.Column<bool>(type: "bit", nullable: false),
                    ServiceId = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppCourriersAdministratifs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppCourriersAdministratifs_AppServices_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "AppServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppCourriersJudiciaires",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdBureauOrdre = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TribunalSource = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Sujet = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Destinataire = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EtatArchive = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Emplacement = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    LienPdf = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    EstTransmissible = table.Column<bool>(type: "bit", nullable: false),
                    EstArchive = table.Column<bool>(type: "bit", nullable: false),
                    ServiceId = table.Column<int>(type: "int", nullable: false),
                    NumeroDossierAnnee = table.Column<int>(type: "int", nullable: true),
                    NumeroDossierNombre = table.Column<int>(type: "int", nullable: true),
                    NumeroDossierSujet = table.Column<int>(type: "int", nullable: true),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppCourriersJudiciaires", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppCourriersJudiciaires_AppServices_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "AppServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppRetraitsJudiciaires",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateDeRetrait = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MotifDeRetrait = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    EffectuePar = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    DateDeRetour = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    CourrierJudiciaireId = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRetraitsJudiciaires", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRetraitsJudiciaires_AppCourriersJudiciaires_CourrierJudiciaireId",
                        column: x => x.CourrierJudiciaireId,
                        principalTable: "AppCourriersJudiciaires",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppCourriersAdministratifs_ServiceId",
                table: "AppCourriersAdministratifs",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_AppCourriersJudiciaires_ServiceId",
                table: "AppCourriersJudiciaires",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_AppRetraitsJudiciaires_CourrierJudiciaireId",
                table: "AppRetraitsJudiciaires",
                column: "CourrierJudiciaireId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppCourriersAdministratifs");

            migrationBuilder.DropTable(
                name: "AppRetraitsJudiciaires");

            migrationBuilder.DropTable(
                name: "AppCourriersJudiciaires");
        }
    }
}
