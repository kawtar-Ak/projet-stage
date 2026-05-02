using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Utilisateurs;

public interface IUtilisateurAppService :
    ICrudAppService<UtilisateurDto, int, PagedAndSortedResultRequestDto, CreateUtilisateurDto, UpdateUtilisateurDto>
{
}
