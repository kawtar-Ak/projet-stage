using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Lookups;

public class LookupItemAppService : GestionCourrierAbpAppService, ILookupItemAppService
{
    private readonly IRepository<LookupItem, int> _repository;

    public LookupItemAppService(IRepository<LookupItem, int> repository)
    {
        _repository = repository;
    }

    public async Task<List<LookupItemDto>> GetByListNameAsync(string listName)
    {
        await EnsureDefaultsAsync();

        var normalizedListName = NormalizeListName(listName);
        var query = await _repository.GetQueryableAsync();
        var items = await AsyncExecuter.ToListAsync(
            query
                .Where(x => x.ListName == normalizedListName && x.IsActive)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.Label));

        return items.Select(ToDto).ToList();
    }

    public async Task<PagedResultDto<LookupItemDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        await EnsureDefaultsAsync();

        var query = await _repository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query
                .OrderBy(x => x.ListName)
                .ThenBy(x => x.SortOrder)
                .ThenBy(x => x.Label)
                .Skip(input.SkipCount)
                .Take(input.MaxResultCount));

        return new PagedResultDto<LookupItemDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<LookupItemDto> CreateAsync(CreateUpdateLookupItemDto input)
    {
        var item = await _repository.InsertAsync(new LookupItem
        {
            ListName = NormalizeListName(input.ListName),
            Value = input.Value.Trim(),
            Label = string.IsNullOrWhiteSpace(input.Label) ? input.Value.Trim() : input.Label.Trim(),
            SortOrder = input.SortOrder,
            IsActive = input.IsActive
        }, autoSave: true);

        return ToDto(item);
    }

    public async Task<LookupItemDto> UpdateAsync(int id, CreateUpdateLookupItemDto input)
    {
        var item = await _repository.GetAsync(id);
        item.ListName = NormalizeListName(input.ListName);
        item.Value = input.Value.Trim();
        item.Label = string.IsNullOrWhiteSpace(input.Label) ? input.Value.Trim() : input.Label.Trim();
        item.SortOrder = input.SortOrder;
        item.IsActive = input.IsActive;

        return ToDto(await _repository.UpdateAsync(item, autoSave: true));
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    private async Task EnsureDefaultsAsync()
    {
        var query = await _repository.GetQueryableAsync();
        var hasAny = await AsyncExecuter.AnyAsync(query);
        if (hasAny)
        {
            return;
        }

        foreach (var item in GetDefaultItems())
        {
            await _repository.InsertAsync(new LookupItem
            {
                ListName = item.ListName,
                Value = item.Value,
                Label = item.Label,
                SortOrder = item.SortOrder,
                IsActive = true
            }, autoSave: true);
        }
    }

    private static string NormalizeListName(string value)
    {
        return (value ?? string.Empty).Trim();
    }

    private static LookupItemDto ToDto(LookupItem item)
    {
        return new LookupItemDto
        {
            Id = item.Id,
            ListName = item.ListName,
            Value = item.Value,
            Label = item.Label,
            SortOrder = item.SortOrder,
            IsActive = item.IsActive,
            CreationTime = item.CreationTime
        };
    }

    private static List<DefaultLookupItem> GetDefaultItems()
    {
        return new List<DefaultLookupItem>
        {
            new("courrier.etat", "Nouveau", "Nouveau", 1),
            new("courrier.etat", "En cours", "En cours", 2),
            new("courrier.etat", "Traite", "Traite", 3),
            new("courrier.etat", "Archive", "Archive", 4),
            new("judiciaire.typeDocument", "Requete", "Requete", 1),
            new("judiciaire.typeDocument", "Jugement", "Jugement", 2),
            new("judiciaire.typeDocument", "Arret", "Arret", 3),
            new("judiciaire.typeDocument", "Convocation", "Convocation", 4),
            new("judiciaire.typeDocument", "Notification", "Notification", 5),
            new("administratif.source", "Ministere de la Justice", "Ministere de la Justice", 1),
            new("administratif.source", "Tribunal", "Tribunal", 2),
            new("administratif.source", "Service interne", "Service interne", 3),
            new("equipement.type", "1", "Ordinateur", 1),
            new("equipement.type", "2", "Imprimante", 2),
            new("equipement.type", "3", "Scanner", 3),
            new("equipement.type", "4", "Photocopieur", 4),
            new("equipement.etat", "1", "Neuf", 1),
            new("equipement.etat", "2", "Bon etat", 2),
            new("equipement.etat", "3", "A reparer", 3),
            new("equipement.etat", "4", "Hors service", 4)
        };
    }

    private sealed record DefaultLookupItem(string ListName, string Value, string Label, int SortOrder);
}
