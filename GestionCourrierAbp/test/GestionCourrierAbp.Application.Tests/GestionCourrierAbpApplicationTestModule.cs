using Volo.Abp.Modularity;

namespace GestionCourrierAbp;

[DependsOn(
    typeof(GestionCourrierAbpApplicationModule),
    typeof(GestionCourrierAbpDomainTestModule)
)]
public class GestionCourrierAbpApplicationTestModule : AbpModule
{

}
