using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCourrierAbp.Migrations
{
    /// <inheritdoc />
    public partial class AddCirculationAndRegistres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppCirculations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentId = table.Column<int>(type: "int", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    DateDeReception = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateEnvoi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Recepteur = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    EmetteurService = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    SourceServiceId = table.Column<int>(type: "int", nullable: true),
                    DestinationServiceId = table.Column<int>(type: "int", nullable: true),
                    Etat = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppCirculations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppRegistres",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TypeDeRegistre = table.Column<int>(type: "int", nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
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
                    table.PrimaryKey("PK_AppRegistres", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRegistres_AppServices_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "AppServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppReponses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateReponse = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Resultat = table.Column<int>(type: "int", nullable: false),
                    RegistreId = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppReponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppReponses_AppRegistres_RegistreId",
                        column: x => x.RegistreId,
                        principalTable: "AppRegistres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppCirculations_DocumentId_DocumentType",
                table: "AppCirculations",
                columns: new[] { "DocumentId", "DocumentType" });

            migrationBuilder.CreateIndex(
                name: "IX_AppRegistres_ServiceId",
                table: "AppRegistres",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_AppReponses_RegistreId",
                table: "AppReponses",
                column: "RegistreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppCirculations");

            migrationBuilder.DropTable(
                name: "AppReponses");

            migrationBuilder.DropTable(
                name: "AppRegistres");
        }
    }
}
