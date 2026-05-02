using System;
using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Courriers;

public class CreateUpdateCourrierJudiciaireDto
{
    public string? IdBureauOrdre { get; set; }
    public DateTime Date { get; set; }
    [Required]
    public string TribunalSource { get; set; } = string.Empty;
    [Required]
    public string Sujet { get; set; } = string.Empty;
    public string? Direction { get; set; }
    public string? Destinataire { get; set; }
    public string? Description { get; set; }
    public string? EtatArchive { get; set; }
    public string? Emplacement { get; set; }
    public string? LienPdf { get; set; }
    [Range(1, int.MaxValue)]
    public int IdService { get; set; }
    public bool EstTransmissible { get; set; }
    public string? NumeroDossier { get; set; }
    public int? NumeroDossierAnnee { get; set; }
    public int? NumeroDossierNombre { get; set; }
    public int? NumeroDossierSujet { get; set; }
}
