using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Transactions;

public class TransactionDto : AuditedEntityDto<int>
{
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public int SourceServiceId { get; set; }
    public int DestinationServiceId { get; set; }
    public int? DestinationUserId { get; set; }
    public bool DoitRevenir { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Statut { get; set; } = string.Empty;
    public DateTime DateEnvoi { get; set; }
    public DateTime? DateReponse { get; set; }
    public string? MessageReponse { get; set; }
}
