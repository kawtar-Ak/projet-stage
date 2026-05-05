using Microsoft.Extensions.Logging;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionAwaitingResponseStep : StepBody
{
    private readonly ILogger<TransactionAwaitingResponseStep> _logger;

    public TransactionAwaitingResponseStep(ILogger<TransactionAwaitingResponseStep> logger)
    {
        _logger = logger;
    }

    public int TransactionId { get; set; }
    public int DestinationServiceId { get; set; }
    public bool DoitRevenir { get; set; }

    public override ExecutionResult Run(IStepExecutionContext context)
    {
        _logger.LogInformation(
            "Workflow transaction awaiting response. TransactionId={TransactionId}, DestinationServiceId={DestinationServiceId}, DoitRevenir={DoitRevenir}",
            TransactionId,
            DestinationServiceId,
            DoitRevenir);

        return ExecutionResult.Next();
    }
}
