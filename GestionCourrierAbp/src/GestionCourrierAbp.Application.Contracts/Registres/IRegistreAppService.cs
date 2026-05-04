using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Registres;

public interface IRegistreAppService :
    ICrudAppService<RegistreDto, int, PagedAndSortedResultRequestDto, CreateUpdateRegistreDto>
{
    Task<List<RegistreDto>> GetByServiceAsync(int serviceId);
    Task<ReponseDto> AddReponseAsync(int registreId, CreateUpdateReponseDto input);
    Task<List<ReponseDto>> GetReponsesAsync(int registreId);
}
