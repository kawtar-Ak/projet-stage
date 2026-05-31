using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Circulations;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Transactions;
using GestionCourrierAbp.Workflows;
using Volo.Abp;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Linq;

namespace GestionCourrierAbp.Workflows.Transactions;

public class TransactionWorkflowActions : ITransientDependency
{
    private const int ConseillerRapporteurServiceId = 15;

    private readonly IRepository<Transaction, int> _transactionRepository;
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;
    private readonly IRepository<Service, int> _serviceRepository;
    private readonly IRepository<Circulation, int> _circulationRepository;
    private readonly IAsyncQueryableExecuter _asyncExecuter;

    public TransactionWorkflowActions(
        IRepository<Transaction, int> transactionRepository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Service, int> serviceRepository,
        IRepository<Circulation, int> circulationRepository,
        IAsyncQueryableExecuter asyncExecuter)
    {
        _transactionRepository = transactionRepository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _serviceRepository = serviceRepository;
        _circulationRepository = circulationRepository;
        _asyncExecuter = asyncExecuter;
    }

    public async Task DispatchCreatedTransactionAsync(int transactionId)
    {
        var transaction = await _transactionRepository.GetAsync(transactionId);

        await MoveDocumentToDestinationServiceAsync(transaction, finalizeArchive: false);
        await RegisterCirculationAsync(transaction);

        if (await IsConseillerRapporteurServiceAsync(transaction.DestinationServiceId))
        {
            await RespondAsync(
                transaction,
                accepted: true,
                message: "Acceptation automatique - المستشار المقرر",
                responderUserName: transaction.SenderUserName,
                responderServiceId: transaction.DestinationServiceId,
                responderServiceName: await GetServiceNameAsync(transaction.DestinationServiceId));

            await UpdateCirculationFromTransactionAsync(transaction);
        }
    }

    public async Task RespondAsync(
        int transactionId,
        bool accepted,
        string? message,
        string? responderUserName,
        int? responderServiceId,
        string? responderServiceName)
    {
        var transaction = await _transactionRepository.GetAsync(transactionId);
        var effectiveResponderServiceId = responderServiceId ?? transaction.DestinationServiceId;

        if (effectiveResponderServiceId != transaction.DestinationServiceId)
        {
            throw new BusinessException("TransactionReponseNonAutorisee")
                .WithData("DestinationServiceId", transaction.DestinationServiceId)
                .WithData("ResponderServiceId", effectiveResponderServiceId);
        }

        await RespondAsync(
            transaction,
            accepted,
            message,
            responderUserName,
            effectiveResponderServiceId,
            responderServiceName ?? await GetServiceNameAsync(transaction.DestinationServiceId));

        await UpdateCirculationFromTransactionAsync(transaction);
    }

    public async Task CancelAsync(int transactionId, int sourceServiceId)
    {
        var transaction = await _transactionRepository.GetAsync(transactionId);

        if (transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionAnnulationNonAutorisee");
        }

        if (!transaction.Statut.IsSameAs(WorkflowStatus.EnAttente))
        {
            throw new BusinessException("TransactionAnnulationImpossible")
                .WithData("Statut", transaction.Statut);
        }

        transaction.Statut = WorkflowStatus.Annule.ToStorageValue();
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = "Annulée par l'émetteur";

        await ReturnDocumentToSourceServiceAsync(transaction);
        await _transactionRepository.UpdateAsync(transaction, autoSave: true);
        await UpdateCirculationFromTransactionAsync(transaction);
    }

