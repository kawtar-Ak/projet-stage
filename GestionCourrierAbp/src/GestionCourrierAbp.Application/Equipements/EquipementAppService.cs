using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Equipements;

public class EquipementAppService :
    CrudAppService<Equipement, EquipementDto, int, PagedAndSortedResultRequestDto, CreateUpdateEquipementDto>,
    IEquipementAppService
{
    private readonly IRepository<Services.Service, int> _serviceRepository;

    public EquipementAppService(
        IRepository<Equipement, int> repository,
        IRepository<Services.Service, int> serviceRepository)
        : base(repository)
    {
        _serviceRepository = serviceRepository;
    }

    public override async Task<EquipementDto> CreateAsync(CreateUpdateEquipementDto input)
    {
        await EnsureServiceExistsAsync(input.ServiceId);
        return await base.CreateAsync(input);
    }

    public override async Task<EquipementDto> UpdateAsync(int id, CreateUpdateEquipementDto input)
    {
        await EnsureServiceExistsAsync(input.ServiceId);
        return await base.UpdateAsync(id, input);
    }

    protected override async Task<IQueryable<Equipement>> CreateFilteredQueryAsync(PagedAndSortedResultRequestDto input)
    {
        return await Repository.WithDetailsAsync(x => x.Service);
    }

    protected override async Task<Equipement> GetEntityByIdAsync(int id)
    {
        var query = await Repository.WithDetailsAsync(x => x.Service);
        return await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id));
    }

    protected override EquipementDto MapToGetOutputDto(Equipement entity)
    {
        return ToDto(entity);
    }

    protected override EquipementDto MapToGetListOutputDto(Equipement entity)
    {
        return ToDto(entity);
    }

    protected override Equipement MapToEntity(CreateUpdateEquipementDto createInput)
    {
        return new Equipement
        {
            Serial = createInput.Serial,
            Type = createInput.Type,
            Etat = createInput.Etat,
            ServiceId = createInput.ServiceId,
            EstCharge = false
        };
    }

    protected override void MapToEntity(CreateUpdateEquipementDto updateInput, Equipement entity)
    {
        entity.Serial = updateInput.Serial;
        entity.Type = updateInput.Type;
        entity.Etat = updateInput.Etat;
        entity.ServiceId = updateInput.ServiceId;
    }

    public async Task<EquipementDto> ChargerAsync(int id)
    {
        var equipement = await Repository.GetAsync(id);
        equipement.EstCharge = true;
        equipement.DateDechargement = null;
        await Repository.UpdateAsync(equipement, autoSave: true);
        return await GetAsync(id);
    }

    public async Task<EquipementDto> DechargerAsync(int id)
    {
        var equipement = await Repository.GetAsync(id);
        equipement.EstCharge = false;
        equipement.DateDechargement = DateTime.Now;
        await Repository.UpdateAsync(equipement, autoSave: true);
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
