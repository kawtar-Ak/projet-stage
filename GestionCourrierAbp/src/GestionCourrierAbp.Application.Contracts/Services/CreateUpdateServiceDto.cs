using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Services;

public class CreateUpdateServiceDto
{
    [Required]
    public string NomService { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? Etage { get; set; }
}
