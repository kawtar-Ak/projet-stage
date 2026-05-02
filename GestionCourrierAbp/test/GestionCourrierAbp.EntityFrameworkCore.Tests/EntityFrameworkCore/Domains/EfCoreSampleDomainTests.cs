using GestionCourrierAbp.Samples;
using Xunit;

namespace GestionCourrierAbp.EntityFrameworkCore.Domains;

[Collection(GestionCourrierAbpTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<GestionCourrierAbpEntityFrameworkCoreTestModule>
{

}
