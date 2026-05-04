using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Utilisateurs;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Transactions;

public class TransactionWorkflowAppService : GestionCourrierAbpAppService, ITransactionWorkflowAppService
{
    private readonly IRepository<Transaction, int> _repository;
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;
    private readonly IRepository<Service, int> _serviceRepository;
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;
    private readonly TransactionWorkflowService _workflowService;

    public TransactionWorkflowAppService(
        IRepository<Transaction, int> repository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Service, int> serviceRepository,
        IRepository<Utilisateur, int> utilisateurRepository,
        TransactionWorkflowService workflowService)
    {
        _repository = repository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _serviceRepository = serviceRepository;
        _utilisateurRepository = utilisateurRepository;
        _workflowService = workflowService;
    }

    public async Task<PagedResultDto<TransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderByDescending(x => x.DateEnvoi).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<TransactionDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<ListResultDto<TransactionListDto>> GetIncomingAsync(int destinationServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.DestinationServiceId == destinationServiceId && x.Statut == "En attente")
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(await ToListDtosAsync(transactions));
    }

    public async Task<ListResultDto<TransactionListDto>> GetOutgoingAsync(int sourceServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.SourceServiceId == sourceServiceId)
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(await ToListDtosAsync(transactions));
    }

    public async Task<ListResultDto<TransactionListDto>> GetPendingReturnsAsync(int sourceServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.SourceServiceId == sourceServiceId && x.DoitRevenir && x.Statut == "Accepté")
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(await ToListDtosAsync(transactions));
    }

    public async Task<TransactionDto> CreateAsync(CreateTransactionDto input)
    {
        var documentType = input.DocumentType.Trim();

        await EnsureDocumentIsTransmissibleAsync(input.DocumentId, documentType);
        await EnsureNoActiveTransactionAsync(input.DocumentId, documentType);

        var transaction = await _repository.InsertAsync(new Transaction
        {
            DocumentId = input.DocumentId,
            DocumentType = documentType,
            SourceServiceId = input.SourceServiceId,
            DestinationServiceId = input.DestinationServiceId,
            DestinationUserId = input.DestinationUserId,
            DoitRevenir = input.DoitRevenir,
            Message = input.Message?.Trim() ?? string.Empty,
            Statut = "En attente",
            DateEnvoi = DateTime.Now
        }, autoSave: true);

        return ToDto(transaction);
    }

    public async Task<TransactionDto> RespondAsync(int id, RespondTransactionDto input)
    {
        var transaction = await _repository.GetAsync(id);
        await _workflowService.RespondAsync(transaction, input.Accepte, input.Message);
        return ToDto(transaction);
    }

    public async Task<TransactionDto> CancelAsync(int id, int sourceServiceId)
    {
        var transaction = await _repository.GetAsync(id);
        if (transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionAnnulationNonAutorisee");
        }

        if (transaction.Statut != "En attente")
        {
            throw new BusinessException("TransactionAnnulationImpossible")
                .WithData("Statut", transaction.Statut);
        }

        transaction.Statut = "Annulé";
        transaction.DateReponse = DateTime.Now;
        transaction.MessageReponse = "Annulée par l'émetteur";

        await _repository.UpdateAsync(transaction, autoSave: true);
        return ToDto(transaction);
    }

    public async Task<TransactionDto> MarkReturnedAsync(int id, int sourceServiceId)
    {
        var transaction = await _repository.GetAsync(id);
        if (transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionRetourNonAutorise");
        }

        if (!transaction.DoitRevenir)
        {
            throw new BusinessException("TransactionSansRetour");
        }

        if (transaction.Statut != "Accepté")
        {
            throw new BusinessException("TransactionRetourImpossible")
                .WithData("Statut", transaction.Statut);
        }

        transaction.DoitRevenir = false;

        await _repository.UpdateAsync(transaction, autoSave: true);
        return ToDto(transaction);
    }

    public async Task DeleteAsync(int id, int sourceServiceId, bool isAdmin = false)
    {
        var transaction = await _repository.GetAsync(id);

        if (transaction.Statut != "Accepté" && transaction.Statut != "Refusé")
        {
            throw new BusinessException("TransactionSuppressionImpossible")
                .WithData("Statut", transaction.Statut);
        }

        if (!isAdmin && transaction.SourceServiceId != sourceServiceId)
        {
            throw new BusinessException("TransactionSuppressionNonAutorisee");
        }

        await _repository.DeleteAsync(transaction, autoSave: true);
    }

    private async Task EnsureNoActiveTransactionAsync(int documentId, string documentType)
    {
        var query = await _repository.GetQueryableAsync();
        var exists = await AsyncExecuter.AnyAsync(
            query.Where(x =>
                x.DocumentId == documentId &&
                x.DocumentType == documentType &&
                (x.Statut == "En attente" || x.Statut == "Accepté")));

        if (exists)
        {
            throw new BusinessException("DocumentAvecTransactionActive");
        }
    }

    private async Task EnsureDocumentIsTransmissibleAsync(int documentId, string documentType)
    {
        if (documentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierAdministratifRepository.FindAsync(documentId);
            if (document is not { EstTransmissible: true })
            {
                throw new BusinessException("DocumentNonTransmissible");
            }

            return;
        }

        if (documentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            var document = await _courrierJudiciaireRepository.FindAsync(documentId);
            if (document is not { EstTransmissible: true })
            {
                throw new BusinessException("DocumentNonTransmissible");
            }

            return;
        }

        throw new BusinessException("TypeDocumentInvalide")
            .WithData("DocumentType", documentType);
    }

    private async Task<List<TransactionListDto>> ToListDtosAsync(List<Transaction> transactions)
    {
        var result = new List<TransactionListDto>();
        foreach (var transaction in transactions)
        {
            result.Add(new TransactionListDto
            {
                Id = transaction.Id,
                DocumentId = transaction.DocumentId,
                DocumentType = transaction.DocumentType,
                DocumentSujet = await GetDocumentSujetAsync(transaction.DocumentId, transaction.DocumentType),
                SourceServiceId = transaction.SourceServiceId,
                SourceServiceNom = await GetServiceNameAsync(transaction.SourceServiceId),
                DestinationServiceId = transaction.DestinationServiceId,
                DestinationServiceNom = await GetServiceNameAsync(transaction.DestinationServiceId),
                DestinationUserId = transaction.DestinationUserId,
                DestinationUserName = await GetUserNameAsync(transaction.DestinationUserId),
                DoitRevenir = transaction.DoitRevenir,
                DateEnvoi = transaction.DateEnvoi,
                DateReponse = transaction.DateReponse,
                Statut = transaction.Statut,
                Message = transaction.Message,
                MessageReponse = transaction.MessageReponse
            });
        }

        return result;
    }

    private async Task<string> GetDocumentSujetAsync(int documentId, string documentType)
    {
        if (documentType.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            return (await _courrierAdministratifRepository.FindAsync(documentId))?.Sujet ?? string.Empty;
        }

        if (documentType.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            return (await _courrierJudiciaireRepository.FindAsync(documentId))?.Sujet ?? string.Empty;
        }

        return string.Empty;
    }

    private async Task<string> GetServiceNameAsync(int serviceId)
    {
        return (await _serviceRepository.FindAsync(serviceId))?.NomService ?? string.Empty;
    }

    private async Task<string?> GetUserNameAsync(int? userId)
    {
        if (!userId.HasValue)
        {
            return null;
        }

        return (await _utilisateurRepository.FindAsync(userId.Value))?.NomComplet;
    }

    private static TransactionDto ToDto(Transaction transaction)
    {
        return new TransactionDto
        {
            Id = transaction.Id,
            DocumentId = transaction.DocumentId,
            DocumentType = transaction.DocumentType,
            SourceServiceId = transaction.SourceServiceId,
            DestinationServiceId = transaction.DestinationServiceId,
            DestinationUserId = transaction.DestinationUserId,
            DoitRevenir = transaction.DoitRevenir,
            Message = transaction.Message,
            Statut = transaction.Statut,
            DateEnvoi = transaction.DateEnvoi,
            DateReponse = transaction.DateReponse,
            MessageReponse = transaction.MessageReponse,
            CreationTime = transaction.CreationTime,
            CreatorId = transaction.CreatorId,
            LastModificationTime = transaction.LastModificationTime,
            LastModifierId = transaction.LastModifierId
        };
    }
}
