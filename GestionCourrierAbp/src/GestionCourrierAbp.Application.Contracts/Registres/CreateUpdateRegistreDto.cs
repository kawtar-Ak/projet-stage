using System;

namespace GestionCourrierAbp.Registres;

public class CreateUpdateRegistreDto
{
    public int TypeDeRegistre { get; set; }
    public DateTime DateCreation { get; set; }
    public string? Description { get; set; }
    public int ServiceId { get; set; }
}
