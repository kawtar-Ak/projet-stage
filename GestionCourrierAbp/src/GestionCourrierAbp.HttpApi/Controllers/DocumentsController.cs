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

        return administratifs.Items
            .Where(x => x.EstTransmissible && (!serviceId.HasValue || x.IdService == serviceId.Value))
            .Select(MapAdministratif)
            .Concat(judiciaires.Items
                .Where(x => x.EstTransmissible && (!serviceId.HasValue || x.IdService == serviceId.Value))
                .Select(MapJudiciaire))
            .OrderByDescending(x => x.DateCreation)
            .ToList();
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
            Source = document.Source,
            Destinataire = document.Destinataire,
            Description = document.Description,
            NumeroCourrier = document.NumeroDeCourrier,
            Etat = document.Etat,
            IdService = document.IdService
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
            Source = document.TribunalSource,
            Destinataire = document.Destinataire,
            Description = document.Description,
            NumeroDossierJudiciaire = document.NumeroDossier,
            EtatArchive = document.EtatArchive,
            IdService = document.IdService
        };
    }
}

public class DocumentCirculationDto
{
    public int IdEntite { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Sujet { get; set; } = string.Empty;
    public DateTime? DateCreation { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Destinataire { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? NumeroCourrier { get; set; }
    public string? NumeroDossierJudiciaire { get; set; }
    public string? Etat { get; set; }
    public string? EtatArchive { get; set; }
    public int IdService { get; set; }
}
