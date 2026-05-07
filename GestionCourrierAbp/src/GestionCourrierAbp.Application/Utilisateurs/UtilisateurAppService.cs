using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Identity;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Guids;
using Volo.Abp.Identity;

namespace GestionCourrierAbp.Utilisateurs;

public class UtilisateurAppService : GestionCourrierAbpAppService, IUtilisateurAppService
{
    private readonly IRepository<Utilisateur, int> _repository;
    private readonly IRepository<Services.Service, int> _serviceRepository;
    private readonly IdentityUserManager _identityUserManager;
    private readonly IGuidGenerator _guidGenerator;

    public UtilisateurAppService(
        IRepository<Utilisateur, int> repository,
        IRepository<Services.Service, int> serviceRepository,
        IdentityUserManager identityUserManager,
        IGuidGenerator guidGenerator)
    {
        _repository = repository;
        _serviceRepository = serviceRepository;
        _identityUserManager = identityUserManager;
        _guidGenerator = guidGenerator;
    }

    public async Task<UtilisateurDto> GetAsync(int id)
    {
        var query = await _repository.WithDetailsAsync(x => x.Service);
        return ToDto(await AsyncExecuter.FirstAsync(query.Where(x => x.Id == id)));
    }

    public async Task<PagedResultDto<UtilisateurDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var query = await _repository.WithDetailsAsync(x => x.Service);
        var totalCount = await AsyncExecuter.CountAsync(query);
        var items = await AsyncExecuter.ToListAsync(
            query.OrderBy(x => x.Id).Skip(input.SkipCount).Take(input.MaxResultCount));

        return new PagedResultDto<UtilisateurDto>(totalCount, items.Select(ToDto).ToList());
    }

    public async Task<UtilisateurDto> CreateAsync(CreateUtilisateurDto input)
    {
        await EnsureServiceExistsAsync(input.ServiceId);
        await EnsureLoginIsUniqueAsync(input.Login);

        var utilisateur = await _repository.InsertAsync(new Utilisateur
        {
            NomComplet = input.NomComplet.Trim(),
            Login = input.Login.Trim(),
            PasswordHash = HashPassword(input.Password),
            ServiceId = input.ServiceId
        }, autoSave: true);

        await CreateOrUpdateIdentityUserAsync(utilisateur.Login, input.Password);

        return await GetAsync(utilisateur.Id);
    }

    public async Task<UtilisateurDto> UpdateAsync(int id, UpdateUtilisateurDto input)
    {
        var utilisateur = await _repository.GetAsync(id);

        if (!string.IsNullOrWhiteSpace(input.NomComplet))
        {
            utilisateur.NomComplet = input.NomComplet.Trim();
        }

        if (!string.IsNullOrWhiteSpace(input.Login))
        {
            await EnsureLoginIsUniqueAsync(input.Login, id);
            utilisateur.Login = input.Login.Trim();
        }

        if (!string.IsNullOrWhiteSpace(input.Password))
        {
            utilisateur.PasswordHash = HashPassword(input.Password);
        }

        if (input.ServiceId.HasValue)
        {
            await EnsureServiceExistsAsync(input.ServiceId.Value);
            utilisateur.ServiceId = input.ServiceId.Value;
        }

        await _repository.UpdateAsync(utilisateur, autoSave: true);
        await CreateOrUpdateIdentityUserAsync(utilisateur.Login, input.Password);
        return await GetAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id, autoSave: true);
    }

    private async Task EnsureServiceExistsAsync(int serviceId)
    {
        if (!await _serviceRepository.AnyAsync(x => x.Id == serviceId))
        {
            throw new BusinessException("ServiceInexistant");
        }
    }

    private async Task EnsureLoginIsUniqueAsync(string login, int? currentUserId = null)
    {
        var normalizedLogin = login.Trim();
        var exists = await _repository.AnyAsync(x => x.Login == normalizedLogin && (!currentUserId.HasValue || x.Id != currentUserId.Value));
        if (exists)
        {
            throw new BusinessException("LoginDejaUtilise");
        }
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes);
    }

    private async Task CreateOrUpdateIdentityUserAsync(string login, string? password)
    {
        var userName = login.Trim();
        if (string.IsNullOrWhiteSpace(userName))
        {
            return;
        }

        var identityUser = await _identityUserManager.FindByNameAsync(userName);
        if (identityUser == null)
        {
            identityUser = new IdentityUser(
                _guidGenerator.Create(),
                userName,
                $"{userName}@gestioncourrier.local");

            await CheckIdentityResultAsync(await _identityUserManager.CreateAsync(identityUser, password ?? "123456"));
            return;
        }

        if (!string.IsNullOrWhiteSpace(password))
        {
            var resetToken = await _identityUserManager.GeneratePasswordResetTokenAsync(identityUser);
            await CheckIdentityResultAsync(await _identityUserManager.ResetPasswordAsync(identityUser, resetToken, password));
        }
    }

    private static Task CheckIdentityResultAsync(IdentityResult result)
    {
        if (result.Succeeded)
        {
            return Task.CompletedTask;
        }

        var message = string.Join(" ", result.Errors.Select(error => error.Description));
        throw new UserFriendlyException(message);
    }

    private static UtilisateurDto ToDto(Utilisateur utilisateur)
    {
        return new UtilisateurDto
        {
            Id = utilisateur.Id,
            NomComplet = utilisateur.NomComplet,
            Login = utilisateur.Login,
            ServiceId = utilisateur.ServiceId,
            ServiceNom = utilisateur.Service?.NomService,
            CreationTime = utilisateur.CreationTime,
            CreatorId = utilisateur.CreatorId,
            LastModificationTime = utilisateur.LastModificationTime,
            LastModifierId = utilisateur.LastModifierId
        };
    }
}
