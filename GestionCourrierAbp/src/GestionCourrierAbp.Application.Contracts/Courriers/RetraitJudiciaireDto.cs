using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Courriers;

public class RetraitJudiciaireDto : AuditedEntityDto<int>
{
    public DateTime DateDeRetrait { get; set; }
    public string MotifDeRetrait { get; set; } = string.Empty;
    public string EffectuePar { get; set; } = string.Empty;
    public DateTime? DateDeRetour { get; set; }
    public string Notes { get; set; } = string.Empty;
}
