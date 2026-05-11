using System.Collections.Generic;
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
        await EnsureDefaultServicesAsync();

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

    private async Task EnsureDefaultServicesAsync()
    {
        foreach (var service in GetDefaultServices())
        {
            var existing = await _repository.FindAsync(service.Id);
            if (existing == null)
            {
                var query = await _repository.GetQueryableAsync();
                existing = await AsyncExecuter.FirstOrDefaultAsync(
                    query.Where(x => x.NomService == service.NomService || x.Description == service.Description));
            }

            if (existing != null)
            {
                existing.NomService = service.NomService;
                existing.Description = service.Description;
                existing.Etage = service.Etage;
                await _repository.UpdateAsync(existing, autoSave: true);
                continue;
            }

            await _repository.InsertAsync(new Service
            {
                NomService = service.NomService,
                Description = service.Description,
                Etage = service.Etage
            }, autoSave: true);
        }
    }

    private static List<DefaultServiceItem> GetDefaultServices()
    {
        return new List<DefaultServiceItem>
        {
            new(1, "خلية المعلوميات", "Cellule informatique", "2ème"),
            new(2, "مكتب الضبط", "Greffe", "1er"),
            new(3, "فتح الملفات", "Ouverture des dossiers", "RDC"),
            new(4, "التوزيع", "Distribution", "2ème"),
            new(5, "رئيس المصلحة", "Chef de service", "2ème"),
            new(6, "مدير النظام", "Admin système", "2ème"),
            new(7, "التبليغ", "Notification", "1er"),
            new(8, "خبرة", "Expertise", "1er"),
            new(9, "النقض", "Cassation", "2ème"),
            new(10, "تسليم النسخ", "Remise des copies", "RDC"),
            new(11, "الكتابة الخاصة", "Secrétariat particulier", "2ème"),
            new(12, "الجلسات", "Audiences", "1er"),
            new(13, "الحفظ", "Archivage", "Sous-sol"),
            new(14, "الإجراءات", "Procédures", "1er"),
            new(15, "المستشار المقرر", "Conseiller rapporteur", "2ème"),
            new(16, "الاستعجالي", "Référé", "1er"),
            new(17, "قضاء الموضوع", "Jugement au fond", "2ème"),
            new(18, "المفوض الملكي", "Commissaire royal", "2ème"),
            new(19, "الرئيس الأول", "Premier président", "3ème"),
            new(20, "تدبير السحب", "Gestion de retrait", "1er")
        };
    }

    private sealed record DefaultServiceItem(int Id, string NomService, string Description, string? Etage);
}
