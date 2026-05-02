using Volo.Abp.Settings;

namespace GestionCourrierAbp.Settings;

public class GestionCourrierAbpSettingDefinitionProvider : SettingDefinitionProvider
{
    public override void Define(ISettingDefinitionContext context)
    {
        //Define your own settings here. Example:
        //context.Add(new SettingDefinition(GestionCourrierAbpSettings.MySetting1));
    }
}
