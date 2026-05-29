/*Ce code n’est pas la partie qui gère réellement les transactions/circulations.
Il sert surtout à préparer la liste des documents transmissibles que tu peux ensuite envoyer ou transférer.*/

//DocumentsController
//→ affiche les documents disponibles pour la circulation
//→ regroupe les courriers administratifs + courriers judiciaires
//→ filtre par service si nécessaire
//→ retourne un DocumentCirculationDto

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestionCourrierAbp.Courriers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Controllers;

[Authorize]
[ApiController]
[Route("api/documents")]
public class DocumentsController : ControllerBase
{
    private readonly ICourrierAdministratifAppService _courrierAdministratifAppService;
    private readonly ICourrierJudiciaireAppService _courrierJudiciaireAppService;

    public DocumentsController(
        ICourrierAdministratifAppService courrierAdministratifAppService,
        ICourrierJudiciaireAppService courrierJudiciaireAppService)
    {
        _courrierAdministratifAppService = courrierAdministratifAppService;
        _courrierJudiciaireAppService = courrierJudiciaireAppService;
    }

    [HttpGet]
    public async Task<List<DocumentCirculationDto>> GetListAsync([FromQuery] int? serviceId)
    {
        var input = new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        };

        var administratifs = await _courrierAdministratifAppService.GetListAsync(input);
        var judiciaires = await _courrierJudiciaireAppService.GetListAsync(input);

        var documents = administratifs.Items
            .Select(MapAdministratif)
            .Concat(judiciaires.Items.Select(MapJudiciaire))
            .Where(x => !serviceId.HasValue || x.IdService == serviceId.Value)
            .ToList();

        documents = documents
            .OrderBy(x => x.DateEnregistrement ?? x.DateCreation)
            .ThenBy(x => x.Type)
            .ThenBy(x => x.IdEntite)
            .ToList();

        for (var i = 0; i < documents.Count; i++)
        {
            documents[i].Ordre = i + 1;
        }

        return documents;
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DocumentCirculationDto>> GetAsync(int id, [FromQuery] string type)
    {
        if (type.Equals("Administratif", StringComparison.OrdinalIgnoreCase))
        {
            return MapAdministratif(await _courrierAdministratifAppService.GetAsync(id));
        }

        if (type.Equals("Judiciaire", StringComparison.OrdinalIgnoreCase))
        {
            return MapJudiciaire(await _courrierJudiciaireAppService.GetAsync(id));
        }

        return BadRequest("Type document invalide.");
    }

    private static DocumentCirculationDto MapAdministratif(CourrierAdministratifDto document)
    {
        return new DocumentCirculationDto
        {
            IdEntite = document.Id,
            Type = "Administratif",
            Sujet = document.Sujet,
            DateCreation = document.Date,
            DateEnregistrement = document.CreationTime,
            Source = document.Source,
            Destinataire = document.Destinataire,
            Description = document.Description,
            NumeroCourrier = document.NumeroDeCourrier,
            Etat = document.Etat,
            LienPdf = document.LienPdf,
            IdService = document.IdService,
            ServiceNom = document.ServiceNom,
            EstTransmissible = document.EstTransmissible
        };
    }

    private static DocumentCirculationDto MapJudiciaire(CourrierJudiciaireDto document)
    {
        return new DocumentCirculationDto
        {
            IdEntite = document.Id,
            Type = "Judiciaire",
            Sujet = document.Sujet,
            DateCreation = document.Date,
            DateEnregistrement = document.CreationTime,
            Source = document.TribunalSource,
            Destinataire = document.Destinataire,
            Description = document.Description,
            NumeroDossierJudiciaire = document.NumeroDossier,
            EtatArchive = document.EtatArchive,
            LienPdf = document.LienPdf,
            IdService = document.IdService,
            ServiceNom = document.ServiceNom,
            EstTransmissible = document.EstTransmissible
        };
    }

}

public class DocumentCirculationDto
{
    public int Ordre { get; set; }
    public int IdEntite { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public DateTime? DateCreation { get; set; }
    public DateTime? DateEnregistrement { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? NumeroCourrier { get; set; }
    public string? NumeroDossierJudiciaire { get; set; }
    public string? Etat { get; set; }
    public string? EtatArchive { get; set; }
    public string? LienPdf { get; set; }
    public int IdService { get; set; }
    public string? ServiceNom { get; set; }
    public bool EstTransmissible { get; set; }
}
