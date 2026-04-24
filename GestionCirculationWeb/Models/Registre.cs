using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.Models
{
    public class Registre
    {
        [Key]
        public int Id { get; set; }
        public int TypeDeRegistre { get; set; }
        public DateTime DateCreation { get; set; }
        public string Description { get; set; }= string.Empty;

        // Navigation
        public int IdService { get; set; }
        public Service? Service { get; set; }
        public ICollection<Reponse> Reponses { get; set; } = new List<Reponse>();

        public void ConsulterRegistre() { }
        public void RechercherEnregistrement() { }
    }
}
