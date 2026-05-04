using System;

namespace GestionCourrierAbp.Registres;

public class CreateUpdateReponseDto
{
    public DateTime DateReponse { get; set; }
    public string Source { get; set; } = string.Empty;
    public int Resultat { get; set; }
}
