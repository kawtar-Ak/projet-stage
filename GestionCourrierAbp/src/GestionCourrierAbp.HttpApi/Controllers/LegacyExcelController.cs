//Ce fichier est un controller spécial pour l’import/export Excel et l’upload de documents.

//Il ne remplace pas les AppService ABP. Il utilise les AppService existants pour récupérer ou créer les données, puis il ajoute des fonctionnalités pratiques comme :

//Exporter vers Excel
//Importer depuis Excel
//Uploader un PDF ou Word
//Télécharger un modèle Excel
//Prévisualiser les colonnes Excel

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using GestionCourrierAbp.Courriers;
using GestionCourrierAbp.Equipements;
using GestionCourrierAbp.Services;
using GestionCourrierAbp.Transactions;
using GestionCourrierAbp.Utilisateurs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Controllers;

[Authorize]
[IgnoreAntiforgeryToken]
[ApiController]
public class LegacyExcelController : ControllerBase
{
    private readonly ICourrierAdministratifAppService _courrierAdministratifAppService;
    private readonly ICourrierJudiciaireAppService _courrierJudiciaireAppService;
    private readonly ITransactionWorkflowAppService _transactionWorkflowAppService;
    private readonly IServiceAppService _serviceAppService;
    private readonly IEquipementAppService _equipementAppService;
    private readonly IUtilisateurAppService _utilisateurAppService;
    private readonly IWebHostEnvironment _environment;

    public LegacyExcelController(
        ICourrierAdministratifAppService courrierAdministratifAppService,
        ICourrierJudiciaireAppService courrierJudiciaireAppService,
        ITransactionWorkflowAppService transactionWorkflowAppService,
        IServiceAppService serviceAppService,
        IEquipementAppService equipementAppService,
        IUtilisateurAppService utilisateurAppService,
        IWebHostEnvironment environment)
    {
        _courrierAdministratifAppService = courrierAdministratifAppService;
        _courrierJudiciaireAppService = courrierJudiciaireAppService;
        _transactionWorkflowAppService = transactionWorkflowAppService;
        _serviceAppService = serviceAppService;
        _equipementAppService = equipementAppService;
        _utilisateurAppService = utilisateurAppService;
        _environment = environment;
    }

    [HttpGet("api/courriers/export/excel")]
    public async Task<IActionResult> ExportCourriersAdministratifs()
    {
        var courriers = await GetAllAdministratifs();
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Courriers administratifs");

        var headers = new[]
        {
            "Numero bureau ordre",
            "Date",
            "Source",
            "Sujet",
            "Destinataire",
            "Service",
            "Etat",
            "Numero courrier",
            "Type registre",
            "Type correspondance",
            "Lien document",
            "Description"
        };

        WriteHeaders(ws, headers);

        var row = 2;
        foreach (var courrier in courriers)
        {
            ws.Cell(row, 1).Value = courrier.IdBureauOrdre;
            ws.Cell(row, 2).Value = courrier.Date;
            ws.Cell(row, 2).Style.DateFormat.Format = "dd/MM/yyyy";
            ws.Cell(row, 3).Value = courrier.Source;
            ws.Cell(row, 4).Value = courrier.Sujet;
            ws.Cell(row, 5).Value = courrier.Destinataire;
            ws.Cell(row, 6).Value = courrier.ServiceNom ?? courrier.IdService.ToString();
            ws.Cell(row, 7).Value = courrier.Etat;
            ws.Cell(row, 8).Value = courrier.NumeroDeCourrier;
            ws.Cell(row, 9).Value = courrier.TypeRegistre;
            ws.Cell(row, 10).Value = courrier.TypeCorrespondance;
            ws.Cell(row, 11).Value = courrier.LienPdf;
            ws.Cell(row, 12).Value = courrier.Description;
            row++;
        }

        return ExcelFile(workbook, $"courriers-administratifs-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpPost("api/courriers/import/excel")]
    public async Task<IActionResult> ImportCourriersAdministratifs(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier Excel requis.");

        var imported = 0;
        var errors = new List<string>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                var date = ReadDate(row.Cell(2)) ?? DateTime.Now;
                var source = row.Cell(3).GetString().Trim();
                var sujet = row.Cell(4).GetString().Trim();
                var idService = ReadServiceId(row.Cell(6).GetString());

                if (string.IsNullOrWhiteSpace(source) || string.IsNullOrWhiteSpace(sujet) || idService <= 0)
                {
                    errors.Add($"Ligne {row.RowNumber()}: source, sujet et service sont obligatoires.");
                    continue;
                }

                await _courrierAdministratifAppService.CreateAsync(new CreateUpdateCourrierAdministratifDto
                {
                    IdBureauOrdre = row.Cell(1).GetString().Trim(),
                    Date = date,
                    Source = source,
                    Sujet = sujet,
                    Destinataire = row.Cell(5).GetString().Trim(),
                    IdService = idService,
                    Etat = EmptyToDefault(row.Cell(7).GetString(), "Nouveau"),
                    NumeroDeCourrier = row.Cell(8).GetString().Trim(),
                    TypeRegistre = EmptyToDefault(row.Cell(9).GetString(), "Waridat"),
                    TypeCorrespondance = EmptyToNull(row.Cell(10).GetString()),
                    LienPdf = row.Cell(11).GetString().Trim(),
                    Description = row.Cell(12).GetString().Trim(),
                    Direction = "Entrant",
                    EstTransmissible = false
                });
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
        }

        return Ok(new { imported, errors });
    }

    [HttpPost("api/courriers/upload-document")]
    [HttpPost("api/acteursjudiciaires/upload-pdf")]
    [HttpPost("api/acteursjudiciaires/upload-document")]
    public async Task<IActionResult> UploadDocument(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier requis.");

        var extension = Path.GetExtension(file.FileName);
        var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
        if (!allowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            return BadRequest("Seuls les fichiers PDF ou Word sont acceptes.");

        var root = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
            root = Path.Combine(_environment.ContentRootPath, "wwwroot");

        var uploadsRoot = Path.Combine(root, "uploads", "documents");
        Directory.CreateDirectory(uploadsRoot);

        var safeBaseName = Path.GetFileNameWithoutExtension(file.FileName);
        safeBaseName = string.Join("-", safeBaseName.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries));
        if (string.IsNullOrWhiteSpace(safeBaseName))
            safeBaseName = "document";

        var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}-{safeBaseName}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        await using var output = System.IO.File.Create(filePath);
        await file.CopyToAsync(output);

        return Ok(new { lienPdf = $"/uploads/documents/{fileName}" });
    }

