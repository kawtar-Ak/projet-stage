using System;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Workflows;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace GestionCourrierAbp.Transactions;

public class TransactionWorkflowService : DomainService
{
    private readonly IRepository<Transaction, int> _transactionRepository;
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;

    public TransactionWorkflowService(
        IRepository<Transaction, int> transactionRepository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository)
    {
        _transactionRepository = transactionRepository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
    }

    public async Task RespondAsync(Transaction transaction, bool accepted, string? message)
    {
        if (!transaction.Statut.IsSameAs(WorkflowStatus.EnAttente))
        {
            throw new BusinessException("TransactionDejaTraitee")
                .WithData("Statut", transaction.Statut);
        }

        transaction.Statut = accepted
            ? WorkflowStatus.Accepte.ToStorageValue()
            : WorkflowStatus.Refuse.ToStorageValue();
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = message;

        if (accepted)
        {
            await MoveDocumentToDestinationServiceAsync(transaction);
        }

        await _transactionRepository.UpdateAsync(transaction, autoSave: true);
    }

    private async Task MoveDocumentToDestinationServiceAsync(Transaction transaction)
    {
        if (transaction.DocumentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierAdministratifRepository.FindAsync(transaction.DocumentId);
            if (document != null)
            {
                document.ServiceId = transaction.DestinationServiceId;
                await _courrierAdministratifRepository.UpdateAsync(document, autoSave: true);
            }

            return;
        }

        if (transaction.DocumentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierJudiciaireRepository.FindAsync(transaction.DocumentId);
            if (document != null)
            {
                document.ServiceId = transaction.DestinationServiceId;
                await _courrierJudiciaireRepository.UpdateAsync(document, autoSave: true);
            }
        }
    }
}
