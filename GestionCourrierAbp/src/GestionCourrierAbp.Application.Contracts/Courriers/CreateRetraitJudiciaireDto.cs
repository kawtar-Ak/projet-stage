using System;
using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Courriers;

public class CreateRetraitJudiciaireDto
{
    public DateTime DateDeRetrait { get; set; }
    [Required]
    public string MotifDeRetrait { get; set; } = string.Empty;
    public string? EffectuePar { get; set; }
    public DateTime? DateDeRetour { get; set; }
    public string? Notes { get; set; }
}
