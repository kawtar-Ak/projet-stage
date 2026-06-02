using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Circulations;
using GestionCourrierAbp.Transactions;
using GestionCourrierAbp.Workflows;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Courriers;

public class CourrierJudiciaireAppService : GestionCourrierAbpAppService, ICourrierJudiciaireAppService
{
    private const int BureauOrdreServiceId = 2;
    private const int OpeningFilesServiceId = 3;
    private const int NotificationServiceId = 7;
    private const int CopyDeliveryServiceId = 10;
    private const int ArchiveServiceId = 13;
    private const string JudicialRecordDossier = "Dossier";
    private const string JudicialRecordDocumentLie = "DocumentLie";

    private readonly IRepository<CourrierJudiciaire, int> _repository;
    private readonly IRepository<RetraitJudiciaire, int> _retraitRepository;
    private readonly IRepository<Transaction, int> _transactionRepository;
    private readonly IRepository<Circulation, int> _circulationRepository;

    public CourrierJudiciaireAppService(
        IRepository<CourrierJudiciaire, int> repository,
        IRepository<RetraitJudiciaire, int> retraitRepository,
        IRepository<Transaction, int> transactionRepository,
        IRepository<Circulation, int> circulationRepository)
    {
        _repository = repository;
        _retraitRepository = retraitRepository;
        _transactionRepository = transactionRepository;
        _circulationRepository = circulationRepository;
    }

