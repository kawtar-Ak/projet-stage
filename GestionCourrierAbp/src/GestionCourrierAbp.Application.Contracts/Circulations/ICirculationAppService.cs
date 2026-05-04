using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Circulations;

public interface ICirculationAppService :
    ICrudAppService<CirculationDto, int, PagedAndSortedResultRequestDto, CreateUpdateCirculationDto>
{
    Task<List<CirculationDto>> GetHistoryAsync(int documentId, string documentType);
}
