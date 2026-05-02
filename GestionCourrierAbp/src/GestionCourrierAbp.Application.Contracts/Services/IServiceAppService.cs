using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Services;

public interface IServiceAppService :
    ICrudAppService<ServiceDto, int, PagedAndSortedResultRequestDto, CreateUpdateServiceDto>
{
}
