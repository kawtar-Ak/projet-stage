using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Transactions;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Circulations;

public class CirculationAppService : GestionCourrierAbpAppService, ICirculationAppService
{
    private readonly IRepository<Circulation, int> _repository;
    private readonly IRepository<CourrierAdministratif, int> _courrierAdministratifRepository;
    private readonly IRepository<CourrierJudiciaire, int> _courrierJudiciaireRepository;
    private readonly IRepository<Transaction, int> _transactionRepository;

    public CirculationAppService(
        IRepository<Circulation, int> repository,
        IRepository<CourrierAdministratif, int> courrierAdministratifRepository,
        IRepository<CourrierJudiciaire, int> courrierJudiciaireRepository,
        IRepository<Transaction, int> transactionRepository)
    {
        _repository = repository;
        _courrierAdministratifRepository = courrierAdministratifRepository;
        _courrierJudiciaireRepository = courrierJudiciaireRepository;
        _transactionRepository = transactionRepository;
    }

    public async Task<CirculationDto> GetAsync(int id)
    {
        return await ToDtoAsync(await _repository.GetAsync(id));
    }

    public async Task<PagedResultDto<CirculationDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderByDescending(x => x.DateDeReception).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<CirculationDto>(totalCount, await ToDtosAsync(items));
    }

    public async Task<List<CirculationDto>> GetHistoryAsync(int documentId, string documentType)
    {
        var normalizedType = documentType.Trim();
        var query = await _repository.GetQueryableAsync();
        var items = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.DocumentId == documentId && x.DocumentType == normalizedType)
                .OrderByDescending(x => x.DateDeReception));

        return await ToDtosAsync(items);
    }

    public async Task<CirculationDto> CreateAsync(CreateUpdateCirculationDto input)
    {
        var entity = await _repository.InsertAsync(Map(new Circulation(), input), autoSave: true);
        return await ToDtoAsync(entity);
    }

    public async Task<CirculationDto> UpdateAsync(int id, CreateUpdateCirculationDto input)
    {
        var entity = await _repository.GetAsync(id);
        await _repository.UpdateAsync(Map(entity, input), autoSave: true);
        return await ToDtoAsync(entity);
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    private static Circulation Map(Circulation entity, CreateUpdateCirculationDto input)
    {
        entity.DocumentId = input.DocumentId;
        entity.DocumentType = input.DocumentType.Trim();
        entity.DateDeReception = input.DateDeReception == default ? DateTime.Now : input.DateDeReception;
        entity.DateEnvoi = input.DateEnvoi;
        entity.Recepteur = input.Recepteur?.Trim() ?? string.Empty;
        entity.RecepteurUserName = input.RecepteurUserName?.Trim();
        entity.EmetteurService = input.EmetteurService?.Trim() ?? string.Empty;
        entity.EmetteurUserName = input.EmetteurUserName?.Trim();
        entity.SourceServiceId = input.SourceServiceId;
        entity.DestinationServiceId = input.DestinationServiceId;
        entity.Etat = input.Etat?.Trim() ?? string.Empty;
        entity.Notes = input.Notes?.Trim() ?? string.Empty;
        return entity;
    }

    private async Task<List<CirculationDto>> ToDtosAsync(List<Circulation> items)
    {
        var result = new List<CirculationDto>();
        foreach (var item in items)
        {
            result.Add(await ToDtoAsync(item));
        }

        return result;
    }

    private async Task<CirculationDto> ToDtoAsync(Circulation entity)
    {
        var documentNumbers = await GetDocumentNumbersAsync(entity.DocumentId, entity.DocumentType);
        var trackingUsers = await GetTrackingUsersAsync(entity.DocumentId, entity.DocumentType);

        return new CirculationDto
        {
            Id = entity.Id,
            DocumentId = entity.DocumentId,
            DocumentType = entity.DocumentType,
            NumeroBureauOrdre = documentNumbers.NumeroBureauOrdre,
            NumeroCourrier = documentNumbers.NumeroCourrier,
            NumeroDossierJudiciaire = documentNumbers.NumeroDossierJudiciaire,
            DateDeReception = entity.DateDeReception,
            DateEnvoi = entity.DateEnvoi,
            Recepteur = entity.Recepteur,
            RecepteurUserName = PreferUserName(entity.RecepteurUserName, trackingUsers.ResponderUserName, entity.Recepteur),
            EmetteurService = entity.EmetteurService,
            EmetteurUserName = PreferUserName(entity.EmetteurUserName, trackingUsers.SenderUserName, entity.EmetteurService),
            SourceServiceId = entity.SourceServiceId,
            DestinationServiceId = entity.DestinationServiceId,
            Etat = entity.Etat,
            Notes = entity.Notes,
            CreationTime = entity.CreationTime,
            CreatorId = entity.CreatorId,
            LastModificationTime = entity.LastModificationTime,
            LastModifierId = entity.LastModifierId
        };
    }

    private async Task<TrackingUsers> GetTrackingUsersAsync(int documentId, string documentType)
    {
        var query = await _transactionRepository.GetQueryableAsync();
        var transactions = await AsyncExecuter.ToListAsync(query.Where(x => x.DocumentId == documentId));
        var normalizedType = NormalizeType(documentType);

        var matchingTransactions = transactions
            .Where(x => HasSameDocumentFamily(x.DocumentType, normalizedType))
            .OrderByDescending(x => x.DateReponse ?? x.DateEnvoi)
            .ToList();

        if (matchingTransactions.Count == 0)
        {
            matchingTransactions = transactions
                .OrderByDescending(x => x.DateReponse ?? x.DateEnvoi)
                .ToList();
        }

        var latestSentTransaction = matchingTransactions.FirstOrDefault();
        var latestAnsweredTransaction = matchingTransactions.FirstOrDefault(x => !string.IsNullOrWhiteSpace(x.ResponderUserName));

        return new TrackingUsers(latestSentTransaction?.SenderUserName, latestAnsweredTransaction?.ResponderUserName);
    }

    private async Task<DocumentNumbers> GetDocumentNumbersAsync(int documentId, string documentType)
    {
        if (IsJudiciaireType(documentType))
        {
            var document = await _courrierJudiciaireRepository.FindAsync(documentId);
            if (document != null)
            {
                return new DocumentNumbers(
                    document.IdBureauOrdre,
                    null,
                    BuildNumeroDossierJudiciaire(document));
            }
        }

        if (IsAdministratifType(documentType))
        {
            var document = await _courrierAdministratifRepository.FindAsync(documentId);
            if (document != null)
            {
                return new DocumentNumbers(
                    document.IdBureauOrdre,
                    document.NumeroDeCourrier,
                    null);
            }
        }

        var judiciaire = await _courrierJudiciaireRepository.FindAsync(documentId);
        if (judiciaire != null)
        {
            return new DocumentNumbers(
                judiciaire.IdBureauOrdre,
                null,
                BuildNumeroDossierJudiciaire(judiciaire));
        }

        var administratif = await _courrierAdministratifRepository.FindAsync(documentId);
        if (administratif != null)
        {
            return new DocumentNumbers(
                administratif.IdBureauOrdre,
                administratif.NumeroDeCourrier,
                null);
        }

        return DocumentNumbers.Empty;
    }

    private static bool IsJudiciaireType(string? documentType)
    {
        var value = NormalizeType(documentType);
        return value.Contains("judiciaire") || value.Contains("juridique") || value.Contains("appel");
    }

    private static bool IsAdministratifType(string? documentType)
    {
        var value = NormalizeType(documentType);
        return value.Contains("administratif") || value.Contains("admin") || value.Contains("courrier");
    }

    private static string NormalizeType(string? value)
    {
        return (value ?? string.Empty).Trim().ToLowerInvariant();
    }

    private static bool HasSameDocumentFamily(string? candidateType, string normalizedType)
    {
        var candidateIsJudiciaire = IsJudiciaireType(candidateType);
        var requestedIsJudiciaire = IsJudiciaireType(normalizedType);
        if (candidateIsJudiciaire || requestedIsJudiciaire)
        {
            return candidateIsJudiciaire && requestedIsJudiciaire;
        }

        return (IsAdministratifType(candidateType) && IsAdministratifType(normalizedType)) ||
               NormalizeType(candidateType) == normalizedType;
    }

    private static string? PreferUserName(string? storedUserName, string? fallbackUserName, string serviceName)
    {
        var stored = storedUserName?.Trim();
        if (string.IsNullOrWhiteSpace(stored) ||
            stored.Equals(serviceName.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return string.IsNullOrWhiteSpace(fallbackUserName) ? null : fallbackUserName.Trim();
        }

        return stored;
    }

    private static string? BuildNumeroDossierJudiciaire(CourrierJudiciaire? document)
    {
        if (document == null ||
            !document.NumeroDossierAnnee.HasValue ||
            !document.NumeroDossierNombre.HasValue ||
            !document.NumeroDossierSujet.HasValue)
        {
            return null;
        }

        return $"{document.NumeroDossierAnnee}/{document.NumeroDossierNombre}/{document.NumeroDossierSujet}";
    }

    private sealed record DocumentNumbers(
        string? NumeroBureauOrdre,
        string? NumeroCourrier,
        string? NumeroDossierJudiciaire)
    {
        public static DocumentNumbers Empty { get; } = new(null, null, null);
    }

    private sealed record TrackingUsers(string? SenderUserName, string? ResponderUserName);
}
