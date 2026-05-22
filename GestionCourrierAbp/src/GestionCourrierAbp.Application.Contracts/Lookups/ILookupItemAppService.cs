using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Lookups;

public interface ILookupItemAppService : IApplicationService
{
    Task<List<LookupItemDto>> GetByListNameAsync(string listName);
    Task<PagedResultDto<LookupItemDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<LookupItemDto> CreateAsync(CreateUpdateLookupItemDto input);
    Task<LookupItemDto> UpdateAsync(int id, CreateUpdateLookupItemDto input);
    Task DeleteAsync(int id);
}
