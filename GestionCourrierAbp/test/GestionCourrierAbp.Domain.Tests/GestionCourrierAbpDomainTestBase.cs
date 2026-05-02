using Volo.Abp.Modularity;

namespace GestionCourrierAbp;

/* Inherit from this class for your domain layer tests. */
public abstract class GestionCourrierAbpDomainTestBase<TStartupModule> : GestionCourrierAbpTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
