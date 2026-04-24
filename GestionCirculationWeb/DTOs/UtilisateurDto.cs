using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.DTOs
{
    public class UtilisateurDto
    {
        public int Id { get; set; }
        public string NomComplet { get; set; } = string.Empty;
        public string Login { get; set; } = string.Empty;
        public int IdService { get; set; }
        public string? NomService { get; set; }
    }

    public class CreateUtilisateurDto
    {
        [Required]
        public string NomComplet { get; set; } = string.Empty;
        [Required]
        public string Login { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        [Required]
        public int IdService { get; set; }
    }

    public class UpdateUtilisateurDto
    {
        public string? NomComplet { get; set; }
        public string? Login { get; set; }
        public string? Password { get; set; }
        public int? IdService { get; set; }
    }
}