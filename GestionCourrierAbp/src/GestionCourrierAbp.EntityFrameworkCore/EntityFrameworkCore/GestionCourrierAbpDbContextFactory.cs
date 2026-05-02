using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace GestionCourrierAbp.EntityFrameworkCore;

/* This class is needed for EF Core console commands
 * (like Add-Migration and Update-Database commands) */
public class GestionCourrierAbpDbContextFactory : IDesignTimeDbContextFactory<GestionCourrierAbpDbContext>
{
    public GestionCourrierAbpDbContext CreateDbContext(string[] args)
    {
        var configuration = BuildConfiguration();
        
        GestionCourrierAbpEfCoreEntityExtensionMappings.Configure();

        var builder = new DbContextOptionsBuilder<GestionCourrierAbpDbContext>()
            .UseSqlServer(configuration.GetConnectionString("Default"));
        
        return new GestionCourrierAbpDbContext(builder.Options);
    }

    private static IConfigurationRoot BuildConfiguration()
    {
        var builder = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../GestionCourrierAbp.DbMigrator/"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddEnvironmentVariables();

        return builder.Build();
    }
}
