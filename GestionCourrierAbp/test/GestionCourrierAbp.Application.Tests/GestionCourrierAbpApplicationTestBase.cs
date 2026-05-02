using Volo.Abp.Modularity;

namespace GestionCourrierAbp;

public abstract class GestionCourrierAbpApplicationTestBase<TStartupModule> : GestionCourrierAbpTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
