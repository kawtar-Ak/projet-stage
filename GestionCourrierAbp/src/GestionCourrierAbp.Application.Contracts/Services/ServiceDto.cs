using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Services;

public class ServiceDto : AuditedEntityDto<int>
{
    public string NomService { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Etage { get; set; }
}
