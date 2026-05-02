using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Courriers;

public interface ICourrierAdministratifAppService :
    ICrudAppService<CourrierAdministratifDto, int, PagedAndSortedResultRequestDto, CreateUpdateCourrierAdministratifDto>
{
    Task<List<CourrierAdministratifDto>> SearchAsync(string? motCle);
    Task<List<CourrierAdministratifDto>> GetWaridatAsync();
    Task<CourrierAdministratifDto> ArchiverAsync(int id);
}
