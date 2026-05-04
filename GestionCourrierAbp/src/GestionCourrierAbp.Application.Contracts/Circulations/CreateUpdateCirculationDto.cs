using System;

namespace GestionCourrierAbp.Circulations;

public class CreateUpdateCirculationDto
{
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public DateTime DateDeReception { get; set; }
    public DateTime? DateEnvoi { get; set; }
    public string Recepteur { get; set; } = string.Empty;
    public string EmetteurService { get; set; } = string.Empty;
    public int? SourceServiceId { get; set; }
    public int? DestinationServiceId { get; set; }
    public string? Etat { get; set; }
    public string? Notes { get; set; }
}
