using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.Models
{
    public class NumeroDossierJuridique
    {
        [Key]
        public int Id { get; set; }
        public int Annee { get; set; }
        public int Nombre { get; set; }
        public int NumeroSujet { get; set; }

        // Navigation
        public int EntiteDJId { get; set; }
        public EntiteDJ? EntiteDJ { get; set; }

        public void GenererNumero() { }
        public void VerifierUnicite() { }
    }
}
