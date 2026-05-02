using GestionCourrier.DTOs;

namespace GestionCourrier.ApplicationContracts.Transactions
{
    public interface ITransactionWorkflowAppService
    {
        Task RespondAsync(int transactionId, int currentUserId, ReponseTransactionDto input);
    }
}
