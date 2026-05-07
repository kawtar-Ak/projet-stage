using System.Threading.Tasks;

// Contient les statuts du workflow : EnAttente, Accepte, Refuse, Annule, etc.
using GestionCourrierAbp.Workflows;

// Contient les classes liées au workflow des transactions,
// par exemple TransactionLifecycleWorkflow et TransactionWorkflowData
using GestionCourrierAbp.Workflows.Transactions;

// Permet à ABP d’injecter automatiquement cette classe comme service
using Volo.Abp.DependencyInjection;

// Interface fournie par Workflow Core pour démarrer les workflows
using WorkflowCore.Interface;

namespace GestionCourrierAbp.Transactions;

/// <summary>
/// Service responsable du démarrage du workflow d’une transaction.
/// Il est utilisé après la création d’une transaction pour lancer son cycle de vie.
/// </summary>
public class TransactionWorkflowStarter : ITransientDependency
{
    // Objet fourni par Workflow Core.
    // Il permet de démarrer un workflow.
    private readonly IWorkflowHost _workflowHost;

    /// <summary>
    /// Constructeur du service.
    /// IWorkflowHost est injecté automatiquement par le système d’injection de dépendances.
    /// </summary>
    public TransactionWorkflowStarter(IWorkflowHost workflowHost)
    {
        _workflowHost = workflowHost;
    }

    /// <summary>
    /// Lance le workflow pour une transaction nouvellement créée.
    /// La transaction commence avec le statut EnAttente.
    /// </summary>
    public Task StartCreatedTransactionAsync(Transaction transaction)
    {
        // Démarrage du workflow TransactionLifecycleWorkflow
        return _workflowHost.StartWorkflow(
            // Identifiant du workflow à lancer
            TransactionLifecycleWorkflow.WorkflowId,

            // Version du workflow
            1,

            // Données envoyées au workflow
            new TransactionWorkflowData
            {
                // Identifiant de la transaction créée
                TransactionId = transaction.Id,

                // Identifiant du document concerné
                DocumentId = transaction.DocumentId,

                // Type du document : Administratif ou Judiciaire
                DocumentType = transaction.DocumentType,

                // Service qui envoie le document
                SourceServiceId = transaction.SourceServiceId,

                // Service qui reçoit le document
                DestinationServiceId = transaction.DestinationServiceId,

                // Indique si le document doit revenir au service source
                DoitRevenir = transaction.DoitRevenir,

                // Statut initial de la transaction
                Status = WorkflowStatus.EnAttente
            });
    }
}