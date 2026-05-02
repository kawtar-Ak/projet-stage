using GestionCourrier.ApplicationContracts.Transactions;
using GestionCourrier.DTOs;
using GestionCourrier.Models;
using GestionCourrier.Services;
using Microsoft.EntityFrameworkCore;

namespace GestionCourrier.Application.Transactions
{
    public class TransactionWorkflowAppService : ITransactionWorkflowAppService
    {
        private readonly ApplicationDbContext _context;
        private readonly ApprovalWorkflowService _workflowService;

        public TransactionWorkflowAppService(
            ApplicationDbContext context,
            ApprovalWorkflowService workflowService)
        {
            _context = context;
            _workflowService = workflowService;
        }

        public async Task RespondAsync(int transactionId, int currentUserId, ReponseTransactionDto input)
        {
            var transaction = await _context.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId);
            if (transaction == null)
            {
                throw new KeyNotFoundException($"Transaction {transactionId} non trouvee.");
            }

            var user = await _context.Utilisateurs.FindAsync(currentUserId);
            if (user == null)
            {
                throw new UnauthorizedAccessException("Utilisateur non trouve.");
            }

            if (user.IdService != transaction.DestinationServiceId)
            {
                throw new InvalidOperationException("Vous n'etes pas autorise a repondre a cette transaction.");
            }

            if (transaction.Statut != "En attente")
            {
                throw new InvalidOperationException($"Transaction deja {transaction.Statut}.");
            }

            await _workflowService.RunAsync(transactionId, input.Accepte, input.Message);
        }
    }
}
