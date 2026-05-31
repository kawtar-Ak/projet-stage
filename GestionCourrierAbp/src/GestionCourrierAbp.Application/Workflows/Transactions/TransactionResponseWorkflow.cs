using WorkflowCore.Interface;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionResponseWorkflow : IWorkflow<TransactionWorkflowCommandData>
{
    public const string WorkflowId = "transaction-response";

    public string Id => WorkflowId;
    public int Version => 1;

    public void Build(IWorkflowBuilder<TransactionWorkflowCommandData> builder)
    {
        builder
            .StartWith<TransactionRespondStep>()
                .Input(step => step.TransactionId, data => data.TransactionId)
                .Input(step => step.Accepte, data => data.Accepte)
                .Input(step => step.Message, data => data.Message)
                .Input(step => step.ResponderUserName, data => data.ResponderUserName)
                .Input(step => step.ResponderServiceId, data => data.ResponderServiceId)
                .Input(step => step.ResponderServiceName, data => data.ResponderServiceName)
                .Output(data => data.Status, step => step.Status);
    }
}
