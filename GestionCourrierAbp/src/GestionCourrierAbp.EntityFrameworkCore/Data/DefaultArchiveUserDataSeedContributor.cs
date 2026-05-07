using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Utilisateurs;
using GestionCourrierAbp.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Identity;

namespace GestionCourrierAbp.Data;

public class DefaultArchiveUserDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private const int ArchiveServiceId = 13;
    private const string ArchiveLogin = "archive";
    private const string ArchivePassword = "1q2w3E*";

    private readonly IRepository<Service, int> _serviceRepository;
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;
    private readonly IdentityUserManager _identityUserManager;
    private readonly IGuidGenerator _guidGenerator;
    private readonly GestionCourrierAbpDbContext _dbContext;

    public DefaultArchiveUserDataSeedContributor(
        IRepository<Service, int> serviceRepository,
        IRepository<Utilisateur, int> utilisateurRepository,
        IdentityUserManager identityUserManager,
        IGuidGenerator guidGenerator,
        GestionCourrierAbpDbContext dbContext)
    {
        _serviceRepository = serviceRepository;
        _utilisateurRepository = utilisateurRepository;
        _identityUserManager = identityUserManager;
        _guidGenerator = guidGenerator;
        _dbContext = dbContext;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        await EnsureArchiveServiceAsync();
        await EnsureBusinessUserAsync();
        await EnsureIdentityUserAsync();
    }

    private async Task EnsureArchiveServiceAsync()
    {
        var existing = await _serviceRepository.FindAsync(ArchiveServiceId);
        if (existing != null)
        {
            existing.NomService = "الحفظ";
            existing.Description = "Archivage";
            existing.Etage = "Sous-sol";
            await _serviceRepository.UpdateAsync(existing, autoSave: true);
            return;
        }

        await _dbContext.Database.ExecuteSqlInterpolatedAsync($@"
SET IDENTITY_INSERT [AppServices] ON;

INSERT INTO [AppServices]
    ([Id], [NomService], [Description], [Etage], [ExtraProperties], [ConcurrencyStamp], [CreationTime])
VALUES
    ({ArchiveServiceId}, {"الحفظ"}, {"Archivage"}, {"Sous-sol"}, {"{}"}, {Guid.NewGuid().ToString("N")}, {DateTime.Now});

SET IDENTITY_INSERT [AppServices] OFF;");
    }

    private async Task EnsureBusinessUserAsync()
    {
        var query = await _utilisateurRepository.GetQueryableAsync();
        var existing = await query.FirstOrDefaultAsync(x => x.Login == ArchiveLogin);
        if (existing != null)
        {
            existing.NomComplet = "Service Archive";
            existing.ServiceId = ArchiveServiceId;
            await _utilisateurRepository.UpdateAsync(existing, autoSave: true);
            return;
        }

        await _utilisateurRepository.InsertAsync(new Utilisateur
        {
            NomComplet = "Service Archive",
            Login = ArchiveLogin,
            PasswordHash = HashPassword(ArchivePassword),
            ServiceId = ArchiveServiceId
        }, autoSave: true);
    }

    private async Task EnsureIdentityUserAsync()
    {
        var identityUser = await _identityUserManager.FindByNameAsync(ArchiveLogin);
        if (identityUser != null)
        {
            return;
        }

        identityUser = new IdentityUser(
            _guidGenerator.Create(),
            ArchiveLogin,
            "archive@gestioncourrier.local");

        await CheckIdentityResultAsync(await _identityUserManager.CreateAsync(identityUser, ArchivePassword));
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes);
    }

    private static Task CheckIdentityResultAsync(IdentityResult result)
    {
        if (result.Succeeded)
        {
            return Task.CompletedTask;
        }

        var message = string.Join(" ", result.Errors.Select(error => error.Description));
        throw new InvalidOperationException(message);
    }
}
