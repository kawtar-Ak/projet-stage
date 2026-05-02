namespace GestionCourrierAbp.Utilisateurs;

public class UpdateUtilisateurDto
{
    public string? NomComplet { get; set; }
    public string? Login { get; set; }
    public string? Password { get; set; }
    public int? ServiceId { get; set; }
}
