using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Utilisateurs;

public class UtilisateurDto : AuditedEntityDto<int>
{
    public string NomComplet { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string? ServiceNom { get; set; }
}
