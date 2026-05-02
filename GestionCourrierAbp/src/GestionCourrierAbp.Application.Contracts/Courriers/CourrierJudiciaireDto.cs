using System;
using System.Collections.Generic;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Courriers;

public class CourrierJudiciaireDto : AuditedEntityDto<int>
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    public string TribunalSource { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EtatArchive { get; set; } = string.Empty;
    public string Emplacement { get; set; } = string.Empty;
    public string LienPdf { get; set; } = string.Empty;
    public bool EstTransmissible { get; set; }
    public bool EstArchive { get; set; }
    public int IdService { get; set; }
    public string? ServiceNom { get; set; }
    public string? NumeroDossier { get; set; }
    public int? NumeroDossierAnnee { get; set; }
    public int? NumeroDossierNombre { get; set; }
    public int? NumeroDossierSujet { get; set; }
    public int RetraitsCount { get; set; }
    public List<RetraitJudiciaireDto> Retraits { get; set; } = new();
}
