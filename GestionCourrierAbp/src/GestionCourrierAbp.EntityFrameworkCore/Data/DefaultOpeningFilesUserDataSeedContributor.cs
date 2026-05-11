using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using GestionCourrierAbp.EntityFrameworkCore;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Utilisateurs;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Identity;

namespace GestionCourrierAbp.Data;

public class DefaultOpeningFilesUserDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private const int OpeningFilesServiceId = 3;
    private const string OpeningFilesLogin = "ouverturedossiers";
    private const string OpeningFilesName = "Bureau d'ouverture des dossiers";
    private const string OpeningFilesEmail = "ouverturedossiers@gestioncourrier.local";
    private const string DefaultPassword = "1q2w3E*";

    private readonly IRepository<Service, int> _serviceRepository;
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;
    private readonly IdentityUserManager _identityUserManager;
    private readonly IGuidGenerator _guidGenerator;
    private readonly GestionCourrierAbpDbContext _dbContext;

    public DefaultOpeningFilesUserDataSeedContributor(
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
        await EnsureOpeningFilesServiceAsync();
        await EnsureBusinessUserAsync();
        await EnsureIdentityUserAsync();
    }

    private async Task EnsureOpeningFilesServiceAsync()
    {
        var existing = await _serviceRepository.FindAsync(OpeningFilesServiceId);
        if (existing != null)
        {
            existing.NomService = "فتح الملفات";
            existing.Description = "Ouverture des dossiers";
            existing.Etage = "RDC";
            await _serviceRepository.UpdateAsync(existing, autoSave: true);
            return;
        }

        await _dbContext.Database.ExecuteSqlInterpolatedAsync($@"
SET IDENTITY_INSERT [AppServices] ON;

INSERT INTO [AppServices]
    ([Id], [NomService], [Description], [Etage], [ExtraProperties], [ConcurrencyStamp], [CreationTime])
VALUES
    ({OpeningFilesServiceId}, {"فتح الملفات"}, {"Ouverture des dossiers"}, {"RDC"}, {"{}"}, {Guid.NewGuid().ToString("N")}, {DateTime.Now});

SET IDENTITY_INSERT [AppServices] OFF;");
    }

    private async Task EnsureBusinessUserAsync()
    {
        var query = await _utilisateurRepository.GetQueryableAsync();
        var existing = await query.FirstOrDefaultAsync(x => x.Login == OpeningFilesLogin);
        if (existing != null)
        {
            existing.NomComplet = OpeningFilesName;
            existing.ServiceId = OpeningFilesServiceId;
            await _utilisateurRepository.UpdateAsync(existing, autoSave: true);
            return;
        }

        await _utilisateurRepository.InsertAsync(new Utilisateur
        {
            NomComplet = OpeningFilesName,
            Login = OpeningFilesLogin,
            PasswordHash = HashPassword(DefaultPassword),
            ServiceId = OpeningFilesServiceId
        }, autoSave: true);
    }

    private async Task EnsureIdentityUserAsync()
    {
        var identityUser = await _identityUserManager.FindByNameAsync(OpeningFilesLogin);
        if (identityUser != null)
        {
            return;
        }

        identityUser = new IdentityUser(
            _guidGenerator.Create(),
            OpeningFilesLogin,
            OpeningFilesEmail);

        await CheckIdentityResultAsync(await _identityUserManager.CreateAsync(identityUser, DefaultPassword));
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
