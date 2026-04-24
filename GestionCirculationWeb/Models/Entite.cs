using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GestionCourrier.Models
{
    public enum TypeEntite
    {
        CourrierEntrant = 1,
        CourrierSortant = 2,
        Interne = 3
    }

    public class Entite
    {
        [Key]
        public int IdEntite { get; set; }
        public int? IdBureauOrdre { get; set; }
        public DateTime DateCreation { get; set; }
        public string Source { get; set; }= string.Empty;
        public string Etat { get; set; }= string.Empty;
        public string LienPdf { get; set; }= string.Empty;
        public string Description { get; set; }= string.Empty;
        public string TypeDocument { get; set; }= string.Empty;
        public int NumeroDeCourrier { get; set; }
        public TypeEntite TypeGenerale { get; set; }
        public bool EstArchive { get; set; } = false;
        public string Sujet { get; set; }= string.Empty;
        public string Direction { get; set; } = "Entrant";
        public string Destinataire { get; set; } = string.Empty;
        public int? ParentId { get; set; }

        // Navigation
        public int IdService { get; set; }
        public Service? Service { get; set; }
        public ICollection<Circulation> Circulations { get; set; } = new List<Circulation>();

        public void CreerEntite() { }
        public void ModifierEntite() { }
        public void SupprimerEntite() { }
        public void ConsulterEntite() { }
    }
}
