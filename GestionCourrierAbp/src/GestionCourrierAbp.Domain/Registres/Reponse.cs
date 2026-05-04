using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Registres;

public class Reponse : AuditedAggregateRoot<int>
{
    public DateTime DateReponse { get; set; }
    public string Source { get; set; } = string.Empty;
    public int Resultat { get; set; }
    public int RegistreId { get; set; }
    public Registre? Registre { get; set; }
}
