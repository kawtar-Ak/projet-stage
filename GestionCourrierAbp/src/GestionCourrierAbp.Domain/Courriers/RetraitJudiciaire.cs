using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace GestionCourrierAbp.Courriers;

public class RetraitJudiciaire : AuditedAggregateRoot<int>
{
    public DateTime DateDeRetrait { get; set; }
    public string MotifDeRetrait { get; set; } = string.Empty;
    public string EffectuePar { get; set; } = string.Empty;
    public DateTime? DateDeRetour { get; set; }
    public string Notes { get; set; } = string.Empty;
    public int CourrierJudiciaireId { get; set; }
    public CourrierJudiciaire? CourrierJudiciaire { get; set; }
}
