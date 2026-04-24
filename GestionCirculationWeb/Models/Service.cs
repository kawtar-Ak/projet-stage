using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionCourrier.Models
{
    public class Service
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]  // Désactive l'auto-incrémentation
        public int IdService { get; set; }
        public string NomService { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Etage { get; set; }

        // Relations (toutes celles qui existent dans votre DbContext)
        public ICollection<EntiteDJ> EntitesDJ { get; set; } = new List<EntiteDJ>();
        public ICollection<Entite> Entites { get; set; } = new List<Entite>();
        public ICollection<Registre> Registres { get; set; } = new List<Registre>();
        public ICollection<Equipment> Equipements { get; set; } = new List<Equipment>();
        public ICollection<Utilisateur> Utilisateurs { get; set; } = new List<Utilisateur>();
    }
}