    [HttpGet("api/acteursjudiciaires/export/excel")]
    public async Task<IActionResult> ExportCourriersJudiciaires()
    {
        var courriers = await GetAllJudiciaires();
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Courriers juridiques");

        var headers = new[]
        {
            "Numero bureau ordre",
            "Date",
            "Tribunal source",
            "Numero dossier",
            "Sujet",
            "Destinataire",
            "Service",
            "Etat",
            "Emplacement",
            "Lien document",
            "Description"
        };

        WriteHeaders(ws, headers);

        var row = 2;
        foreach (var courrier in courriers)
        {
            ws.Cell(row, 1).Value = courrier.IdBureauOrdre;
            ws.Cell(row, 2).Value = courrier.Date;
            ws.Cell(row, 2).Style.DateFormat.Format = "dd/MM/yyyy";
            ws.Cell(row, 3).Value = courrier.TribunalSource;
            ws.Cell(row, 4).Value = courrier.NumeroDossier;
            ws.Cell(row, 5).Value = courrier.Sujet;
            ws.Cell(row, 6).Value = courrier.Destinataire;
            ws.Cell(row, 7).Value = courrier.ServiceNom ?? courrier.IdService.ToString();
            ws.Cell(row, 8).Value = courrier.EtatArchive;
            ws.Cell(row, 9).Value = courrier.Emplacement;
            ws.Cell(row, 10).Value = courrier.LienPdf;
            ws.Cell(row, 11).Value = courrier.Description;
            row++;
        }

        return ExcelFile(workbook, $"courriers-juridiques-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpGet("api/acteursjudiciaires/{id:int}/retraits/export/excel")]
    public async Task<IActionResult> ExportRetraitsJudiciaires(int id)
    {
        var courrier = await _courrierJudiciaireAppService.GetAsync(id);
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Registre retraits");

        ws.Cell(1, 1).Value = "Numero dossier";
        ws.Cell(1, 2).Value = courrier.NumeroDossier;
        ws.Cell(2, 1).Value = "Sujet";
        ws.Cell(2, 2).Value = courrier.Sujet;
        ws.Cell(3, 1).Value = "Emplacement";
        ws.Cell(3, 2).Value = courrier.Emplacement;

        WriteHeaders(ws, new[]
        {
            "Date retrait",
            "Motif",
            "Effectue par",
            "Date retour",
            "Notes"
        }, 5);

        var row = 6;
        foreach (var retrait in courrier.Retraits.OrderByDescending(x => x.DateDeRetrait))
        {
            ws.Cell(row, 1).Value = retrait.DateDeRetrait;
            ws.Cell(row, 1).Style.DateFormat.Format = "dd/MM/yyyy";
            ws.Cell(row, 2).Value = retrait.MotifDeRetrait;
            ws.Cell(row, 3).Value = retrait.EffectuePar;
            ws.Cell(row, 4).Value = retrait.DateDeRetour;
            ws.Cell(row, 4).Style.DateFormat.Format = "dd/MM/yyyy";
            ws.Cell(row, 5).Value = retrait.Notes;
            row++;
        }

        var numero = string.IsNullOrWhiteSpace(courrier.NumeroDossier)
            ? id.ToString()
            : courrier.NumeroDossier.Replace("/", "-");

        return ExcelFile(workbook, $"registre-retraits-{numero}-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpPost("api/acteursjudiciaires/import/excel")]
    public async Task<IActionResult> ImportCourriersJudiciaires(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier Excel requis.");

        var imported = 0;
        var errors = new List<string>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                var date = ReadDate(row.Cell(2)) ?? DateTime.Now;
                var tribunalSource = row.Cell(3).GetString().Trim();
                var numeroDossier = row.Cell(4).GetString().Trim();
                var sujet = row.Cell(5).GetString().Trim();
                var idService = ReadServiceId(row.Cell(7).GetString());

                if (string.IsNullOrWhiteSpace(tribunalSource) || string.IsNullOrWhiteSpace(numeroDossier) ||
                    string.IsNullOrWhiteSpace(sujet) || idService <= 0)
                {
                    errors.Add($"Ligne {row.RowNumber()}: tribunal/source, numero dossier, sujet et service sont obligatoires.");
                    continue;
                }

                await _courrierJudiciaireAppService.CreateAsync(new CreateUpdateCourrierJudiciaireDto
                {
                    IdBureauOrdre = row.Cell(1).GetString().Trim(),
                    Date = date,
                    TribunalSource = tribunalSource,
                    NumeroDossier = numeroDossier,
                    Sujet = sujet,
                    Destinataire = row.Cell(6).GetString().Trim(),
                    IdService = idService,
                    EtatArchive = EmptyToDefault(row.Cell(8).GetString(), "Nouveau"),
                    Emplacement = row.Cell(9).GetString().Trim(),
                    LienPdf = row.Cell(10).GetString().Trim(),
                    Description = row.Cell(11).GetString().Trim(),
                    Direction = "Entrant",
                    EstTransmissible = true
                });
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
        }

        return Ok(new { imported, errors });
    }

    [HttpPost("api/transactions/export-selected")]
    public async Task<IActionResult> ExportTransactionsSelectionnees([FromBody] List<int> ids)
    {
        if (ids == null || ids.Count == 0)
            return BadRequest("Selection requise.");

        var result = await _transactionWorkflowAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        var transactions = result.Items
            .Where(x => ids.Contains(x.Id) && x.Statut.Contains("Accept", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(x => x.DateEnvoi)
            .ToList();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Transactions acceptees");

        WriteHeaders(ws, new[]
        {
            "ID",
            "Document ID",
            "Type document",
            "Service source",
            "Service destinataire",
            "Date envoi",
            "Date reponse",
            "Message",
            "Reponse"
        });

        var row = 2;
        foreach (var transaction in transactions)
        {
            ws.Cell(row, 1).Value = transaction.Id;
            ws.Cell(row, 2).Value = transaction.DocumentId;
            ws.Cell(row, 3).Value = transaction.DocumentType;
            ws.Cell(row, 4).Value = transaction.SourceServiceId;
            ws.Cell(row, 5).Value = transaction.DestinationServiceId;
            ws.Cell(row, 6).Value = transaction.DateEnvoi;
            ws.Cell(row, 6).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
            ws.Cell(row, 7).Value = transaction.DateReponse;
            ws.Cell(row, 7).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
            ws.Cell(row, 8).Value = transaction.Message;
            ws.Cell(row, 9).Value = transaction.MessageReponse;
            row++;
        }

        return ExcelFile(workbook, $"transactions-acceptees-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpGet("api/services/export/excel")]
    public async Task<IActionResult> ExportServices()
    {
        var services = await GetAllServices();
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Services");

        WriteHeaders(ws, new[] { "ID", "Nom", "Description", "Etage" });

        var row = 2;
        foreach (var service in services)
        {
            ws.Cell(row, 1).Value = service.Id;
            ws.Cell(row, 2).Value = service.NomService;
            ws.Cell(row, 3).Value = service.Description;
            ws.Cell(row, 4).Value = service.Etage;
            row++;
        }

        return ExcelFile(workbook, $"services-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpPost("api/services/import/preview")]
    public IActionResult PreviewServicesImport(IFormFile file)
    {
        return PreviewHeaders(file);
    }

    [HttpPost("api/services/import/execute")]
    public async Task<IActionResult> ExecuteServicesImport(
        IFormFile file,
        [FromQuery] string colNom,
        [FromQuery] string? colDescription,
        [FromQuery] string? colEtage)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier Excel requis.");

        var imported = 0;
        var errors = new List<string>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var headers = ReadHeaders(ws);

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                var nom = ReadMappedCell(row, headers, colNom);
                if (string.IsNullOrWhiteSpace(nom))
                {
                    errors.Add($"Ligne {row.RowNumber()}: nom service obligatoire.");
                    continue;
                }

                await _serviceAppService.CreateAsync(new CreateUpdateServiceDto
                {
                    NomService = nom,
                    Description = ReadMappedCell(row, headers, colDescription),
                    Etage = EmptyToNull(ReadMappedCell(row, headers, colEtage))
                });
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
        }

        return Ok(new { imported, errors, message = $"{imported} services importes." });
    }

    [HttpGet("api/equipements/export/excel")]
    public async Task<IActionResult> ExportEquipements()
    {
        var equipements = await GetAllEquipements();
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Equipements");

        WriteHeaders(ws, new[] { "Serie", "Type", "Etat", "Service ID", "Service", "Charge", "Date dechargement" });

        var row = 2;
        foreach (var equipement in equipements)
        {
            ws.Cell(row, 1).Value = equipement.Serial;
            ws.Cell(row, 2).Value = equipement.Type;
            ws.Cell(row, 3).Value = equipement.Etat;
            ws.Cell(row, 4).Value = equipement.ServiceId;
            ws.Cell(row, 5).Value = equipement.ServiceNom;
            ws.Cell(row, 6).Value = equipement.EstCharge ? "Oui" : "Non";
            ws.Cell(row, 7).Value = equipement.DateDechargement;
            ws.Cell(row, 7).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
            row++;
        }

        return ExcelFile(workbook, $"equipements-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpPost("api/equipements/import/preview")]
    public IActionResult PreviewEquipementsImport(IFormFile file)
    {
        return PreviewHeaders(file);
    }

    [HttpPost("api/equipements/import/execute")]
    public async Task<IActionResult> ExecuteEquipementsImport(
        IFormFile file,
        [FromQuery] string colSerie,
        [FromQuery] string colType,
        [FromQuery] string colEtat,
        [FromQuery] string colServiceId)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier Excel requis.");

        var imported = 0;
        var details = new List<string>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var headers = ReadHeaders(ws);

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                if (!int.TryParse(ReadMappedCell(row, headers, colSerie), out var serial) ||
                    !int.TryParse(ReadMappedCell(row, headers, colType), out var type) ||
                    !int.TryParse(ReadMappedCell(row, headers, colEtat), out var etat) ||
                    !int.TryParse(ReadMappedCell(row, headers, colServiceId), out var serviceId))
                {
                    details.Add($"Ligne {row.RowNumber()}: serie, type, etat et service doivent etre numeriques.");
                    continue;
                }

                await _equipementAppService.CreateAsync(new CreateUpdateEquipementDto
                {
                    Serial = serial,
                    Type = type,
                    Etat = etat,
                    ServiceId = serviceId
                });
                imported++;
            }
            catch (Exception ex)
            {
                details.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
        }

        return Ok(new { imported, details, message = $"{imported} equipements importes." });
    }

    [HttpGet("api/utilisateurs/export/excel")]
    public async Task<IActionResult> ExportUtilisateurs()
    {
        var utilisateurs = await GetAllUtilisateurs();
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Utilisateurs");

        WriteHeaders(ws, new[] { "ID", "Nom complet", "Login", "Service ID", "Service" });

        var row = 2;
        foreach (var utilisateur in utilisateurs)
        {
            ws.Cell(row, 1).Value = utilisateur.Id;
            ws.Cell(row, 2).Value = utilisateur.NomComplet;
            ws.Cell(row, 3).Value = utilisateur.Login;
            ws.Cell(row, 4).Value = utilisateur.ServiceId;
            ws.Cell(row, 5).Value = utilisateur.ServiceNom;
            row++;
        }

        return ExcelFile(workbook, $"utilisateurs-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpGet("api/utilisateurs/template")]
    public IActionResult DownloadUtilisateursTemplate()
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Modele utilisateurs");
        WriteHeaders(ws, new[] { "Nom complet", "Login", "Service ID", "Mot de passe" });
        ws.Cell(2, 1).Value = "Exemple Utilisateur";
        ws.Cell(2, 2).Value = "exemple";
        ws.Cell(2, 3).Value = 1;
        ws.Cell(2, 4).Value = "123456";
        return ExcelFile(workbook, "modele-utilisateurs.xlsx");
    }

    [HttpPost("api/utilisateurs/import/preview")]
    public IActionResult PreviewUtilisateursImport(IFormFile file)
    {
        return PreviewHeaders(file);
    }

    [HttpPost("api/utilisateurs/import/execute")]
    public async Task<IActionResult> ExecuteUtilisateursImport(
        IFormFile file,
        [FromQuery] string colNom,
        [FromQuery] string colLogin,
        [FromQuery] string colServiceId)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Fichier Excel requis.");

        var imported = 0;
        var errors = new List<string>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var headers = ReadHeaders(ws);

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                var nom = ReadMappedCell(row, headers, colNom);
                var login = ReadMappedCell(row, headers, colLogin);
                var serviceText = ReadMappedCell(row, headers, colServiceId);
                var password = ReadMappedCell(row, headers, "Mot de passe");

                if (string.IsNullOrWhiteSpace(nom) || string.IsNullOrWhiteSpace(login) ||
                    !int.TryParse(serviceText, out var serviceId))
                {
                    errors.Add($"Ligne {row.RowNumber()}: nom, login et service sont obligatoires.");
                    continue;
                }

                await _utilisateurAppService.CreateAsync(new CreateUtilisateurDto
                {
                    NomComplet = nom,
                    Login = login,
                    ServiceId = serviceId,
                    Password = string.IsNullOrWhiteSpace(password) ? "123456" : password
                });
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
        }

        return Ok(new { imported, errors });
    }

    private async Task<List<CourrierAdministratifDto>> GetAllAdministratifs()
    {
        var result = await _courrierAdministratifAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        return result.Items.ToList();
    }

    private async Task<List<CourrierJudiciaireDto>> GetAllJudiciaires()
    {
        var result = await _courrierJudiciaireAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        return result.Items.ToList();
    }

    private async Task<List<ServiceDto>> GetAllServices()
    {
        var result = await _serviceAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        return result.Items.ToList();
    }

    private async Task<List<EquipementDto>> GetAllEquipements()
    {
        var result = await _equipementAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        return result.Items.ToList();
    }

    private async Task<List<UtilisateurDto>> GetAllUtilisateurs()
    {
        var result = await _utilisateurAppService.GetListAsync(new PagedAndSortedResultRequestDto
        {
            SkipCount = 0,
            MaxResultCount = 1000
        });

        return result.Items.ToList();
    }

    private static void WriteHeaders(IXLWorksheet ws, IReadOnlyList<string> headers, int rowNumber = 1)
    {
        for (var i = 0; i < headers.Count; i++)
        {
            ws.Cell(rowNumber, i + 1).Value = headers[i];
            ws.Cell(rowNumber, i + 1).Style.Font.Bold = true;
        }
    }

    private static FileContentResult ExcelFile(XLWorkbook workbook, string fileName)
    {
        foreach (var ws in workbook.Worksheets)
        {
            ws.Columns().AdjustToContents();
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return new FileContentResult(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        {
            FileDownloadName = fileName
        };
    }

    private static DateTime? ReadDate(IXLCell cell)
    {
        if (cell.TryGetValue<DateTime>(out var date))
            return date;

        return DateTime.TryParse(cell.GetString(), out date) ? date : null;
    }

    private static IActionResult PreviewHeaders(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return new BadRequestObjectResult("Fichier Excel requis.");

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        return new OkObjectResult(ReadHeaders(workbook.Worksheets.First()).Keys.ToList());
    }

    private static Dictionary<string, int> ReadHeaders(IXLWorksheet ws)
    {
        return ws.Row(1)
            .CellsUsed()
            .Select((cell, index) => new { Name = cell.GetString().Trim(), Index = index + 1 })
            .Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .GroupBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.First().Index, StringComparer.OrdinalIgnoreCase);
    }

    private static string ReadMappedCell(IXLRow row, Dictionary<string, int> headers, string? headerName)
    {
        if (string.IsNullOrWhiteSpace(headerName) || !headers.TryGetValue(headerName.Trim(), out var index))
            return string.Empty;

        return row.Cell(index).GetString().Trim();
    }

    private static int ReadServiceId(string value)
    {
        if (int.TryParse(value?.Trim(), out var id))
            return id;

        return 1;
    }

    private static string EmptyToDefault(string value, string defaultValue)
    {
        return string.IsNullOrWhiteSpace(value) ? defaultValue : value.Trim();
    }

    private static string? EmptyToNull(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
