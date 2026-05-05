using WorkflowCore.Interface;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionLifecycleWorkflow : IWorkflow<TransactionWorkflowData>
{
    public const string WorkflowId = "transaction-lifecycle";

    public string Id => WorkflowId;
    public int Version => 1;

    public void Build(IWorkflowBuilder<TransactionWorkflowData> builder)
    {
        builder
            .StartWith<TransactionCreatedStep>()
                .Input(step => step.TransactionId, data => data.TransactionId)
                .Input(step => step.DocumentId, data => data.DocumentId)
                .Input(step => step.DocumentType, data => data.DocumentType)
            .Then<TransactionAwaitingResponseStep>()
                .Input(step => step.TransactionId, data => data.TransactionId)
                .Input(step => step.DestinationServiceId, data => data.DestinationServiceId)
                .Input(step => step.DoitRevenir, data => data.DoitRevenir);
    }
}
