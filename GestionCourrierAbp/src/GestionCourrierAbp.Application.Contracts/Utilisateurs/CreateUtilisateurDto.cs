using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Utilisateurs;

public class CreateUtilisateurDto
{
    [Required]
    public string NomComplet { get; set; } = string.Empty;

    [Required]
    public string Login { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int ServiceId { get; set; }
}
