using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Workflows;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Courriers;

public class CourrierJudiciaireAppService : GestionCourrierAbpAppService, ICourrierJudiciaireAppService
{
    private readonly IRepository<CourrierJudiciaire, int> _repository;
    private readonly IRepository<RetraitJudiciaire, int> _retraitRepository;

    public CourrierJudiciaireAppService(
        IRepository<CourrierJudiciaire, int> repository,
        IRepository<RetraitJudiciaire, int> retraitRepository)
    {
        _repository = repository;
        _retraitRepository = retraitRepository;
    }

    public async Task<CourrierJudiciaireDto> GetAsync(int id)
    {
        var query = await _repository.WithDetailsAsync(x => x.Service, x => x.Retraits);
        return ToDto(await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id)));
    }

    public async Task<PagedResultDto<CourrierJudiciaireDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service, x => x.Retraits)).Where(x => !x.EstArchive);
        var total = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date).Skip(input.SkipCount).Take(input.MaxResultCount));
        return new PagedResultDto<CourrierJudiciaireDto>(total, items.Select(ToDto).ToList());
    }

    public async Task<CourrierJudiciaireDto> CreateAsync(CreateUpdateCourrierJudiciaireDto input)
    {
        // Verifie avant la creation que le numero d'ordre et le numero juridique ne sont pas deja utilises.
        await ValidateUniqueNumbersAsync(input);
        var entity = await _repository.InsertAsync(Map(new CourrierJudiciaire(), input), autoSave: true);
        return await GetAsync(entity.Id);
    }

    public async Task<CourrierJudiciaireDto> UpdateAsync(int id, CreateUpdateCourrierJudiciaireDto input)
    {
        var entity = await _repository.GetAsync(id);
        // Verifie les doublons en ignorant le dossier en cours de modification.
        await ValidateUniqueNumbersAsync(input, id);
        await _repository.UpdateAsync(Map(entity, input), autoSave: true);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    public async Task<List<CourrierJudiciaireDto>> SearchAsync(string? motCle)
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service, x => x.Retraits)).Where(x => !x.EstArchive);
        query = ApplySearch(query, motCle);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date));
        return items.Select(ToDto).ToList();
    }

    public async Task<List<CourrierJudiciaireDto>> GetArchivesAsync(string? motCle)
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service, x => x.Retraits)).Where(x => x.EstArchive);
        query = ApplySearch(query, motCle);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date));
        return items.Select(ToDto).ToList();
    }

    public async Task<CourrierJudiciaireDto> ArchiverAsync(int id)
    {
        var entity = await _repository.GetAsync(id);
        entity.EstArchive = true;
        entity.EtatArchive = WorkflowStatus.Archive.ToStorageValue();
        await _repository.UpdateAsync(entity, autoSave: true);
        return await GetAsync(id);
    }

    public async Task<CourrierJudiciaireDto> CreateRetraitAsync(int id, CreateRetraitJudiciaireDto input)
    {
        await _repository.GetAsync(id);
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
        return query.Where(x =>
            x.Sujet.Contains(value) ||
            x.TribunalSource.Contains(value) ||
            x.Destinataire.Contains(value) ||
            x.Emplacement.Contains(value) ||
            (x.IdBureauOrdre != null && x.IdBureauOrdre.Contains(value)));
    }

    private static CourrierJudiciaire Map(CourrierJudiciaire entity, CreateUpdateCourrierJudiciaireDto input)
    {
        entity.IdBureauOrdre = NormalizeNumber(input.IdBureauOrdre);
        entity.Date = input.Date == default ? DateTime.Now : input.Date;
        entity.TribunalSource = input.TribunalSource.Trim();
        entity.Sujet = input.Sujet.Trim();
        entity.Direction = input.Direction?.Trim() ?? "Entrant";
        entity.Destinataire = input.Destinataire?.Trim() ?? string.Empty;
        entity.Description = input.Description?.Trim() ?? string.Empty;
        entity.EtatArchive = input.EtatArchive?.Trim() ?? WorkflowStatus.Nouveau.ToStorageValue();
        entity.Emplacement = input.Emplacement?.Trim() ?? string.Empty;
        entity.LienPdf = input.LienPdf?.Trim() ?? string.Empty;
        entity.ServiceId = input.IdService;
        entity.EstTransmissible = input.EstTransmissible;
        var parsed = ParseNumeroDossier(input);
        entity.NumeroDossierAnnee = parsed.annee;
        entity.NumeroDossierNombre = parsed.nombre;
        entity.NumeroDossierSujet = parsed.sujet;
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

    private static (int? annee, int? nombre, int? sujet) ParseNumeroDossier(CreateUpdateCourrierJudiciaireDto input)
    {
        if (input.NumeroDossierAnnee.HasValue || input.NumeroDossierNombre.HasValue || input.NumeroDossierSujet.HasValue)
            return (input.NumeroDossierAnnee, input.NumeroDossierNombre, input.NumeroDossierSujet);

        var parts = input.NumeroDossier?.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts?.Length == 3 &&
            int.TryParse(parts[0], out var annee) &&
            int.TryParse(parts[1], out var nombre) &&
            int.TryParse(parts[2], out var sujet))
            return (annee, nombre, sujet);

        return (null, null, null);
    }

    private static string? NormalizeNumber(string? value)
    {
        // Nettoie le numero pour eviter les faux doublons avec des espaces.
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static CourrierJudiciaireDto ToDto(CourrierJudiciaire entity)
    {
        var numero = entity.NumeroDossierAnnee.HasValue && entity.NumeroDossierNombre.HasValue && entity.NumeroDossierSujet.HasValue
            ? $"{entity.NumeroDossierAnnee}/{entity.NumeroDossierNombre}/{entity.NumeroDossierSujet}"
            : null;

        return new CourrierJudiciaireDto
        {
            Id = entity.Id,
            IdBureauOrdre = entity.IdBureauOrdre,
            Date = entity.Date,
            TribunalSource = entity.TribunalSource,
            Sujet = entity.Sujet,
            Direction = entity.Direction,
            Destinataire = entity.Destinataire,
            Description = entity.Description,
            EtatArchive = entity.EtatArchive,
            Emplacement = entity.Emplacement,
            LienPdf = entity.LienPdf,
            EstTransmissible = entity.EstTransmissible,
            EstArchive = entity.EstArchive,
            IdService = entity.ServiceId,
            ServiceNom = entity.Service?.NomService,
            NumeroDossier = numero,
            NumeroDossierAnnee = entity.NumeroDossierAnnee,
            NumeroDossierNombre = entity.NumeroDossierNombre,
            NumeroDossierSujet = entity.NumeroDossierSujet,
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
}
