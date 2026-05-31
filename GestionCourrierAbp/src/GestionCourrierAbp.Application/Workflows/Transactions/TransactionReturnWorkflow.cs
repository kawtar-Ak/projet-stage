using WorkflowCore.Interface;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionReturnWorkflow : IWorkflow<TransactionWorkflowCommandData>
{
    public const string WorkflowId = "transaction-return";

    public string Id => WorkflowId;
    public int Version => 1;

    public void Build(IWorkflowBuilder<TransactionWorkflowCommandData> builder)
    {
        builder
            .StartWith<TransactionReturnStep>()
                .Input(step => step.TransactionId, data => data.TransactionId)
                .Input(step => step.SourceServiceId, data => data.SourceServiceId)
                .Output(data => data.Status, step => step.Status);
    }
}
