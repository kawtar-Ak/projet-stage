namespace GestionCourrier.DTOs
{
    public class EnregistrementDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;   // "Administratif" ou "Judiciaire"
        public string Direction { get; set; } = "Entrant";
        public DateTime Date { get; set; }
        public string Sujet { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Destinataire { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int? ParentId { get; set; }
        public int IdService { get; set; }
        public int? NumeroCourrier { get; set; }   // pour administratif
        public string? NumeroDossier { get; set; } // pour judiciaire
        public bool EstArchive { get; set; }
        public int? IdBureauOrdre { get; set; }     // nouveau : identifiant bureau d’ordre
    }
}