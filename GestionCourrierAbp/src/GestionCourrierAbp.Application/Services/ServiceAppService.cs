using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Services;

public class ServiceAppService : GestionCourrierAbpAppService, IServiceAppService
{
    private readonly IRepository<Service, int> _repository;

    public ServiceAppService(IRepository<Service, int> repository)
    {
        _repository = repository;
    }

    public async Task<ServiceDto> GetAsync(int id)
    {
        return ToDto(await _repository.GetAsync(id));
    }

    public async Task<PagedResultDto<ServiceDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderBy(x => x.Id).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<ServiceDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<ServiceDto> CreateAsync(CreateUpdateServiceDto input)
    {
        var service = await _repository.InsertAsync(new Service
        {
            NomService = input.NomService.Trim(),
            Description = input.Description?.Trim() ?? string.Empty,
            Etage = string.IsNullOrWhiteSpace(input.Etage) ? null : input.Etage.Trim()
        }, autoSave: true);

        return ToDto(service);
    }

    public async Task<ServiceDto> UpdateAsync(int id, CreateUpdateServiceDto input)
    {
        var service = await _repository.GetAsync(id);
        service.NomService = input.NomService.Trim();
        service.Description = input.Description?.Trim() ?? string.Empty;
        service.Etage = string.IsNullOrWhiteSpace(input.Etage) ? null : input.Etage.Trim();

        return ToDto(await _repository.UpdateAsync(service, autoSave: true));
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    private static ServiceDto ToDto(Service service)
    {
        return new ServiceDto
        {
            Id = service.Id,
            NomService = service.NomService,
            Description = service.Description,
            Etage = service.Etage,
            CreationTime = service.CreationTime,
            CreatorId = service.CreatorId,
            LastModificationTime = service.LastModificationTime,
            LastModifierId = service.LastModifierId
        };
    }
}
