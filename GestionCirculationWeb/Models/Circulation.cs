using System;
using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.Models
{
    public class Circulation
    {
        [Key]
        public int IdCirculation { get; set; }

        public DateTime DateDeReception { get; set; }
        public DateTime? DateEnvoi { get; set; }
        public string Recepteur { get; set; }= string.Empty;
        public string EmetteurService { get; set; }= string.Empty;

        public int EntiteId { get; set; }
        public Entite? Entite { get; set; }

        public void ConsulterHistorique() { }
        public void SuivreCirculation() { }
        public void RetournerDossier() { }
        public void EnregistrerReception() { }
    }
}