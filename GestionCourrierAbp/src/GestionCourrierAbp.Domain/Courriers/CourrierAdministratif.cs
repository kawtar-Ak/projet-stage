using System;
using GestionCourrierAbp.Services;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Courriers;

public class CourrierAdministratif : AuditedAggregateRoot<int>
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Etat { get; set; } = "Nouveau";
    public string LienPdf { get; set; } = string.Empty;
    public string Direction { get; set; } = "Entrant";
    public string TypeDocument { get; set; } = "Administratif";
    public string NumeroDeCourrier { get; set; } = string.Empty;
    public string TypeRegistre { get; set; } = "Waridat";
    public string? TypeCorrespondance { get; set; }
    public int? ParentId { get; set; }
    public bool EstTransmissible { get; set; }
    public bool EstArchive { get; set; }
    public int ServiceId { get; set; }
    public Service? Service { get; set; }
}
