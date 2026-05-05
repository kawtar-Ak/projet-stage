using Microsoft.Extensions.Logging;
using WorkflowCore.Interface;
using WorkflowCore.Models;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionCreatedStep : StepBody
{
    private readonly ILogger<TransactionCreatedStep> _logger;

    public TransactionCreatedStep(ILogger<TransactionCreatedStep> logger)
    {
        _logger = logger;
    }

    public int TransactionId { get; set; }
    public int DocumentId { get; set; }
    public string DocumentType { get; set; } = string.Empty;

    public override ExecutionResult Run(IStepExecutionContext context)
    {
        _logger.LogInformation(
            "Workflow transaction started. TransactionId={TransactionId}, DocumentType={DocumentType}, DocumentId={DocumentId}",
            TransactionId,
            DocumentType,
            DocumentId);

        return ExecutionResult.Next();
    }
}
