using System;
using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Courriers;

public class CreateUpdateCourrierAdministratifDto
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    public string Source { get; set; } = string.Empty;
    [Required]
    public string Sujet { get; set; } = string.Empty;
    public string? Destinataire { get; set; }
    public string? Description { get; set; }
    public string? Etat { get; set; }
    public string? LienPdf { get; set; }
    public string? Direction { get; set; }
    public string? TypeRegistre { get; set; }
    public string? TypeCorrespondance { get; set; }
    public int? ParentId { get; set; }
    [Range(1, int.MaxValue)]
    public int IdService { get; set; }
    public string? NumeroDeCourrier { get; set; }
    public bool EstTransmissible { get; set; }
}
