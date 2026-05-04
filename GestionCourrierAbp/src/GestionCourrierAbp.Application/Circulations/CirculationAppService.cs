using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Circulations;

public class CirculationAppService : GestionCourrierAbpAppService, ICirculationAppService
{
    private readonly IRepository<Circulation, int> _repository;

    public CirculationAppService(IRepository<Circulation, int> repository)
    {
        _repository = repository;
    }

    public async Task<CirculationDto> GetAsync(int id)
    {
        return ToDto(await _repository.GetAsync(id));
    }

    public async Task<PagedResultDto<CirculationDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderByDescending(x => x.DateDeReception).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<CirculationDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<List<CirculationDto>> GetHistoryAsync(int documentId, string documentType)
    {
        var normalizedType = documentType.Trim();
        var query = await _repository.GetQueryableAsync();
        var items = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.DocumentId == documentId && x.DocumentType == normalizedType)
                .OrderByDescending(x => x.DateDeReception));

        return items.Select(ToDto).ToList();
    }

    public async Task<CirculationDto> CreateAsync(CreateUpdateCirculationDto input)
    {
        var entity = await _repository.InsertAsync(Map(new Circulation(), input), autoSave: true);
        return ToDto(entity);
    }

    public async Task<CirculationDto> UpdateAsync(int id, CreateUpdateCirculationDto input)
    {
        var entity = await _repository.GetAsync(id);
        await _repository.UpdateAsync(Map(entity, input), autoSave: true);
        return ToDto(entity);
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
        entity.EmetteurService = input.EmetteurService?.Trim() ?? string.Empty;
        entity.SourceServiceId = input.SourceServiceId;
        entity.DestinationServiceId = input.DestinationServiceId;
        entity.Etat = input.Etat?.Trim() ?? string.Empty;
        entity.Notes = input.Notes?.Trim() ?? string.Empty;
        return entity;
    }

    private static CirculationDto ToDto(Circulation entity)
    {
        return new CirculationDto
        {
            Id = entity.Id,
            DocumentId = entity.DocumentId,
            DocumentType = entity.DocumentType,
            DateDeReception = entity.DateDeReception,
            DateEnvoi = entity.DateEnvoi,
            Recepteur = entity.Recepteur,
            EmetteurService = entity.EmetteurService,
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
}
