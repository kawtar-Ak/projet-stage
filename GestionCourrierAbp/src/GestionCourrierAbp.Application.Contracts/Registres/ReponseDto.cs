using System;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Registres;

public class ReponseDto : AuditedEntityDto<int>
{
    public DateTime DateReponse { get; set; }
    public string Source { get; set; } = string.Empty;
    public int Resultat { get; set; }
    public int RegistreId { get; set; }
}
