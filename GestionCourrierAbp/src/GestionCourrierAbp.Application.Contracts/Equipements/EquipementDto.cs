using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Equipements;

public class EquipementDto : AuditedEntityDto<int>
{
    public int Serial { get; set; }
    public int Type { get; set; }
    public int Etat { get; set; }
    public int ServiceId { get; set; }
    public string? ServiceNom { get; set; }
    public string? ServiceEtage { get; set; }
    public bool EstCharge { get; set; }
    public DateTime? DateDechargement { get; set; }
}
