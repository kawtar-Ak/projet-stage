using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Registres;

public class RegistreAppService : GestionCourrierAbpAppService, IRegistreAppService
{
    private readonly IRepository<Registre, int> _registreRepository;
    private readonly IRepository<Reponse, int> _reponseRepository;

    public RegistreAppService(
        IRepository<Registre, int> registreRepository,
        IRepository<Reponse, int> reponseRepository)
    {
        _registreRepository = registreRepository;
        _reponseRepository = reponseRepository;
    }

    public async Task<RegistreDto> GetAsync(int id)
    {
        var query = (await _registreRepository.WithDetailsAsync(x => x.Service!, x => x.Reponses))!;
        return ToDto(await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id)));
    }

    public async Task<PagedResultDto<RegistreDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = (await _registreRepository.WithDetailsAsync(x => x.Service!, x => x.Reponses))!;
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderByDescending(x => x.DateCreation).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<RegistreDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<List<RegistreDto>> GetByServiceAsync(int serviceId)
    {
        var query = (await _registreRepository.WithDetailsAsync(x => x.Service!, x => x.Reponses))!;
        var items = await AsyncExecuter.ToListAsync(
            query.Where(x => x.ServiceId == serviceId).OrderByDescending(x => x.DateCreation));

        return items.Select(ToDto).ToList();
    }

    public async Task<RegistreDto> CreateAsync(CreateUpdateRegistreDto input)
    {
        var entity = await _registreRepository.InsertAsync(Map(new Registre(), input), autoSave: true);
        return await GetAsync(entity.Id);
    }

    public async Task<RegistreDto> UpdateAsync(int id, CreateUpdateRegistreDto input)
    {
        var entity = await _registreRepository.GetAsync(id);
        await _registreRepository.UpdateAsync(Map(entity, input), autoSave: true);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        await _registreRepository.DeleteAsync(id, autoSave: true);
    }

    public async Task<ReponseDto> AddReponseAsync(int registreId, CreateUpdateReponseDto input)
    {
        await _registreRepository.GetAsync(registreId);
        var reponse = await _reponseRepository.InsertAsync(new Reponse
        {
            RegistreId = registreId,
            DateReponse = input.DateReponse == default ? DateTime.Now : input.DateReponse,
            Source = input.Source.Trim(),
            Resultat = input.Resultat
        }, autoSave: true);

        return ToDto(reponse);
    }

    public async Task<List<ReponseDto>> GetReponsesAsync(int registreId)
    {
        var query = await _reponseRepository.GetQueryableAsync();
        var items = await AsyncExecuter.ToListAsync(
            query.Where(x => x.RegistreId == registreId).OrderByDescending(x => x.DateReponse));

        return items.Select(ToDto).ToList();
    }

    private static Registre Map(Registre entity, CreateUpdateRegistreDto input)
    {
        entity.TypeDeRegistre = input.TypeDeRegistre;
        entity.DateCreation = input.DateCreation == default ? DateTime.Now : input.DateCreation;
        entity.Description = input.Description?.Trim() ?? string.Empty;
        entity.ServiceId = input.ServiceId;
        return entity;
    }

    private static RegistreDto ToDto(Registre entity)
    {
        return new RegistreDto
        {
            Id = entity.Id,
            TypeDeRegistre = entity.TypeDeRegistre,
            DateCreation = entity.DateCreation,
            Description = entity.Description,
            ServiceId = entity.ServiceId,
            ServiceNom = entity.Service?.NomService,
            ReponsesCount = entity.Reponses.Count,
            CreationTime = entity.CreationTime,
            CreatorId = entity.CreatorId,
            LastModificationTime = entity.LastModificationTime,
            LastModifierId = entity.LastModifierId
        };
    }

    private static ReponseDto ToDto(Reponse entity)
    {
        return new ReponseDto
        {
            Id = entity.Id,
            DateReponse = entity.DateReponse,
            Source = entity.Source,
            Resultat = entity.Resultat,
            RegistreId = entity.RegistreId,
            CreationTime = entity.CreationTime,
            CreatorId = entity.CreatorId,
            LastModificationTime = entity.LastModificationTime,
            LastModifierId = entity.LastModifierId
        };
    }
}
