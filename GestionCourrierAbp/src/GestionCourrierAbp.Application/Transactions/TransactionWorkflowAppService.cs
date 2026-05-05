using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Workflows;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Transactions;

public class TransactionWorkflowAppService : GestionCourrierAbpAppService, ITransactionWorkflowAppService
{
    private readonly IRepository<Transaction, int> _repository;
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;
    private readonly TransactionWorkflowService _workflowService;
    private readonly TransactionAffichageService _affichageService;
    private readonly TransactionWorkflowStarter _workflowStarter;

    public TransactionWorkflowAppService(
        IRepository<Transaction, int> repository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        TransactionWorkflowService workflowService,
        TransactionAffichageService affichageService,
        TransactionWorkflowStarter workflowStarter)
    {
        _repository = repository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _workflowService = workflowService;
        _affichageService = affichageService;
        _workflowStarter = workflowStarter;
    }

    public async Task<PagedResultDto<TransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderByDescending(x => x.DateEnvoi).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<TransactionDto>(totalCount, items.Select(_affichageService.ToDto).ToList());
    }

    public async Task<ListResultDto<TransactionListDto>> GetIncomingAsync(int destinationServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var enAttente = WorkflowStatus.EnAttente.ToStorageValue();
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.DestinationServiceId == destinationServiceId && x.Statut == enAttente)
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(await _affichageService.ToListDtosAsync(transactions));
    }

    public async Task<ListResultDto<TransactionListDto>> GetOutgoingAsync(int sourceServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.SourceServiceId == sourceServiceId)
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(await _affichageService.ToListDtosAsync(transactions));
    }

    public async Task<ListResultDto<TransactionListDto>> GetPendingReturnsAsync(int sourceServiceId)
    {
        var query = await _repository.GetQueryableAsync();
        var accepte = WorkflowStatus.Accepte.ToStorageValue();
        var transactions = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.SourceServiceId == sourceServiceId && x.DoitRevenir && x.Statut == accepte)
                .OrderByDescending(x => x.DateEnvoi));

        return new ListResultDto<TransactionListDto>(await _affichageService.ToListDtosAsync(transactions));
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
            Statut = WorkflowStatus.EnAttente.ToStorageValue(),
            DateEnvoi = DateTime.Now
        }, autoSave: true);

        await _workflowStarter.StartCreatedTransactionAsync(transaction);

        return _affichageService.ToDto(transaction);
    }

    public async Task<TransactionDto> RespondAsync(int id, RespondTransactionDto input)
    {
        var transaction = await _repository.GetAsync(id);
        await _workflowService.RespondAsync(transaction, input.Accepte, input.Message);
        return _affichageService.ToDto(transaction);
    }

    public async Task<TransactionDto> CancelAsync(int id, int sourceServiceId)
    {
        var transaction = await _repository.GetAsync(id);
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

        await _repository.UpdateAsync(transaction, autoSave: true);
        return _affichageService.ToDto(transaction);
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

        if (!transaction.Statut.IsSameAs(WorkflowStatus.Accepte))
        {
            throw new BusinessException("TransactionRetourImpossible")
                .WithData("Statut", transaction.Statut);
        }

        transaction.DoitRevenir = false;

        await _repository.UpdateAsync(transaction, autoSave: true);
        return _affichageService.ToDto(transaction);
    }

    public async Task DeleteAsync(int id, int sourceServiceId, bool isAdmin = false)
    {
        var transaction = await _repository.GetAsync(id);

        if (!transaction.Statut.IsSameAs(WorkflowStatus.Accepte) &&
            !transaction.Statut.IsSameAs(WorkflowStatus.Refuse))
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
        var enAttente = WorkflowStatus.EnAttente.ToStorageValue();
        var accepte = WorkflowStatus.Accepte.ToStorageValue();
        var exists = await AsyncExecuter.AnyAsync(
            query.Where(x =>
                x.DocumentId == documentId &&
                x.DocumentType == documentType &&
                (x.Statut == enAttente || x.Statut == accepte)));

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

}
