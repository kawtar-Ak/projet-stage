using System;
using System.Collections.Generic;
using GestionCourrierAbp.Services;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Registres;

public class Registre : AuditedAggregateRoot<int>
{
    public int TypeDeRegistre { get; set; }
    public DateTime DateCreation { get; set; }
    public string Description { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public Service? Service { get; set; }
    public ICollection<Reponse> Reponses { get; set; } = new List<Reponse>();
}
