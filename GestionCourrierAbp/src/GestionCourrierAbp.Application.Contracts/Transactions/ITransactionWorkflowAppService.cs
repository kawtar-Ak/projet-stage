using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Transactions;

public interface ITransactionWorkflowAppService : IApplicationService
{
    Task<PagedResultDto<TransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<ListResultDto<TransactionListDto>> GetIncomingAsync(int destinationServiceId);
    Task<ListResultDto<TransactionListDto>> GetOutgoingAsync(int sourceServiceId);
    Task<ListResultDto<TransactionListDto>> GetPendingReturnsAsync(int sourceServiceId);
    Task<TransactionDto> CreateAsync(CreateTransactionDto input);
    Task<TransactionDto> RespondAsync(int id, RespondTransactionDto input);
    Task<TransactionDto> CancelAsync(int id, int sourceServiceId);
    Task<TransactionDto> MarkReturnedAsync(int id, int sourceServiceId);
    Task DeleteAsync(int id, int sourceServiceId, bool isAdmin = false);
}
