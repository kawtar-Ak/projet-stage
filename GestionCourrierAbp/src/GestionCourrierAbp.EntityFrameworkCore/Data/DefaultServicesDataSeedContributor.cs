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
        await _dbContext.Database.ExecuteSqlInterpolatedAsync($@"
SET IDENTITY_INSERT [AppServices] ON;

INSERT INTO [AppServices]
    ([Id], [NomService], [Description], [Etage], [ExtraProperties], [ConcurrencyStamp], [CreationTime])
VALUES
    ({service.Id}, {service.NomService}, {service.Description}, {service.Etage}, {"{}"}, {Guid.NewGuid().ToString("N")}, {DateTime.Now});

SET IDENTITY_INSERT [AppServices] OFF;");
    }

    private static List<ServiceSeedItem> GetDefaultServices()
    {
        return new List<ServiceSeedItem>
        {
            new(1, "Cellule informatique", "Cellule informatique", "2eme"),
            new(2, "Bureau d'ordre", "Greffe", "1er"),
            new(3, "Ouverture des dossiers", "Ouverture des dossiers", "RDC"),
            new(4, "Distribution", "Distribution", "2eme"),
            new(5, "Chef de service", "Chef de service", "2eme"),
            new(6, "Admin systeme", "Admin systeme", "2eme"),
            new(7, "Notification et remise des copies", "Notification et remise des copies", "1er"),
            new(8, "Expertise", "Expertise", "1er"),
            new(9, "Cassation", "Cassation", "2eme"),
            new(10, "Remise des copies (fusionne)", "Service fusionne avec Notification", "RDC"),
            new(11, "Secretariat particulier", "Secretariat particulier", "2eme"),
            new(13, "Archivage", "Archivage", "Sous-sol"),
            new(15, "Conseiller rapporteur", "Conseiller rapporteur", "2eme"),
            new(16, "Refere", "Refere", "1er"),
            new(17, "Jugement au fond", "Jugement au fond", "2eme"),
            new(18, "Commissaire royal", "Commissaire royal", "2eme"),
            new(19, "Premier president", "Premier president", "3eme"),
            new(20, "Gestion de retrait", "Gestion de retrait", "1er"),
            new(21, "إجراءات و جلسات الثلاثاء", "Procedures et audiences mardi", "1er"),
            new(22, "إجراءات و جلسات الخميس", "Procedures et audiences Jeudi", "1er")
        };
    }

    private sealed record ServiceSeedItem(int Id, string NomService, string Description, string? Etage);
}