    public async Task<CourrierJudiciaireDto> GetAsync(int id)
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service!, x => x.Retraits, x => x.CourrierJudiciaireParent!))!;
        return ToDto(await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id)));
    }

    public async Task<PagedResultDto<CourrierJudiciaireDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = (await GetVisibleQueryAsync()).Where(x => !x.EstArchive);
        var total = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date).Skip(input.SkipCount).Take(input.MaxResultCount));
        return new PagedResultDto<CourrierJudiciaireDto>(total, items.Select(ToDto).ToList());
    }

    public async Task<CourrierJudiciaireDto> CreateAsync(CreateUpdateCourrierJudiciaireDto input)
    {
        // Verifie avant la creation que le numero d'ordre et le numero juridique ne sont pas deja utilises.
        await ApplyLinkedJudicialFileAsync(input);
        await ValidateUniqueNumbersAsync(input);
        var entity = await _repository.InsertAsync(Map(new CourrierJudiciaire(), input), autoSave: true);
        return await GetAsync(entity.Id);
    }

    public async Task<CourrierJudiciaireDto> UpdateAsync(int id, CreateUpdateCourrierJudiciaireDto input)
    {
        var entity = await _repository.GetAsync(id);
        // Verifie les doublons en ignorant le dossier en cours de modification.
        await ApplyLinkedJudicialFileAsync(input, id);
        await ValidateUniqueNumbersAsync(input, id);
        await _repository.UpdateAsync(Map(entity, input), autoSave: true);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        var documentIds = await GetDocumentIdsToDeleteAsync(id);
        foreach (var documentId in documentIds)
        {
            await DeleteTrackingAsync(documentId);
        }

        foreach (var childId in documentIds.Where(x => x != id))
        {
            await _repository.DeleteAsync(childId, autoSave: false);
        }

        await _repository.DeleteAsync(id, autoSave: true);
    }

    public async Task<List<CourrierJudiciaireDto>> SearchAsync(string? motCle)
    {
        var query = (await GetVisibleQueryAsync()).Where(x => !x.EstArchive);
        query = ApplySearch(query, motCle);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date));
        return items.Select(ToDto).ToList();
    }

    public async Task<List<CourrierJudiciaireDto>> GetArchivesAsync(string? motCle)
    {
        var query = (await GetVisibleQueryAsync()).Where(x => x.EstArchive);
        query = ApplySearch(query, motCle);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date));
        return items.Select(ToDto).ToList();
    }

    public async Task<CourrierJudiciaireDto> ArchiverAsync(int id)
    {
        return await ArchiverAvecDetailsAsync(id, DateTime.Now, null, null);
    }

    public async Task<CourrierJudiciaireDto> ArchiverAvecDetailsAsync(int id, DateTime? dateArchivage, string? cabinet, string? emplacement)
    {
        var entity = await _repository.GetAsync(id);
        entity.EstArchive = true;
        entity.EtatArchive = WorkflowStatus.Archive.ToStorageValue();
        entity.DateArchivage = dateArchivage ?? DateTime.Now;
        if (!string.IsNullOrWhiteSpace(cabinet))
        {
            entity.Cabinet = cabinet.Trim();
        }

        if (!string.IsNullOrWhiteSpace(emplacement))
        {
            entity.Emplacement = emplacement.Trim();
        }

        await _repository.UpdateAsync(entity, autoSave: true);
        return await GetAsync(id);
    }

    public async Task<CourrierJudiciaireDto> CreateRetraitAsync(int id, CreateRetraitJudiciaireDto input)
    {
        var courrier = await _repository.GetAsync(id);
        if (!courrier.EstArchive)
        {
            throw new BusinessException("RetraitDossierNonArchive");
        }

        await _retraitRepository.InsertAsync(new RetraitJudiciaire
        {
            CourrierJudiciaireId = id,
            DateDeRetrait = input.DateDeRetrait == default ? DateTime.Now : input.DateDeRetrait,
            MotifDeRetrait = input.MotifDeRetrait.Trim(),
            EffectuePar = input.EffectuePar?.Trim() ?? string.Empty,
            DateDeRetour = input.DateDeRetour,
            Notes = input.Notes?.Trim() ?? string.Empty
        }, autoSave: true);

        return await GetAsync(id);
    }

    public async Task<CourrierJudiciaireDto> RetourRetraitAsync(int retraitId, RetourRetraitJudiciaireDto input)
    {
        var retrait = await _retraitRepository.GetAsync(retraitId);
        retrait.DateDeRetour = input.DateDeRetour == default ? DateTime.Now : input.DateDeRetour;
        retrait.Notes = input.Notes?.Trim() ?? retrait.Notes;
        await _retraitRepository.UpdateAsync(retrait, autoSave: true);
        return await GetAsync(retrait.CourrierJudiciaireId);
    }

    public async Task DeleteRetraitAsync(int retraitId)
    {
        await _retraitRepository.DeleteAsync(retraitId, autoSave: true);
    }

    public Task<CourrierJudiciaireDto> RetraitsAsync(int id, CreateRetraitJudiciaireDto input)
    {
        return CreateRetraitAsync(id, input);
    }

    public Task<CourrierJudiciaireDto> RetourAsync(int retraitId, RetourRetraitJudiciaireDto input)
    {
        return RetourRetraitAsync(retraitId, input);
    }

    private static IQueryable<CourrierJudiciaire> ApplySearch(IQueryable<CourrierJudiciaire> query, string? motCle)
    {
        if (string.IsNullOrWhiteSpace(motCle)) return query;
        var value = motCle.Trim();
        var parts = value.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var parsedNumbers = parts.Select(part => int.TryParse(part, out var number) ? number : (int?)null).ToArray();

        if (parsedNumbers.Length == 3 && parsedNumbers.All(x => x.HasValue))
        {
            var parsed = ParseNumeroDossierParts(parsedNumbers.Select(x => x!.Value).ToArray());
            return query.Where(x =>
                x.Sujet.Contains(value) ||
                x.TribunalSource.Contains(value) ||
                x.TypeEnregistrementJudiciaire.Contains(value) ||
                x.TypeDocumentJudiciaire.Contains(value) ||
                x.Destinataire.Contains(value) ||
                x.Emplacement.Contains(value) ||
                x.Cabinet.Contains(value) ||
                x.EtatArchive.Contains(value) ||
                (x.IdBureauOrdre != null && x.IdBureauOrdre.Contains(value)) ||
                (x.NumeroDossierAnnee == parsed.annee &&
                    x.NumeroDossierNombre == parsed.nombre &&
                    x.NumeroDossierSujet == parsed.sujet) ||
                (x.NumeroDossierAnnee == parsed.annee &&
                    x.NumeroDossierNombre == parsed.sujet &&
                    x.NumeroDossierSujet == parsed.nombre) ||
                (x.NumeroDossierAnnee == parsed.nombre &&
                    x.NumeroDossierNombre == parsed.annee &&
                    x.NumeroDossierSujet == parsed.sujet) ||
                (x.NumeroDossierAnnee == parsed.nombre &&
                    x.NumeroDossierNombre == parsed.sujet &&
                    x.NumeroDossierSujet == parsed.annee) ||
                (x.NumeroDossierAnnee == parsed.sujet &&
                    x.NumeroDossierNombre == parsed.annee &&
                    x.NumeroDossierSujet == parsed.nombre) ||
                (x.NumeroDossierAnnee == parsed.sujet &&
                    x.NumeroDossierNombre == parsed.nombre &&
                    x.NumeroDossierSujet == parsed.annee));
        }

        if (parsedNumbers.Length == 1 && parsedNumbers[0].HasValue)
        {
            var number = parsedNumbers[0]!.Value;
            return query.Where(x =>
                x.Sujet.Contains(value) ||
                x.TribunalSource.Contains(value) ||
                x.TypeEnregistrementJudiciaire.Contains(value) ||
                x.TypeDocumentJudiciaire.Contains(value) ||
                x.Destinataire.Contains(value) ||
                x.Emplacement.Contains(value) ||
                x.Cabinet.Contains(value) ||
                x.EtatArchive.Contains(value) ||
                (x.IdBureauOrdre != null && x.IdBureauOrdre.Contains(value)) ||
                x.NumeroDossierAnnee == number ||
                x.NumeroDossierNombre == number ||
                x.NumeroDossierSujet == number);
        }

        return query.Where(x =>
            x.Sujet.Contains(value) ||
            x.TribunalSource.Contains(value) ||
            x.TypeEnregistrementJudiciaire.Contains(value) ||
            x.TypeDocumentJudiciaire.Contains(value) ||
            x.Destinataire.Contains(value) ||
            x.Emplacement.Contains(value) ||
            x.Cabinet.Contains(value) ||
            x.EtatArchive.Contains(value) ||
            (x.IdBureauOrdre != null && x.IdBureauOrdre.Contains(value)));
    }

    private static CourrierJudiciaire Map(CourrierJudiciaire entity, CreateUpdateCourrierJudiciaireDto input)
    {
        entity.IdBureauOrdre = NormalizeNumber(input.IdBureauOrdre);
        entity.Date = input.Date == default ? DateTime.Now : input.Date;
        entity.TribunalSource = input.TribunalSource.Trim();
        entity.TypeEnregistrementJudiciaire = IsLinkedJudicialDocument(input)
            ? JudicialRecordDocumentLie
            : NormalizeRecordType(input.TypeEnregistrementJudiciaire);
        entity.TypeDocumentJudiciaire = entity.TypeEnregistrementJudiciaire == JudicialRecordDocumentLie
            ? input.TypeDocumentJudiciaire?.Trim() ?? string.Empty
            : string.Empty;
        entity.Sujet = input.Sujet.Trim();
        entity.Direction = input.Direction?.Trim() ?? "Entrant";
        entity.Destinataire = input.Destinataire?.Trim() ?? string.Empty;
        entity.Description = input.Description?.Trim() ?? string.Empty;
        entity.Emplacement = input.Emplacement?.Trim() ?? string.Empty;
        entity.Cabinet = input.Cabinet?.Trim() ?? string.Empty;
        entity.LienPdf = input.LienPdf?.Trim() ?? string.Empty;
        entity.ServiceId = input.IdService;
        entity.EstArchive = input.IdService == ArchiveServiceId;
        entity.EtatArchive = GetJudicialStateForService(input.IdService);
        entity.CourrierJudiciaireParentId = IsLinkedJudicialDocument(input)
            ? input.CourrierJudiciaireParentId
            : null;
        var parsed = ParseNumeroDossier(input);
        entity.NumeroDossierAnnee = parsed.annee;
        entity.NumeroDossierNombre = parsed.nombre;
        entity.NumeroDossierSujet = parsed.sujet;
        entity.EstTransmissible = true;

        return entity;
    }

    private async Task ValidateUniqueNumbersAsync(CreateUpdateCourrierJudiciaireDto input, int? currentId = null)
    {
        // Controle l'unicite du numero d'ordre.
        var idBureauOrdre = NormalizeNumber(input.IdBureauOrdre);
        if (!string.IsNullOrWhiteSpace(idBureauOrdre))
        {
            var query = (await _repository.GetQueryableAsync())
                .Where(x => x.IdBureauOrdre == idBureauOrdre);

            if (currentId.HasValue)
            {
                query = query.Where(x => x.Id != currentId.Value);
            }

            if (await AsyncExecuter.AnyAsync(query))
            {
                throw new UserFriendlyException("Le numéro d'ordre existe déjà. Veuillez saisir un numéro unique.");
            }
        }

        if (IsLinkedJudicialDocument(input))
        {
            return;
        }

        // Controle l'unicite du numero juridique compose de annee/nombre/sujet.
        var parsed = ParseNumeroDossier(input);
        if (parsed.annee.HasValue && parsed.nombre.HasValue && parsed.sujet.HasValue)
        {
            var query = (await _repository.GetQueryableAsync())
                .Where(x =>
                    x.NumeroDossierAnnee == parsed.annee &&
                    x.NumeroDossierNombre == parsed.nombre &&
                    x.NumeroDossierSujet == parsed.sujet);

            if (currentId.HasValue)
            {
                query = query.Where(x => x.Id != currentId.Value);
            }

            if (await AsyncExecuter.AnyAsync(query))
            {
                throw new UserFriendlyException("Le numéro juridique existe déjà. Veuillez saisir un numéro unique.");
            }
        }
    }

    private async Task ApplyLinkedJudicialFileAsync(CreateUpdateCourrierJudiciaireDto input, int? currentId = null)
    {
        if (!IsLinkedJudicialDocument(input)) return;

        if (!input.CourrierJudiciaireParentId.HasValue)
        {
            throw new UserFriendlyException("Veuillez choisir le dossier judiciaire lie.");
        }

        if (currentId.HasValue && input.CourrierJudiciaireParentId.Value == currentId.Value)
        {
            throw new UserFriendlyException("Une document lie ne peut pas etre lie a lui-meme.");
        }

        var parent = await _repository.GetAsync(input.CourrierJudiciaireParentId.Value);
        if (parent.TypeEnregistrementJudiciaire == JudicialRecordDocumentLie)
        {
            throw new UserFriendlyException("La document lie doit etre rattache a un dossier judiciaire principal.");
        }

        input.NumeroDossierAnnee = parent.NumeroDossierAnnee;
        input.NumeroDossierNombre = parent.NumeroDossierNombre;
        input.NumeroDossierSujet = parent.NumeroDossierSujet;
        input.NumeroDossier = null;
    }

    private static bool IsLinkedJudicialDocument(CreateUpdateCourrierJudiciaireDto input)
    {
        return input.CourrierJudiciaireParentId.HasValue ||
            NormalizeRecordType(input.TypeEnregistrementJudiciaire) == JudicialRecordDocumentLie;
    }

    private static string GetJudicialStateForService(int serviceId)
    {
        if (serviceId is BureauOrdreServiceId or OpeningFilesServiceId)
        {
            return WorkflowStatus.Nouveau.ToStorageValue();
        }

        if (serviceId is NotificationServiceId or CopyDeliveryServiceId)
        {
            return "Jugé";
        }

        if (serviceId == ArchiveServiceId)
        {
            return WorkflowStatus.Archive.ToStorageValue();
        }

        return WorkflowStatus.EnCours.ToStorageValue();
    }

    private static string NormalizeRecordType(string? value)
    {
        return string.Equals(value?.Trim(), JudicialRecordDocumentLie, StringComparison.OrdinalIgnoreCase)
            ? JudicialRecordDocumentLie
            : JudicialRecordDossier;
    }

    private static (int? annee, int? nombre, int? sujet) ParseNumeroDossier(CreateUpdateCourrierJudiciaireDto input)
    {
        if (input.NumeroDossierAnnee.HasValue || input.NumeroDossierNombre.HasValue || input.NumeroDossierSujet.HasValue)
            return (input.NumeroDossierAnnee, input.NumeroDossierNombre, input.NumeroDossierSujet);

        var parts = input.NumeroDossier?.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts?.Length == 3 &&
            int.TryParse(parts[0], out var first) &&
            int.TryParse(parts[1], out var second) &&
            int.TryParse(parts[2], out var third))
            return ParseNumeroDossierParts(new[] { first, second, third });

        return (null, null, null);
    }

    private static (int? annee, int? nombre, int? sujet) ParseNumeroDossierParts(int[] parts)
    {
        if (parts.Length != 3) return (null, null, null);

        var yearIndex = Array.FindIndex(parts, IsLikelyYear);
        if (yearIndex >= 0)
        {
            var others = parts.Where((_, index) => index != yearIndex).ToArray();
            return (parts[yearIndex], others[0], others[1]);
        }

        return (parts[0], parts[1], parts[2]);
    }

    private static bool IsLikelyYear(int value)
    {
        return value >= 1900 && value <= 2100;
    }

    private static bool HasCompleteNumeroDossier((int? annee, int? nombre, int? sujet) numero)
    {
        return numero.annee.HasValue && numero.nombre.HasValue && numero.sujet.HasValue;
    }

    private static string? NormalizeNumber(string? value)
    {
        // Nettoie le numero pour eviter les faux doublons avec des espaces.
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task<List<int>> GetDocumentIdsToDeleteAsync(int id)
    {
        var query = await _repository.GetQueryableAsync();
        var ids = new List<int> { id };
        var index = 0;

        while (index < ids.Count)
        {
            var parentId = ids[index++];
            var childIds = await AsyncExecuter.ToListAsync(
                query
                    .Where(x => x.CourrierJudiciaireParentId == parentId)
                    .Select(x => x.Id));

            foreach (var childId in childIds)
            {
                if (!ids.Contains(childId))
                {
                    ids.Add(childId);
                }
            }
        }

        return ids;
    }

    private async Task DeleteTrackingAsync(int documentId)
    {
        var transactionsQuery = await _transactionRepository.GetQueryableAsync();
        var transactions = await AsyncExecuter.ToListAsync(
            transactionsQuery.Where(x => x.DocumentId == documentId));

        foreach (var transaction in transactions.Where(x => IsJudiciaireDocumentType(x.DocumentType)))
        {
            await _transactionRepository.DeleteAsync(transaction, autoSave: false);
        }

        var circulationsQuery = await _circulationRepository.GetQueryableAsync();
        var circulations = await AsyncExecuter.ToListAsync(
            circulationsQuery.Where(x => x.DocumentId == documentId));

        foreach (var circulation in circulations.Where(x => IsJudiciaireDocumentType(x.DocumentType)))
        {
            await _circulationRepository.DeleteAsync(circulation, autoSave: false);
        }
    }

    private async Task<IQueryable<CourrierJudiciaire>> GetVisibleQueryAsync()
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service!, x => x.Retraits, x => x.CourrierJudiciaireParent!))!;
        var existingIds = (await _repository.GetQueryableAsync()).Select(x => x.Id);

        return query.Where(x => !x.CourrierJudiciaireParentId.HasValue ||
            existingIds.Contains(x.CourrierJudiciaireParentId.Value));
    }

    private static string? BuildNumeroDossier(CourrierJudiciaire? entity)
    {
        return entity?.NumeroDossierAnnee.HasValue == true &&
            entity.NumeroDossierNombre.HasValue &&
            entity.NumeroDossierSujet.HasValue
            ? $"{entity.NumeroDossierAnnee}/{entity.NumeroDossierNombre}/{entity.NumeroDossierSujet}"
            : null;
    }

    private static CourrierJudiciaireDto ToDto(CourrierJudiciaire entity)
    {
        var typeEnregistrement = entity.CourrierJudiciaireParentId.HasValue
            ? JudicialRecordDocumentLie
            : NormalizeRecordType(entity.TypeEnregistrementJudiciaire);
        var parentNumero = BuildNumeroDossier(entity.CourrierJudiciaireParent);
        var numero = typeEnregistrement == JudicialRecordDocumentLie
            ? BuildNumeroDossier(entity) ?? parentNumero
            : BuildNumeroDossier(entity);

        return new CourrierJudiciaireDto
        {
            Id = entity.Id,
            IdBureauOrdre = entity.IdBureauOrdre,
            Date = entity.Date,
            TribunalSource = entity.TribunalSource,
            TypeEnregistrementJudiciaire = typeEnregistrement,
            TypeDocumentJudiciaire = entity.TypeDocumentJudiciaire,
            Sujet = entity.Sujet,
            Direction = entity.Direction,
            Destinataire = entity.Destinataire,
            Description = entity.Description,
            EtatArchive = entity.EtatArchive,
            Emplacement = entity.Emplacement,
            Cabinet = entity.Cabinet,
            DateArchivage = entity.DateArchivage,
            LienPdf = entity.LienPdf,
            EstTransmissible = entity.EstTransmissible,
            EstArchive = entity.EstArchive,
            IdService = entity.ServiceId,
            ServiceNom = entity.Service?.NomService,
            NumeroDossier = numero,
            NumeroDossierAnnee = entity.NumeroDossierAnnee,
            NumeroDossierNombre = entity.NumeroDossierNombre,
            NumeroDossierSujet = entity.NumeroDossierSujet,
            CourrierJudiciaireParentId = entity.CourrierJudiciaireParentId,
            DossierParentNumero = typeEnregistrement == JudicialRecordDocumentLie
                ? parentNumero ?? BuildNumeroDossier(entity)
                : null,
            RetraitsCount = entity.Retraits.Count,
            Retraits = entity.Retraits.OrderByDescending(x => x.DateDeRetrait).Select(r => new RetraitJudiciaireDto
            {
                Id = r.Id,
                DateDeRetrait = r.DateDeRetrait,
                MotifDeRetrait = r.MotifDeRetrait,
                EffectuePar = r.EffectuePar,
                DateDeRetour = r.DateDeRetour,
                Notes = r.Notes,
                CreationTime = r.CreationTime,
                CreatorId = r.CreatorId,
                LastModificationTime = r.LastModificationTime,
                LastModifierId = r.LastModifierId
            }).ToList(),
            CreationTime = entity.CreationTime,
            CreatorId = entity.CreatorId,
            LastModificationTime = entity.LastModificationTime,
            LastModifierId = entity.LastModifierId
        };
    }

    private static bool IsJudiciaireDocumentType(string? documentType)
    {
        var value = (documentType ?? string.Empty).Trim().ToLowerInvariant();
        return value.Contains("judiciaire") || value.Contains("juridique") || value.Contains("appel");
    }
}
