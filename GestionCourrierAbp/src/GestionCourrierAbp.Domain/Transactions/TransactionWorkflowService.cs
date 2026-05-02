using System;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace GestionCourrierAbp.Transactions;

public class TransactionWorkflowService : DomainService
{
    private readonly IRepository<Transaction, int> _transactionRepository;

    public TransactionWorkflowService(IRepository<Transaction, int> transactionRepository)
    {
        _transactionRepository = transactionRepository;
    }

    public async Task RespondAsync(Transaction transaction, bool accepted, string? message)
    {
        if (transaction.Statut != "En attente")
        {
            throw new BusinessException("TransactionDejaTraitee")
                .WithData("Statut", transaction.Statut);
        }

        transaction.Statut = accepted ? "Accepte" : "Refuse";
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = message;

        await _transactionRepository.UpdateAsync(transaction, autoSave: true);
    }
}
