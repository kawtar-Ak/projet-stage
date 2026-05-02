using System;
using System.Collections.Generic;
using GestionCourrierAbp.Services;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Courriers;

public class CourrierJudiciaire : AuditedAggregateRoot<int>
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    public string TribunalSource { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public string Direction { get; set; } = "Entrant";
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EtatArchive { get; set; } = "Nouveau";
    public string Emplacement { get; set; } = string.Empty;
    public string LienPdf { get; set; } = string.Empty;
    public bool EstTransmissible { get; set; } = true;
    public bool EstArchive { get; set; }
    public int ServiceId { get; set; }
    public int? NumeroDossierAnnee { get; set; }
    public int? NumeroDossierNombre { get; set; }
    public int? NumeroDossierSujet { get; set; }
    public Service? Service { get; set; }
    public ICollection<RetraitJudiciaire> Retraits { get; set; } = new List<RetraitJudiciaire>();
}
