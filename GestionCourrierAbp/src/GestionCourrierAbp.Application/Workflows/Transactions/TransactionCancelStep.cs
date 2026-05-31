using System.Threading.Tasks;
using GestionCourrierAbp.Workflows;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionCancelStep : StepBodyAsync
{
    private readonly TransactionWorkflowActions _actions;

    public TransactionCancelStep(TransactionWorkflowActions actions)
    {
        _actions = actions;
    }

    public int TransactionId { get; set; }
    public int SourceServiceId { get; set; }
    public WorkflowStatus Status { get; set; }

    public override async Task<ExecutionResult> RunAsync(IStepExecutionContext context)
    {
        await _actions.CancelAsync(TransactionId, SourceServiceId);
        Status = WorkflowStatus.Annule;
        return ExecutionResult.Next();
    }
}
