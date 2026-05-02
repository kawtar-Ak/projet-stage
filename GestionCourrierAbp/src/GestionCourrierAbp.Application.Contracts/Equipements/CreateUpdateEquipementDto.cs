using System.ComponentModel.DataAnnotations;

namespace GestionCourrierAbp.Equipements;

public class CreateUpdateEquipementDto
{
    [Range(1, int.MaxValue)]
    public int Serial { get; set; }

    [Range(1, int.MaxValue)]
    public int Type { get; set; }

    [Range(1, int.MaxValue)]
    public int Etat { get; set; }

    [Range(1, int.MaxValue)]
    public int ServiceId { get; set; }
}
