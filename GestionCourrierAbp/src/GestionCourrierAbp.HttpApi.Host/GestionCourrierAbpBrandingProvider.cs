using Microsoft.Extensions.Localization;
using GestionCourrierAbp.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace GestionCourrierAbp;

[Dependency(ReplaceServices = true)]
public class GestionCourrierAbpBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<GestionCourrierAbpResource> _localizer;

    public GestionCourrierAbpBrandingProvider(IStringLocalizer<GestionCourrierAbpResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
