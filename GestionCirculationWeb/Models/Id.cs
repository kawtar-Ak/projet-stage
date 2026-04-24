using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.Models
{
    public class Id
    {
        public int Annee { get; set; }
        [Key]
        public int IdBureauOrdre { get; set; }

        public void GenererID() { }
        public void VerifierID() { }
    }
}
