using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCirculationWeb.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Ids",
                columns: table => new
                {
                    IdBureauOrdre = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Annee = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ids", x => x.IdBureauOrdre);
                });

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    IdService = table.Column<int>(type: "int", nullable: false),
                    NomService = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Etage = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.IdService);
                });

            migrationBuilder.CreateTable(
                name: "Entites",
                columns: table => new
                {
                    IdEntite = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Etat = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LienPdf = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TypeDocument = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NumeroDeCourrier = table.Column<int>(type: "int", nullable: false),
                    TypeGenerale = table.Column<int>(type: "int", nullable: false),
                    Sujet = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IdService = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Entites", x => x.IdEntite);
                    table.ForeignKey(
                        name: "FK_Entites_Services_IdService",
                        column: x => x.IdService,
                        principalTable: "Services",
                        principalColumn: "IdService",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EntitesDJ",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EtatArchive = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TribunalSource = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateArchivage = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Emplacement = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IdService = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntitesDJ", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EntitesDJ_Services_IdService",
                        column: x => x.IdService,
                        principalTable: "Services",
                        principalColumn: "IdService",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Equipements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Serial = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Etat = table.Column<int>(type: "int", nullable: false),
                    IdService = table.Column<int>(type: "int", nullable: false),
                    EstCharge = table.Column<bool>(type: "bit", nullable: false),
                    DateDechargement = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Equipements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Equipements_Services_IdService",
                        column: x => x.IdService,
                        principalTable: "Services",
                        principalColumn: "IdService",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Registres",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TypeDeRegistre = table.Column<int>(type: "int", nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IdService = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Registres", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Registres_Services_IdService",
                        column: x => x.IdService,
                        principalTable: "Services",
                        principalColumn: "IdService",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Utilisateurs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NomComplet = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Login = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IdService = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Utilisateurs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Utilisateurs_Services_IdService",
                        column: x => x.IdService,
                        principalTable: "Services",
                        principalColumn: "IdService",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Circulations",
                columns: table => new
                {
                    IdCirculation = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateDeReception = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateEnvoi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Recepteur = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EmetteurService = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntiteId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Circulations", x => x.IdCirculation);
                    table.ForeignKey(
                        name: "FK_Circulations_Entites_EntiteId",
                        column: x => x.EntiteId,
                        principalTable: "Entites",
                        principalColumn: "IdEntite",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NumerosDossierJuridique",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Annee = table.Column<int>(type: "int", nullable: false),
                    Nombre = table.Column<int>(type: "int", nullable: false),
                    NumeroSujet = table.Column<int>(type: "int", nullable: false),
                    EntiteDJId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NumerosDossierJuridique", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NumerosDossierJuridique_EntitesDJ_EntiteDJId",
                        column: x => x.EntiteDJId,
                        principalTable: "EntitesDJ",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Retraits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateDeRetrait = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MotifDeRetrait = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EffectuePar = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateDeRetour = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntiteDJId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Retraits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Retraits_EntitesDJ_EntiteDJId",
                        column: x => x.EntiteDJId,
                        principalTable: "EntitesDJ",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reponses",
                columns: table => new
                {
                    IdReponse = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateReponse = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Resultat = table.Column<int>(type: "int", nullable: false),
                    RegistreId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reponses", x => x.IdReponse);
                    table.ForeignKey(
                        name: "FK_Reponses_Registres_RegistreId",
                        column: x => x.RegistreId,
                        principalTable: "Registres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Circulations_EntiteId",
                table: "Circulations",
                column: "EntiteId");

            migrationBuilder.CreateIndex(
                name: "IX_Entites_IdService",
                table: "Entites",
                column: "IdService");

            migrationBuilder.CreateIndex(
                name: "IX_EntitesDJ_IdService",
                table: "EntitesDJ",
                column: "IdService");

            migrationBuilder.CreateIndex(
                name: "IX_Equipements_IdService",
                table: "Equipements",
                column: "IdService");

            migrationBuilder.CreateIndex(
                name: "IX_NumerosDossierJuridique_EntiteDJId",
                table: "NumerosDossierJuridique",
                column: "EntiteDJId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Registres_IdService",
                table: "Registres",
                column: "IdService");

            migrationBuilder.CreateIndex(
                name: "IX_Reponses_RegistreId",
                table: "Reponses",
                column: "RegistreId");

            migrationBuilder.CreateIndex(
                name: "IX_Retraits_EntiteDJId",
                table: "Retraits",
                column: "EntiteDJId");

            migrationBuilder.CreateIndex(
                name: "IX_Utilisateurs_IdService",
                table: "Utilisateurs",
                column: "IdService");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Circulations");

            migrationBuilder.DropTable(
                name: "Equipements");

            migrationBuilder.DropTable(
                name: "Ids");

            migrationBuilder.DropTable(
                name: "NumerosDossierJuridique");

            migrationBuilder.DropTable(
                name: "Reponses");

            migrationBuilder.DropTable(
                name: "Retraits");

            migrationBuilder.DropTable(
                name: "Utilisateurs");

            migrationBuilder.DropTable(
                name: "Entites");

            migrationBuilder.DropTable(
                name: "Registres");

            migrationBuilder.DropTable(
                name: "EntitesDJ");

            migrationBuilder.DropTable(
                name: "Services");
        }
    }
}
