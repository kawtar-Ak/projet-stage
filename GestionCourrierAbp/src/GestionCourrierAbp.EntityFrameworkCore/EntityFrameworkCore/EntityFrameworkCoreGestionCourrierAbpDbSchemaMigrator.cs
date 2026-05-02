using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using GestionCourrierAbp.Data;
using Volo.Abp.DependencyInjection;

namespace GestionCourrierAbp.EntityFrameworkCore;

public class EntityFrameworkCoreGestionCourrierAbpDbSchemaMigrator
    : IGestionCourrierAbpDbSchemaMigrator, ITransientDependency
{
    private readonly IServiceProvider _serviceProvider;

    public EntityFrameworkCoreGestionCourrierAbpDbSchemaMigrator(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task MigrateAsync()
    {
        /* We intentionally resolving the GestionCourrierAbpDbContext
         * from IServiceProvider (instead of directly injecting it)
         * to properly get the connection string of the current tenant in the
         * current scope.
         */

        await _serviceProvider
            .GetRequiredService<GestionCourrierAbpDbContext>()
            .Database
            .MigrateAsync();
    }
}
