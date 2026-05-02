using GestionCourrierAbp.Services;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Utilisateurs;

public class Utilisateur : AuditedAggregateRoot<int>
{
    public string NomComplet { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int ServiceId { get; set; }

    public Service? Service { get; set; }
}
