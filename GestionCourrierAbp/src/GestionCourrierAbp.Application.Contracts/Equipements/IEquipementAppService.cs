using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Equipements;

public interface IEquipementAppService :
    ICrudAppService<EquipementDto, int, PagedAndSortedResultRequestDto, CreateUpdateEquipementDto>
{
    Task<EquipementDto> ChargerAsync(int id);
    Task<EquipementDto> DechargerAsync(int id);
}
