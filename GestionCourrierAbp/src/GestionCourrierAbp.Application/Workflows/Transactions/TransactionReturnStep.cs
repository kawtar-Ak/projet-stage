using System.Threading.Tasks;
using GestionCourrierAbp.Workflows;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionReturnStep : StepBodyAsync
{
    private readonly TransactionWorkflowActions _actions;

    public TransactionReturnStep(TransactionWorkflowActions actions)
    {
        _actions = actions;
    }

    public int TransactionId { get; set; }
    public int SourceServiceId { get; set; }
    public WorkflowStatus Status { get; set; }

    public override async Task<ExecutionResult> RunAsync(IStepExecutionContext context)
    {
        await _actions.MarkReturnedAsync(TransactionId, SourceServiceId);
        Status = WorkflowStatus.Retourne;
        return ExecutionResult.Next();
    }
}
