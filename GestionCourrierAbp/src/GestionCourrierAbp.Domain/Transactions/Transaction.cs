using System;
using GestionCourrierAbp.Workflows;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Utilisateurs;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Transactions;

public class Transaction : AuditedAggregateRoot<int>
{
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public int SourceServiceId { get; set; }
    public int DestinationServiceId { get; set; }
    public int? DestinationUserId { get; set; }
    public bool DoitRevenir { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Statut { get; set; } = WorkflowStatus.EnAttente.ToStorageValue();
    public DateTime DateEnvoi { get; set; }
    public DateTime? DateReponse { get; set; }
    public string? MessageReponse { get; set; }

    public Service? SourceService { get; set; }
    public Service? DestinationService { get; set; }
    public Utilisateur? DestinationUser { get; set; }
}
