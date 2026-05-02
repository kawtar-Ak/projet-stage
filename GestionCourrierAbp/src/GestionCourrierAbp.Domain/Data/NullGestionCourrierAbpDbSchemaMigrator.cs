using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace GestionCourrierAbp.Data;

/* This is used if database provider does't define
 * IGestionCourrierAbpDbSchemaMigrator implementation.
 */
public class NullGestionCourrierAbpDbSchemaMigrator : IGestionCourrierAbpDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
