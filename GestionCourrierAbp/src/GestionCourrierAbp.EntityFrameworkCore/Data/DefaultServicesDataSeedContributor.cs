using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace GestionCourrierAbp.Services;

public class DefaultServicesDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private readonly IRepository<Service, int> _serviceRepository;
    private readonly global::GestionCourrierAbp.EntityFrameworkCore.GestionCourrierAbpDbContext _dbContext;

    public DefaultServicesDataSeedContributor(
        IRepository<Service, int> serviceRepository,
        global::GestionCourrierAbp.EntityFrameworkCore.GestionCourrierAbpDbContext dbContext)
    {
        _serviceRepository = serviceRepository;
        _dbContext = dbContext;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        foreach (var service in GetDefaultServices())
        {
            var existing = await _serviceRepository.FindAsync(service.Id);
            if (existing != null)
            {
                existing.NomService = service.NomService;
                existing.Description = service.Description;
                existing.Etage = service.Etage;
                await _serviceRepository.UpdateAsync(existing, autoSave: true);
                continue;
            }

            await InsertWithFixedIdAsync(service);
        }
    }

    private async Task InsertWithFixedIdAsync(ServiceSeedItem service)
    {
        await _dbContext.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT [AppServices] ON");
        try
        {
            await _dbContext.Database.ExecuteSqlInterpolatedAsync($@"
INSERT INTO [AppServices]
    ([Id], [NomService], [Description], [Etage], [ExtraProperties], [ConcurrencyStamp], [CreationTime])
VALUES
    ({service.Id}, {service.NomService}, {service.Description}, {service.Etage}, {"{}"}, {Guid.NewGuid().ToString("N")}, {DateTime.Now})");
        }
        finally
        {
            await _dbContext.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT [AppServices] OFF");
        }
    }

    private static List<ServiceSeedItem> GetDefaultServices()
    {
        return new List<ServiceSeedItem>
        {
            new(1, "خلية المعلوميات", "Cellule informatique", "2ème"),
            new(2, "مكتب الضبط", "Greffe", "1er"),
            new(3, "فتح الملفات", "Caisse", "RDC"),
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
            new(19, "الرئيس الأول", "Premier président", "3ème")
        };
    }

    private sealed record ServiceSeedItem(int Id, string NomService, string Description, string? Etage);
}
