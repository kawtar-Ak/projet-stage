using GestionCourrierAbp.Workflows;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionWorkflowData
{
    public int TransactionId { get; set; }
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public int SourceServiceId { get; set; }
    public int DestinationServiceId { get; set; }
    public bool DoitRevenir { get; set; }
    public WorkflowStatus Status { get; set; } = WorkflowStatus.EnAttente;
}
