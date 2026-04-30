using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GestionCirculationWeb.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionsAndWorkflowColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
IF COL_LENGTH(N'dbo.Entites', N'EtatWorkflow') IS NULL
BEGIN
    ALTER TABLE [Entites] ADD [EtatWorkflow] nvarchar(max) NULL;
END

IF COL_LENGTH(N'dbo.EntitesDJs', N'EtatWorkflow') IS NULL
BEGIN
    ALTER TABLE [EntitesDJs] ADD [EtatWorkflow] nvarchar(max) NULL;
END

IF OBJECT_ID(N'[dbo].[Transactions]', N'U') IS NULL
BEGIN
    CREATE TABLE [Transactions] (
        [Id] int NOT NULL IDENTITY,
        [DocumentId] int NOT NULL,
        [DocumentType] nvarchar(max) NOT NULL,
        [SourceServiceId] int NOT NULL,
        [DestinationServiceId] int NOT NULL,
        [DestinationUserId] int NULL,
        [DoitRevenir] bit NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [Statut] nvarchar(max) NOT NULL,
        [DateEnvoi] datetime2 NOT NULL,
        [DateReponse] datetime2 NULL,
        [MessageReponse] nvarchar(max) NULL,
        CONSTRAINT [PK_Transactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Transactions_Services_DestinationServiceId] FOREIGN KEY ([DestinationServiceId]) REFERENCES [Services] ([IdService]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Transactions_Services_SourceServiceId] FOREIGN KEY ([SourceServiceId]) REFERENCES [Services] ([IdService]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Transactions_Utilisateurs_DestinationUserId] FOREIGN KEY ([DestinationUserId]) REFERENCES [Utilisateurs] ([Id]) ON DELETE NO ACTION
    );

    CREATE INDEX [IX_Transactions_DestinationServiceId] ON [Transactions] ([DestinationServiceId]);
    CREATE INDEX [IX_Transactions_DestinationUserId] ON [Transactions] ([DestinationUserId]);
    CREATE INDEX [IX_Transactions_SourceServiceId] ON [Transactions] ([SourceServiceId]);
END
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
IF OBJECT_ID(N'[dbo].[Transactions]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [Transactions];
END

IF COL_LENGTH(N'dbo.EntitesDJs', N'EtatWorkflow') IS NOT NULL
BEGIN
    ALTER TABLE [EntitesDJs] DROP COLUMN [EtatWorkflow];
END

IF COL_LENGTH(N'dbo.Entites', N'EtatWorkflow') IS NOT NULL
BEGIN
    ALTER TABLE [Entites] DROP COLUMN [EtatWorkflow];
END
""");
        }
    }
}
