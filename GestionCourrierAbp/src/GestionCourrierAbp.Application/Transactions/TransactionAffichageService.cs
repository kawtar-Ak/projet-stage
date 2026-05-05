using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Utilisateurs;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.DependencyInjection;

namespace GestionCourrierAbp.Transactions;

public class TransactionAffichageService : GestionCourrierAbpAppService, ITransientDependency
{
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;
    private readonly IRepository<Service, int> _serviceRepository;
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;

    public TransactionAffichageService(
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Service, int> serviceRepository,
        IRepository<Utilisateur, int> utilisateurRepository)
    {
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _serviceRepository = serviceRepository;
        _utilisateurRepository = utilisateurRepository;
    }

    public TransactionDto ToDto(Transaction transaction)
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

    public async Task<List<TransactionListDto>> ToListDtosAsync(List<Transaction> transactions)
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
}