    public async Task MarkReturnedAsync(int transactionId, int sourceServiceId)
    {
        var transaction = await _transactionRepository.GetAsync(transactionId);
        var isConseillerRapporteurReturn =
            await IsConseillerRapporteurServiceAsync(transaction.DestinationServiceId);

        if (transaction.SourceServiceId != sourceServiceId && !isConseillerRapporteurReturn)
        {
            throw new BusinessException("TransactionRetourNonAutorise");
        }

        if (!transaction.DoitRevenir)
        {
            throw new BusinessException("TransactionSansRetour");
        }

        if (!transaction.Statut.IsSameAs(WorkflowStatus.Accepte))
        {
            throw new BusinessException("TransactionRetourImpossible")
                .WithData("Statut", transaction.Statut);
        }

        await ReturnDocumentToSourceServiceAsync(transaction);

        transaction.DoitRevenir = false;
        transaction.Statut = WorkflowStatus.Retourne.ToStorageValue();
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = "Document retourné au service source";

        await _transactionRepository.UpdateAsync(transaction, autoSave: true);
        await UpdateCirculationFromTransactionAsync(transaction);
    }

    private async Task RespondAsync(
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

    private async Task RegisterCirculationAsync(Transaction transaction)
    {
        await _circulationRepository.InsertAsync(new Circulation
        {
            DocumentId = transaction.DocumentId,
            DocumentType = transaction.DocumentType,
            DateDeReception = transaction.DateEnvoi,
            DateEnvoi = transaction.DateEnvoi,
            Recepteur = await GetServiceNameAsync(transaction.DestinationServiceId),
            RecepteurUserName = null,
            EmetteurService = string.IsNullOrWhiteSpace(transaction.SenderServiceName)
                ? await GetServiceNameAsync(transaction.SourceServiceId)
                : transaction.SenderServiceName.Trim(),
            EmetteurUserName = transaction.SenderUserName?.Trim(),
            SourceServiceId = transaction.SourceServiceId,
            DestinationServiceId = transaction.DestinationServiceId,
            Etat = transaction.Statut,
            Notes = transaction.Message
        }, autoSave: true);
    }

    private async Task UpdateCirculationFromTransactionAsync(Transaction transaction)
    {
        var query = await _circulationRepository.GetQueryableAsync();
        var circulation = await _asyncExecuter.FirstOrDefaultAsync(
            query
                .Where(x =>
                    x.DocumentId == transaction.DocumentId &&
                    x.DocumentType == transaction.DocumentType &&
                    x.SourceServiceId == transaction.SourceServiceId &&
                    x.DestinationServiceId == transaction.DestinationServiceId &&
                    x.DateEnvoi == transaction.DateEnvoi)
                .OrderByDescending(x => x.Id));

        if (circulation == null)
        {
            await RegisterCirculationAsync(transaction);
            return;
        }

        circulation.Etat = transaction.Statut;
        circulation.RecepteurUserName = transaction.ResponderUserName?.Trim();
        if (transaction.DateReponse.HasValue)
        {
            circulation.DateDeReception = transaction.DateReponse.Value;
        }

        var notes = new List<string>();
        if (!string.IsNullOrWhiteSpace(transaction.Message))
        {
            notes.Add(transaction.Message.Trim());
        }

        if (!string.IsNullOrWhiteSpace(transaction.MessageReponse))
        {
            notes.Add(transaction.MessageReponse.Trim());
        }

        circulation.Notes = string.Join(" | ", notes);

        await _circulationRepository.UpdateAsync(circulation, autoSave: true);
    }

    private async Task ReturnDocumentToSourceServiceAsync(Transaction transaction)
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

    private async Task<bool> IsConseillerRapporteurServiceAsync(int serviceId)
    {
        if (serviceId == ConseillerRapporteurServiceId)
        {
            return true;
        }

        var service = await _serviceRepository.FindAsync(serviceId);
        return service != null &&
            (service.NomService.Contains("المستشار المقرر", StringComparison.OrdinalIgnoreCase) ||
             service.Description.Contains("Conseiller rapporteur", StringComparison.OrdinalIgnoreCase));
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

    private async Task<string> GetServiceNameAsync(int serviceId)
    {
        return (await _serviceRepository.FindAsync(serviceId))?.NomService ?? string.Empty;
    }
}
