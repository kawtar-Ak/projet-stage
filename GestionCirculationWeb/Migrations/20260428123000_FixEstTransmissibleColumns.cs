using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace GestionCirculationWeb.Migrations
{
    [Migration("20260428123000_FixEstTransmissibleColumns")]
    public partial class FixEstTransmissibleColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Entites', 'EstTransmissible') IS NULL
BEGIN
    ALTER TABLE Entites ADD EstTransmissible bit NOT NULL CONSTRAINT DF_Entites_EstTransmissible DEFAULT CAST(0 AS bit);
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('EntitesDJs', 'EstTransmissible') IS NULL
BEGIN
    ALTER TABLE EntitesDJs ADD EstTransmissible bit NOT NULL CONSTRAINT DF_EntitesDJs_EstTransmissible DEFAULT CAST(0 AS bit);
END
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Entites', 'EstTransmissible') IS NOT NULL
BEGIN
    ALTER TABLE Entites DROP CONSTRAINT IF EXISTS DF_Entites_EstTransmissible;
    ALTER TABLE Entites DROP COLUMN EstTransmissible;
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('EntitesDJs', 'EstTransmissible') IS NOT NULL
BEGIN
    ALTER TABLE EntitesDJs DROP CONSTRAINT IF EXISTS DF_EntitesDJs_EstTransmissible;
    ALTER TABLE EntitesDJs DROP COLUMN EstTransmissible;
END
");
        }
    }
}
