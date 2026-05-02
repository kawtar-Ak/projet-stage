using System;
using GestionCourrierAbp.Services;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Equipements;

public class Equipement : AuditedAggregateRoot<int>
{
    public int Serial { get; set; }
    public int Type { get; set; }
    public int Etat { get; set; }
    public int ServiceId { get; set; }
    public bool EstCharge { get; set; }
    public DateTime? DateDechargement { get; set; }

    public Service? Service { get; set; }
}
