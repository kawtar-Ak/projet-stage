using System.Collections.Generic;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Services;

public class Service : AuditedAggregateRoot<int>
{
    public string NomService { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Etage { get; set; }

    public ICollection<Equipements.Equipement> Equipements { get; set; } = new List<Equipements.Equipement>();
    public ICollection<Utilisateurs.Utilisateur> Utilisateurs { get; set; } = new List<Utilisateurs.Utilisateur>();
}
