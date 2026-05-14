using System;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Services;
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
    private readonly IRepository<Service, int> _serviceRepository;

    public TransactionWorkflowService(
        IRepository<Transaction, int> transactionRepository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Service, int> serviceRepository)
    {
        _transactionRepository = transactionRepository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _serviceRepository = serviceRepository;
    }

    public async Task RespondAsync(
        Transaction transaction,
        bool accepted,
        string? message,
        string? responderUserName,
        int? responderServiceId,
        string? responderServiceName)
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
        transaction.ResponderUserName = responderUserName?.Trim();
        transaction.ResponderServiceId = responderServiceId;
        transaction.ResponderServiceName = responderServiceName?.Trim();

        if (accepted)
        {
            await MoveDocumentToDestinationServiceAsync(transaction, finalizeArchive: true);
        }
        else
        {
            await ReturnDocumentToSourceServiceAsync(transaction);
        }

        await _transactionRepository.UpdateAsync(transaction, autoSave: true);
    }

    public async Task SendDocumentToDestinationServiceAsync(Transaction transaction)
    {
        await MoveDocumentToDestinationServiceAsync(transaction, finalizeArchive: false);
    }

    public async Task ReturnDocumentToSourceServiceAsync(Transaction transaction)
    {
        if (transaction.DocumentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierAdministratifRepository.FindAsync(transaction.DocumentId);
            if (document != null)
            {
                document.ServiceId = transaction.SourceServiceId;
                if (!await IsArchiveServiceAsync(transaction.SourceServiceId))
                {
                    document.EstArchive = false;
                    document.Etat = WorkflowStatus.Nouveau.ToStorageValue();
                }

                await _courrierAdministratifRepository.UpdateAsync(document, autoSave: true);
            }

            return;
        }

        if (transaction.DocumentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierJudiciaireRepository.FindAsync(transaction.DocumentId);
            if (document != null)
            {
                document.ServiceId = transaction.SourceServiceId;
                if (!await IsArchiveServiceAsync(transaction.SourceServiceId))
                {
                    document.EstArchive = false;
                    document.EtatArchive = WorkflowStatus.Nouveau.ToStorageValue();
                }

                await _courrierJudiciaireRepository.UpdateAsync(document, autoSave: true);
            }
        }
    }

    private async Task MoveDocumentToDestinationServiceAsync(Transaction transaction, bool finalizeArchive)
    {
        if (transaction.DocumentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierAdministratifRepository.FindAsync(transaction.DocumentId);
            if (document != null)
            {
                document.ServiceId = transaction.DestinationServiceId;
                if (finalizeArchive && await IsArchiveServiceAsync(transaction.DestinationServiceId))
                {
                    document.EstArchive = true;
                    document.Etat = WorkflowStatus.Archive.ToStorageValue();
                }

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
                if (finalizeArchive && await IsArchiveServiceAsync(transaction.DestinationServiceId))
                {
                    document.EstArchive = true;
                    document.EtatArchive = WorkflowStatus.Archive.ToStorageValue();
                }

                await _courrierJudiciaireRepository.UpdateAsync(document, autoSave: true);
            }
        }
    }

    private async Task<bool> IsArchiveServiceAsync(int serviceId)
    {
        if (serviceId == 13)
        {
            return true;
        }

        var service = await _serviceRepository.FindAsync(serviceId);
        return service != null &&
            (service.Description.Contains("Archivage", StringComparison.OrdinalIgnoreCase) ||
                service.Description.Contains("Archive", StringComparison.OrdinalIgnoreCase));
    }
}
