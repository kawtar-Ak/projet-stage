using System;
using System.Collections.Generic;
using GestionCourrierAbp.Workflows;
using GestionCourrierAbp.Services;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Courriers;

public class CourrierJudiciaire : AuditedAggregateRoot<int>
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    public string TribunalSource { get; set; } = string.Empty;
    public string TypeEnregistrementJudiciaire { get; set; } = "Dossier";
    public string TypeDocumentJudiciaire { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public string Direction { get; set; } = "Entrant";
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EtatArchive { get; set; } = WorkflowStatus.Nouveau.ToStorageValue();
    public string Emplacement { get; set; } = string.Empty;
    public string Cabinet { get; set; } = string.Empty;
    public DateTime? DateArchivage { get; set; }
    public string LienPdf { get; set; } = string.Empty;
    public bool EstTransmissible { get; set; } = true;
    public bool EstArchive { get; set; }
    public int ServiceId { get; set; }
    public int? NumeroDossierAnnee { get; set; }
    public int? NumeroDossierNombre { get; set; }
    public int? NumeroDossierSujet { get; set; }
    public int? CourrierJudiciaireParentId { get; set; }
    public Service? Service { get; set; }
    public CourrierJudiciaire? CourrierJudiciaireParent { get; set; }
    public ICollection<CourrierJudiciaire> DocumentsLies { get; set; } = new List<CourrierJudiciaire>();
    public ICollection<RetraitJudiciaire> Retraits { get; set; } = new List<RetraitJudiciaire>();
}
