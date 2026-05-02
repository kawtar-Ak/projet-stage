using GestionCourrierAbp.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace GestionCourrierAbp.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(GestionCourrierAbpEntityFrameworkCoreModule),
    typeof(GestionCourrierAbpApplicationContractsModule)
)]
public class GestionCourrierAbpDbMigratorModule : AbpModule
{
}
