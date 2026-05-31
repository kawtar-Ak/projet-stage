using GestionCourrierAbp.Workflows;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionWorkflowCommandData
{
    public int TransactionId { get; set; }
    public WorkflowStatus Status { get; set; } = WorkflowStatus.EnAttente;
    public bool Accepte { get; set; }
    public string? Message { get; set; }
    public string? ResponderUserName { get; set; }
    public int? ResponderServiceId { get; set; }
    public string? ResponderServiceName { get; set; }
    public int SourceServiceId { get; set; }
}
