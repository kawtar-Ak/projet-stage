using Volo.Abp.Modularity;

namespace GestionCourrierAbp;

[DependsOn(
    typeof(GestionCourrierAbpDomainModule),
    typeof(GestionCourrierAbpTestBaseModule)
)]
public class GestionCourrierAbpDomainTestModule : AbpModule
{

}
