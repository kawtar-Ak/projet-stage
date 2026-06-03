using System;

namespace GestionCourrierAbp.Transactions;

public class TransactionListDto
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentSujet { get; set; } = string.Empty;
    public string DocumentEtat { get; set; } = string.Empty;
    public string? NumeroBureauOrdre { get; set; }
    public string? NumeroCourrier { get; set; }
    public string? NumeroDossierJudiciaire { get; set; }
    public int? CurrentServiceId { get; set; }
    public string CurrentServiceNom { get; set; } = string.Empty;
    public string CurrentLocation { get; set; } = string.Empty;
    public int SourceServiceId { get; set; }
    public string SourceServiceNom { get; set; } = string.Empty;
    public int DestinationServiceId { get; set; }
    public string DestinationServiceNom { get; set; } = string.Empty;
    public int? DestinationUserId { get; set; }
    public string? DestinationUserName { get; set; }
    public string? SenderUserName { get; set; }
    public string? SenderServiceName { get; set; }
    public bool DoitRevenir { get; set; }
    public DateTime DateEnvoi { get; set; }
    public DateTime? DateReponse { get; set; }
    public string Statut { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? MessageReponse { get; set; }
    public string? ResponderUserName { get; set; }
    public int? ResponderServiceId { get; set; }
    public string? ResponderServiceName { get; set; }
}
