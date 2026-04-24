using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.Models
{
    public class Reponse
    {
        [Key]
        public int IdReponse { get; set; }
        public DateTime DateReponse { get; set; }
        public string Source { get; set; }= string.Empty;
        public int Resultat { get; set; }

        // Navigation
        public int RegistreId { get; set; }
        public Registre? Registre { get; set; }

        public void AjouterReponse() { }
        public void ModifierReponse() { }
        public void ConsulterReponse() { }
        public void SupprimerReponse() { }
    }
}
