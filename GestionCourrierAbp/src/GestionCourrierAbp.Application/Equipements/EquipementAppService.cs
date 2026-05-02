using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Equipements;

public class EquipementAppService : GestionCourrierAbpAppService, IEquipementAppService
{
    private readonly IRepository<Equipement, int> _repository;
    private readonly IRepository<Services.Service, int> _serviceRepository;

    public EquipementAppService(
        IRepository<Equipement, int> repository,
        IRepository<Services.Service, int> serviceRepository)
    {
        _repository = repository;
        _serviceRepository = serviceRepository;
    }

    public async Task<EquipementDto> GetAsync(int id)
    {
        var query = await _repository.WithDetailsAsync(x => x.Service);
        return ToDto(await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id)));
    }

    public async Task<PagedResultDto<EquipementDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.WithDetailsAsync(x => x.Service);
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderBy(x => x.Id).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<EquipementDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<EquipementDto> CreateAsync(CreateUpdateEquipementDto input)
    {
        await EnsureServiceExistsAsync(input.ServiceId);

        var equipement = await _repository.InsertAsync(new Equipement
        {
            Serial = input.Serial,
            Type = input.Type,
            Etat = input.Etat,
            ServiceId = input.ServiceId,
            EstCharge = false
        }, autoSave: true);

        return await GetAsync(equipement.Id);
    }

    public async Task<EquipementDto> UpdateAsync(int id, CreateUpdateEquipementDto input)
    {
        await EnsureServiceExistsAsync(input.ServiceId);
        var equipement = await _repository.GetAsync(id);
        equipement.Serial = input.Serial;
        equipement.Type = input.Type;
        equipement.Etat = input.Etat;
        equipement.ServiceId = input.ServiceId;

        await _repository.UpdateAsync(equipement, autoSave: true);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    public async Task<EquipementDto> ChargerAsync(int id)
    {
        var equipement = await _repository.GetAsync(id);
        equipement.EstCharge = true;
        equipement.DateDechargement = null;
        await _repository.UpdateAsync(equipement, autoSave: true);
        return await GetAsync(id);
    }

    public async Task<EquipementDto> DechargerAsync(int id)
    {
        var equipement = await _repository.GetAsync(id);
        equipement.EstCharge = false;
        equipement.DateDechargement = DateTime.Now;
        await _repository.UpdateAsync(equipement, autoSave: true);
        return await GetAsync(id);
    }

    private async Task EnsureServiceExistsAsync(int serviceId)
    {
        if (!await _serviceRepository.AnyAsync(x => x.Id == serviceId))
        {
            throw new BusinessException("ServiceInexistant");
        }
    }

    private static EquipementDto ToDto(Equipement equipement)
    {
        return new EquipementDto
        {
            Id = equipement.Id,
            Serial = equipement.Serial,
            Type = equipement.Type,
            Etat = equipement.Etat,
            ServiceId = equipement.ServiceId,
            ServiceNom = equipement.Service?.NomService,
            ServiceEtage = equipement.Service?.Etage,
            EstCharge = equipement.EstCharge,
            DateDechargement = equipement.DateDechargement,
            CreationTime = equipement.CreationTime,
            CreatorId = equipement.CreatorId,
            LastModificationTime = equipement.LastModificationTime,
            LastModifierId = equipement.LastModifierId
        };
    }
}
