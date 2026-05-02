using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Courriers;

public class CourrierAdministratifDto : AuditedEntityDto<int>
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Etat { get; set; } = string.Empty;
    public string LienPdf { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public string TypeDocument { get; set; } = string.Empty;
    public string NumeroDeCourrier { get; set; } = string.Empty;
    public string TypeRegistre { get; set; } = string.Empty;
    public string? TypeCorrespondance { get; set; }
    public int? ParentId { get; set; }
    public bool EstTransmissible { get; set; }
    public bool EstArchive { get; set; }
    public int IdService { get; set; }
    public string? ServiceNom { get; set; }
}
