using GestionCourrierAbp.Localization;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp;

/* Inherit your application services from this class.
 */
public abstract class GestionCourrierAbpAppService : ApplicationService
{
    protected GestionCourrierAbpAppService()
    {
        LocalizationResource = typeof(GestionCourrierAbpResource);
    }
}
