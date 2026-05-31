using WorkflowCore.Interface;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionCancelWorkflow : IWorkflow<TransactionWorkflowCommandData>
{
    public const string WorkflowId = "transaction-cancel";

    public string Id => WorkflowId;
    public int Version => 1;

    public void Build(IWorkflowBuilder<TransactionWorkflowCommandData> builder)
    {
        builder
            .StartWith<TransactionCancelStep>()
                .Input(step => step.TransactionId, data => data.TransactionId)
                .Input(step => step.SourceServiceId, data => data.SourceServiceId)
                .Output(data => data.Status, step => step.Status);
    }
}
