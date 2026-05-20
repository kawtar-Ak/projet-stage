using System.Collections.Generic;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Courriers;

public interface ICourrierJudiciaireAppService :
    ICrudAppService<CourrierJudiciaireDto, int, PagedAndSortedResultRequestDto, CreateUpdateCourrierJudiciaireDto>
{
    Task<List<CourrierJudiciaireDto>> SearchAsync(string? motCle);
    Task<List<CourrierJudiciaireDto>> GetArchivesAsync(string? motCle);
    Task<CourrierJudiciaireDto> ArchiverAsync(int id);
    Task<CourrierJudiciaireDto> CreateRetraitAsync(int id, CreateRetraitJudiciaireDto input);
    Task<CourrierJudiciaireDto> RetourRetraitAsync(int retraitId, RetourRetraitJudiciaireDto input);
    Task DeleteRetraitAsync(int retraitId);
    Task<CourrierJudiciaireDto> RetraitsAsync(int id, CreateRetraitJudiciaireDto input);
    Task<CourrierJudiciaireDto> RetourAsync(int retraitId, RetourRetraitJudiciaireDto input);
}
