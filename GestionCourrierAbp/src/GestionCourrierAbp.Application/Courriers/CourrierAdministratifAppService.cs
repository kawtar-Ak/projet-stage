using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Courriers;

public class CourrierAdministratifAppService : GestionCourrierAbpAppService, ICourrierAdministratifAppService
{
    private readonly IRepository<CourrierAdministratif, int> _repository;

    public CourrierAdministratifAppService(IRepository<CourrierAdministratif, int> repository)
    {
        _repository = repository;
    }

    public async Task<CourrierAdministratifDto> GetAsync(int id)
    {
        var query = await _repository.WithDetailsAsync(x => x.Service);
        return ToDto(await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id)));
    }

    public async Task<PagedResultDto<CourrierAdministratifDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service)).Where(x => !x.EstArchive);
        var total = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date).Skip(input.SkipCount).Take(input.MaxResultCount));
        return new PagedResultDto<CourrierAdministratifDto>(total, items.Select(ToDto).ToList());
    }

    public async Task<CourrierAdministratifDto> CreateAsync(CreateUpdateCourrierAdministratifDto input)
    {
        var entity = await _repository.InsertAsync(Map(new CourrierAdministratif(), input), autoSave: true);
        return await GetAsync(entity.Id);
    }

    public async Task<CourrierAdministratifDto> UpdateAsync(int id, CreateUpdateCourrierAdministratifDto input)
    {
        var entity = await _repository.GetAsync(id);
        await _repository.UpdateAsync(Map(entity, input), autoSave: true);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    public async Task<List<CourrierAdministratifDto>> SearchAsync(string? motCle)
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service)).Where(x => !x.EstArchive);
        if (!string.IsNullOrWhiteSpace(motCle))
        {
            var value = motCle.Trim();
            query = query.Where(x =>
                x.Sujet.Contains(value) ||
                x.Source.Contains(value) ||
                x.Destinataire.Contains(value) ||
                x.NumeroDeCourrier.Contains(value) ||
                (x.IdBureauOrdre != null && x.IdBureauOrdre.Contains(value)));
        }

        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date));
        return items.Select(ToDto).ToList();
    }

    public async Task<List<CourrierAdministratifDto>> GetWaridatAsync()
    {
        var query = (await _repository.WithDetailsAsync(x => x.Service))
            .Where(x => !x.EstArchive && x.TypeRegistre == "Waridat");
        var items = await AsyncExecuter.ToListAsync(query.OrderByDescending(x => x.Date));
        return items.Select(ToDto).ToList();
    }

    public async Task<CourrierAdministratifDto> ArchiverAsync(int id)
    {
        var entity = await _repository.GetAsync(id);
        entity.EstArchive = true;
        entity.Etat = "Archive";
        await _repository.UpdateAsync(entity, autoSave: true);
        return await GetAsync(id);
    }

    private static CourrierAdministratif Map(CourrierAdministratif entity, CreateUpdateCourrierAdministratifDto input)
    {
        entity.IdBureauOrdre = input.IdBureauOrdre;
        entity.Date = input.Date == default ? DateTime.Now : input.Date;
        entity.Source = input.Source?.Trim() ?? string.Empty;
        entity.Sujet = input.Sujet.Trim();
        entity.Destinataire = input.Destinataire?.Trim() ?? string.Empty;
        entity.Description = input.Description?.Trim() ?? string.Empty;
        entity.Etat = input.Etat?.Trim() ?? "Nouveau";
        entity.LienPdf = input.LienPdf?.Trim() ?? string.Empty;
        entity.Direction = input.Direction?.Trim() ?? "Entrant";
        entity.TypeRegistre = input.TypeRegistre?.Trim() ?? "Waridat";
        entity.TypeCorrespondance = input.TypeCorrespondance;
        entity.ParentId = input.ParentId;
        entity.ServiceId = input.IdService;
        entity.NumeroDeCourrier = input.NumeroDeCourrier?.Trim() ?? string.Empty;
        entity.EstTransmissible = input.EstTransmissible;
        return entity;
    }

    private static CourrierAdministratifDto ToDto(CourrierAdministratif entity)
    {
        return new CourrierAdministratifDto
        {
            Id = entity.Id,
            IdBureauOrdre = entity.IdBureauOrdre,
            Date = entity.Date,
            Source = entity.Source,
            Sujet = entity.Sujet,
            Destinataire = entity.Destinataire,
            Description = entity.Description,
            Etat = entity.Etat,
            LienPdf = entity.LienPdf,
            Direction = entity.Direction,
            TypeDocument = entity.TypeDocument,
            NumeroDeCourrier = entity.NumeroDeCourrier,
            TypeRegistre = entity.TypeRegistre,
            TypeCorrespondance = entity.TypeCorrespondance,
            ParentId = entity.ParentId,
            EstTransmissible = entity.EstTransmissible,
            EstArchive = entity.EstArchive,
            IdService = entity.ServiceId,
            ServiceNom = entity.Service?.NomService,
            CreationTime = entity.CreationTime,
            CreatorId = entity.CreatorId,
            LastModificationTime = entity.LastModificationTime,
            LastModifierId = entity.LastModifierId
        };
    }
}
