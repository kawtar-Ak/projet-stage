using System.Threading.Tasks;

namespace GestionCourrierAbp.Data;

public interface IGestionCourrierAbpDbSchemaMigrator
{
    Task MigrateAsync();
}
