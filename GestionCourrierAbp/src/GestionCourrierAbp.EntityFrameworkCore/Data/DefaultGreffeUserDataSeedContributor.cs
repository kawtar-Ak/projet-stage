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

public class DefaultGreffeUserDataSeedContributor : IDataSeedContributor, ITransientDependency
{
    private const int GreffeServiceId = 2;
    private const string DefaultPassword = "1q2w3E*";

    private const string BureauOrdreLogin = "bureauordre";
    private const string BureauOrdreName = "Bureau d'ordre";
    private const string BureauOrdreEmail = "bureauordre@gestioncourrier.local";

    private readonly IRepository<Service, int> _serviceRepository;
    private readonly IRepository<Utilisateur, int> _utilisateurRepository;
    private readonly IdentityUserManager _identityUserManager;
    private readonly IGuidGenerator _guidGenerator;
    private readonly GestionCourrierAbpDbContext _dbContext;

    public DefaultGreffeUserDataSeedContributor(
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
        await EnsureGreffeServiceAsync();

        await EnsureBusinessUserAsync(BureauOrdreLogin, BureauOrdreName);
        await EnsureIdentityUserAsync(BureauOrdreLogin, BureauOrdreEmail);
    }

    private async Task EnsureGreffeServiceAsync()
    {
        var existing = await _serviceRepository.FindAsync(GreffeServiceId);
        if (existing != null)
        {
            existing.NomService = "مكتب الضبط";
            existing.Description = "Greffe";
            existing.Etage = "1er";
            await _serviceRepository.UpdateAsync(existing, autoSave: true);
            return;
        }

        await _dbContext.Database.ExecuteSqlInterpolatedAsync($@"
SET IDENTITY_INSERT [AppServices] ON;

INSERT INTO [AppServices]
    ([Id], [NomService], [Description], [Etage], [ExtraProperties], [ConcurrencyStamp], [CreationTime])
VALUES
    ({GreffeServiceId}, {"مكتب الضبط"}, {"Greffe"}, {"1er"}, {"{}"}, {Guid.NewGuid().ToString("N")}, {DateTime.Now});

SET IDENTITY_INSERT [AppServices] OFF;");
    }

    private async Task EnsureBusinessUserAsync(string login, string name)
    {
        var query = await _utilisateurRepository.GetQueryableAsync();
        var existing = await query.FirstOrDefaultAsync(x => x.Login == login);
        if (existing != null)
        {
            existing.NomComplet = name;
            existing.ServiceId = GreffeServiceId;
            await _utilisateurRepository.UpdateAsync(existing, autoSave: true);
            return;
        }

        await _utilisateurRepository.InsertAsync(new Utilisateur
        {
            NomComplet = name,
            Login = login,
            PasswordHash = HashPassword(DefaultPassword),
            ServiceId = GreffeServiceId
        }, autoSave: true);
    }

    private async Task EnsureIdentityUserAsync(string login, string email)
    {
        var identityUser = await _identityUserManager.FindByNameAsync(login);
        if (identityUser != null)
        {
            return;
        }

        identityUser = new IdentityUser(_guidGenerator.Create(), login, email);
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
