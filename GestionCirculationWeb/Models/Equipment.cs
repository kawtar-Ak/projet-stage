using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionCourrier.Models
{
    public class Equipment
    {
        [Key]
        public int Id { get; set; }
        public int Serial { get; set; }
        public int Type { get; set; }
        public int Etat { get; set; }
        public int IdService { get; set; }
        public bool EstCharge { get; set; }
        public DateTime? DateDechargement { get; set; }

        [ForeignKey("IdService")]
        public Service? Service { get; set; }
    }
}