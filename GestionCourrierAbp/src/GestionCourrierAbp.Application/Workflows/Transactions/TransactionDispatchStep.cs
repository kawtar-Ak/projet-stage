using System.Threading.Tasks;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionDispatchStep : StepBodyAsync
{
    private readonly TransactionWorkflowActions _actions;

    public TransactionDispatchStep(TransactionWorkflowActions actions)
    {
        _actions = actions;
    }

    public int TransactionId { get; set; }

    public override async Task<ExecutionResult> RunAsync(IStepExecutionContext context)
    {
        await _actions.DispatchCreatedTransactionAsync(TransactionId);
        return ExecutionResult.Next();
    }
}
