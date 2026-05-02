using GestionCourrierAbp.Samples;
using Xunit;

namespace GestionCourrierAbp.EntityFrameworkCore.Applications;

[Collection(GestionCourrierAbpTestConsts.CollectionDefinitionName)]
public class EfCoreSampleAppServiceTests : SampleAppServiceTests<GestionCourrierAbpEntityFrameworkCoreTestModule>
{

}
