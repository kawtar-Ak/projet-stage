using System.Threading.Tasks;
using GestionCourrierAbp.Workflows;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionRespondStep : StepBodyAsync
{
    private readonly TransactionWorkflowActions _actions;

    public TransactionRespondStep(TransactionWorkflowActions actions)
    {
        _actions = actions;
    }

    public int TransactionId { get; set; }
    public bool Accepte { get; set; }
    public string? Message { get; set; }
    public string? ResponderUserName { get; set; }
    public int? ResponderServiceId { get; set; }
    public string? ResponderServiceName { get; set; }
    public WorkflowStatus Status { get; set; }

    public override async Task<ExecutionResult> RunAsync(IStepExecutionContext context)
    {
        await _actions.RespondAsync(
            TransactionId,
            Accepte,
            Message,
            ResponderUserName,
            ResponderServiceId,
            ResponderServiceName);

        Status = Accepte ? WorkflowStatus.Accepte : WorkflowStatus.Refuse;
        return ExecutionResult.Next();
    }
}
