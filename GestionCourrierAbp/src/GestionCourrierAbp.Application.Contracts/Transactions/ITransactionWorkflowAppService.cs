using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace GestionCourrierAbp.Transactions;

public interface ITransactionWorkflowAppService : IApplicationService
{
    Task<PagedResultDto<TransactionDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<TransactionDto> CreateAsync(CreateTransactionDto input);
    Task<TransactionDto> RespondAsync(int id, RespondTransactionDto input);
}
