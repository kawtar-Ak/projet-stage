using System.Threading.Tasks;
using GestionCourrierAbp.Workflows;
using GestionCourrierAbp.Workflows.Transactions;
using Volo.Abp.DependencyInjection;
using WorkflowCore.Interface;

namespace GestionCourrierAbp.Transactions;

public class TransactionWorkflowStarter : ITransientDependency
{
    private readonly IWorkflowHost _workflowHost;

    public TransactionWorkflowStarter(IWorkflowHost workflowHost)
    {
        _workflowHost = workflowHost;
    }

    public Task StartCreatedTransactionAsync(Transaction transaction)
    {
        return _workflowHost.StartWorkflow(
            TransactionLifecycleWorkflow.WorkflowId,
            1,
            new TransactionWorkflowData
            {
                TransactionId = transaction.Id,
                DocumentId = transaction.DocumentId,
                DocumentType = transaction.DocumentType,
                SourceServiceId = transaction.SourceServiceId,
                DestinationServiceId = transaction.DestinationServiceId,
                DoitRevenir = transaction.DoitRevenir,
                Status = WorkflowStatus.EnAttente
            });
    }
}
