using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Circulations;

public class CirculationDto : AuditedEntityDto<int>
{
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public DateTime DateDeReception { get; set; }
    public DateTime? DateEnvoi { get; set; }
    public string Recepteur { get; set; } = string.Empty;
    public string EmetteurService { get; set; } = string.Empty;
    public int? SourceServiceId { get; set; }
    public int? DestinationServiceId { get; set; }
    public string Etat { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
