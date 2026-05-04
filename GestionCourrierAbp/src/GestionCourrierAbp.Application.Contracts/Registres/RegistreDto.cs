using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Registres;

public class RegistreDto : AuditedEntityDto<int>
{
    public int TypeDeRegistre { get; set; }
    public DateTime DateCreation { get; set; }
    public string Description { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string? ServiceNom { get; set; }
    public int ReponsesCount { get; set; }
}
