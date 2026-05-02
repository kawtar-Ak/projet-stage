using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Transactions;

public class TransactionWorkflowAppService : GestionCourrierAbpAppService, ITransactionWorkflowAppService
{
    private readonly IRepository<Transaction, int> _repository;
    private readonly TransactionWorkflowService _workflowService;

    public TransactionWorkflowAppService(
        IRepository<Transaction, int> repository,
        TransactionWorkflowService workflowService)
    {
        _repository = repository;
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

    public async Task<TransactionDto> CreateAsync(CreateTransactionDto input)
    {
        var transaction = await _repository.InsertAsync(new Transaction
        {
            DocumentId = input.DocumentId,
            DocumentType = input.DocumentType.Trim(),
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
