using Stateless;
using GestionCourrier.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionCourrier.Services
{
    public class ApprovalWorkflowService
    {
        private readonly IServiceProvider _services;
        public ApprovalWorkflowService(IServiceProvider services) => _services = services;

        public enum State { Pending, Approved, Rejected }
        public enum Trigger { Submit, Approve, Reject }

        public async Task RunAsync(int transactionId, bool approved, string? reason)
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var transaction = await db.Transactions.FindAsync(transactionId);
            if (transaction == null) return;

            var machine = new StateMachine<State, Trigger>(State.Pending);
            machine.Configure(State.Pending)
                .Permit(Trigger.Approve, State.Approved)
                .Permit(Trigger.Reject, State.Rejected);

            if (approved)
                await machine.FireAsync(Trigger.Approve);
            else
                await machine.FireAsync(Trigger.Reject);

            transaction.Statut = machine.State == State.Approved ? "Accepté" : "Refusé";
            transaction.DateReponse = DateTime.Now;
            transaction.MessageReponse = reason;

            if (machine.State == State.Approved)
            {
                if (transaction.DocumentType == "Administratif")
                {
                    var doc = await db.Entites.FindAsync(transaction.DocumentId);
                    if (doc != null) doc.IdService = transaction.DestinationServiceId;
                }
                else
                {
                    var doc = await db.EntitesDJs.FindAsync(transaction.DocumentId);
                    if (doc != null)
                    {
                        doc.IdService = transaction.DestinationServiceId;
                        doc.EtatArchive = GetJudicialStateForService(transaction.DestinationServiceId);
                        doc.EstArchive = transaction.DestinationServiceId == 13;
                    }
                }
                await db.SaveChangesAsync();
            }
            await db.SaveChangesAsync();
        }

        private static string GetJudicialStateForService(int serviceId)
        {
            return serviceId switch
            {
                2 or 3 => "Nouveau",
                7 or 10 => "Jugé",
                13 => "Archive",
                _ => "En cours"
            };
        }
    }
}
