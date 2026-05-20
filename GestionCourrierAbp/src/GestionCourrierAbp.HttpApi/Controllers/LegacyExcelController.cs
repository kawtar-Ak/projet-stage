//Ce fichier est un controller special pour l'import/export Excel et l'upload de documents.

//Il ne remplace pas les AppService ABP. Il utilise les AppService existants pour recuperer ou creer les donnees.

//Exporter vers Excel
//Importer depuis Excel
//Uploader un PDF ou Word
//Telecharger un modele Excel
//Previsualiser les colonnes Excel

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
using Volo.Abp;
using Volo.Abp.Application.Dtos;

namespace GestionCourrierAbp.Controllers;

[Authorize]
[IgnoreAntiforgeryToken]
[ApiController]
public class LegacyExcelController : ControllerBase
{
    private const string DefaultImportPassword = "1q2w3E*";
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
    public async Task<IActionResult> ExportCourriersAdministratifs([FromQuery] string? ids = null)
    {
        var allCourriersForLookup = await GetAllAdministratifs();
        var headerIds = Request.Headers.TryGetValue("X-Selected-Ids", out var headerValues)
            ? headerValues.ToString()
            : null;
        var selectionText = !string.IsNullOrWhiteSpace(ids) ? ids : headerIds;
        var hasIdSelection = !string.IsNullOrWhiteSpace(selectionText);
        var selectedIds = ParseIdSelection(selectionText);
        var courriers = hasIdSelection
            ? allCourriersForLookup.Where(courrier => selectedIds.Contains(courrier.Id)).ToList()
            : allCourriersForLookup;
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u064A");
        ws.RightToLeft = true;

        var widths = new[] { 20d, 18d, 16d, 18d, 30d, 38d, 18d, 28d, 38d, 18d, 34d, 18d };
        for (var i = 0; i < widths.Length; i++)
        {
            ws.Column(i + 1).Width = widths[i];
        }

        ws.Range(1, 1, 1, 6).Merge().Value = "\u0627\u0644\u0648\u0627\u0631\u062F\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629";
        ws.Range(1, 7, 1, 12).Merge().Value = "\u0627\u0644\u0645\u0631\u0627\u0633\u0644\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629";

        ws.Range(2, 1, 2, 6).Merge().Value = string.Empty;
        ws.Range(2, 7, 2, 9).Merge().Value = "\u0627\u0644\u0635\u0627\u062F\u0631\u0629";
        ws.Range(2, 10, 2, 11).Merge().Value = "\u0627\u0644\u0648\u0627\u0631\u062F\u0629";
        ws.Range(2, 12, 3, 12).Merge().Value = "\u0627\u0644\u0646\u062A\u064A\u062C\u0629";

        var headers = new Dictionary<int, string>
        {
            [1] = "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062A\u0631\u062A\u064A\u0628\u064A",
            [2] = "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0631\u0633\u0627\u0644\u0629",
            [3] = "\u0631\u0642\u0645\u0647\u0627",
            [4] = "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0648\u0635\u0648\u0644",
            [5] = "\u0627\u0633\u0645 \u0648 \u0645\u0648\u0637\u0646 \u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u064A\u0647",
            [6] = "\u0627\u0644\u0645\u0648\u0636\u0648\u0639",
            [7] = "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
            [8] = "\u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u064A\u0647",
            [9] = "\u0627\u0644\u0645\u0648\u0636\u0648\u0639",
            [10] = "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
            [11] = "\u0627\u0644\u0645\u0635\u062F\u0631 \u0648 \u0627\u0644\u062C\u0648\u0627\u0628"
        };

        foreach (var header in headers)
        {
            ws.Cell(3, header.Key).Value = header.Value;
        }

        StyleRegistreModele(ws, rowCount: 15);

        var row = 4;
        var mainWaridat = courriers
            .Where(courrier => !IsAdministrativeMorasalat(courrier))
            .OrderBy(courrier => courrier.Date)
            .ThenBy(courrier => courrier.Id)
            .ToList();
        var allMorasalat = courriers
            .Where(IsAdministrativeMorasalat)
            .OrderBy(courrier => courrier.Date)
            .ThenBy(courrier => courrier.Id)
            .ToList();
        var courriersById = allCourriersForLookup.ToDictionary(courrier => courrier.Id);
        var exportedMorasalatIds = new HashSet<int>();

        foreach (var warida in mainWaridat)
        {
            var linkedMorasalat = allMorasalat
                .Where(morasala => IsLinkedToWarida(morasala, warida, courriersById))
                .Where(morasala => !exportedMorasalatIds.Contains(morasala.Id))
                .ToList();
            var outgoingMorasalat = linkedMorasalat
                .Where(morasala => !IsAdministrativeIncomingResponse(morasala))
                .ToList();
            var incomingMorasalat = linkedMorasalat
                .Where(IsAdministrativeIncomingResponse)
                .ToList();

            row = WriteAdministrativeFamilyRows(
                ws,
                row,
                warida,
                outgoingMorasalat,
                incomingMorasalat,
                courriersById,
                exportedMorasalatIds
            );
        }

        var independentMorasalat = courriers
            .Where(courrier => IsAdministrativeMorasalat(courrier) && !exportedMorasalatIds.Contains(courrier.Id))
            .OrderBy(courrier => courrier.Date)
            .ThenBy(courrier => courrier.Id)
            .ToList();

        foreach (var morasalaGroup in independentMorasalat.GroupBy(morasala => GetAdministrativeExportNumber(morasala, courriersById)))
        {
            var outgoingMorasalat = morasalaGroup
                .Where(morasala => !IsAdministrativeIncomingResponse(morasala))
                .OrderBy(morasala => morasala.Date)
                .ThenBy(morasala => morasala.Id)
                .ToList();
            var incomingMorasalat = morasalaGroup
                .Where(IsAdministrativeIncomingResponse)
                .OrderBy(morasala => morasala.Date)
                .ThenBy(morasala => morasala.Id)
                .ToList();
            row = WriteAdministrativeFamilyRows(
                ws,
                row,
                warida: null,
                outgoingMorasalat,
                incomingMorasalat,
                courriersById,
                exportedMorasalatIds: null
            );
        }

        while (row <= 15)
        {
            for (var col = 1; col <= 12; col++)
            {
                ws.Cell(row, col).Value = string.Empty;
            }

            row++;
        }

        StyleRegistreData(ws, row - 1);

        return ExcelFile(workbook, $"registre-administratif-{DateTime.Now:yyyyMMddHHmm}.xlsx");
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

    [HttpGet("api/acteursjudiciaires/export/registre-modele")]
    public async Task<IActionResult> ExportRegistreJudiciaireModele()
    {
        return await ExportCourriersJudiciaires();
    }
    [HttpGet("api/acteursjudiciaires/export/excel")]
    public async Task<IActionResult> ExportCourriersJudiciaires()
    {
        var courriers = await GetAllJudiciaires();
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0642\u0636\u0627\u0626\u064A");
        ws.RightToLeft = true;

        var headers = new[]
        {
            "\u0627\u0644\u062A\u0627\u0631\u064A\u062E",
            "\u0631\u0642\u0645 \u0645\u0643\u062A\u0628 \u0627\u0644\u0636\u0628\u0637",
            "\u0627\u0644\u0645\u062D\u0643\u0645\u0629 / \u0627\u0644\u0645\u0635\u062F\u0631",
            "\u0646\u0648\u0639 \u0627\u0644\u0633\u062C\u0644",
            "\u0646\u0648\u0639 \u0627\u0644\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0642\u0636\u0627\u0626\u064A\u0629",
            "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0642\u0636\u0627\u0626\u064A \u0627\u0644\u0645\u0631\u062A\u0628\u0637",
            "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0627\u0633\u062A\u0626\u0646\u0627\u0641\u064A \u0644\u0644\u0645\u0644\u0641",
            "\u0627\u0644\u0645\u0648\u0636\u0648\u0639",
            "\u0627\u0644\u0645\u0631\u0633\u0644 \u0625\u0644\u064A\u0647",
            "\u0627\u0644\u0645\u0635\u0644\u062D\u0629",
            "\u0627\u0644\u062D\u0627\u0644\u0629",
            "\u0627\u0644\u0645\u0648\u0642\u0639",
            "\u0627\u0644\u0633\u062D\u0648\u0628\u0627\u062A",
            "PDF",
            "\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A"
        };

        WriteHeaders(ws, headers);
        ws.SheetView.FreezeRows(1);
        var widths = new[] { 16d, 18d, 28d, 22d, 24d, 24d, 24d, 30d, 26d, 22d, 16d, 18d, 14d, 28d, 18d };
        for (var i = 0; i < widths.Length; i++)
        {
            ws.Column(i + 1).Width = widths[i];
        }

        var row = 2;
        foreach (var courrier in courriers)
        {
            var isLinkedDocument = IsLinkedJudicialDocument(courrier);
            WriteExcelDate(ws.Cell(row, 1), courrier.Date);
            ws.Cell(row, 2).Value = courrier.IdBureauOrdre ?? string.Empty;
            ws.Cell(row, 3).Value = courrier.TribunalSource;
            ws.Cell(row, 4).Value = isLinkedDocument
                ? "\u0648\u062B\u064A\u0642\u0629 \u0645\u0631\u0628\u0648\u0637\u0629 \u0628\u0645\u0644\u0641"
                : "\u0648\u0627\u0631\u062F\u0629 \u0642\u0636\u0627\u0626\u064A\u0629";
            ws.Cell(row, 5).Value = courrier.TypeDocumentJudiciaire ?? string.Empty;
            ws.Cell(row, 6).Value = isLinkedDocument ? courrier.DossierParentNumero ?? courrier.NumeroDossier ?? string.Empty : string.Empty;
            ws.Cell(row, 7).Value = courrier.NumeroDossier ?? string.Empty;
            ws.Cell(row, 8).Value = courrier.Sujet;
            ws.Cell(row, 9).Value = courrier.Destinataire;
            ws.Cell(row, 10).Value = string.IsNullOrWhiteSpace(courrier.ServiceNom)
                ? courrier.IdService.ToString()
                : $"{courrier.IdService} - {courrier.ServiceNom}";
            ws.Cell(row, 11).Value = courrier.EtatArchive;
            ws.Cell(row, 12).Value = courrier.Emplacement;
            ws.Cell(row, 13).Value = courrier.RetraitsCount;
            ws.Cell(row, 14).Value = courrier.LienPdf;
            ws.Cell(row, 15).Value = string.Empty;
            row++;
        }

        if (row > 2)
        {
            ws.Range(2, 1, row - 1, headers.Length).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Range(2, 1, row - 1, headers.Length).Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Range(2, 1, row - 1, headers.Length).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            ws.Range(2, 1, row - 1, headers.Length).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
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

    [HttpDelete("api/acteursjudiciaires/retraits/{retraitId:int}")]
    public async Task<IActionResult> DeleteRetraitJudiciaire(int retraitId)
    {
        await _courrierJudiciaireAppService.DeleteRetraitAsync(retraitId);
        return Ok(new { message = "Retrait annule" });
    }

    [HttpGet("api/acteursjudiciaires/export/archives")]
    public async Task<IActionResult> ExportArchivesJudiciaires()
    {
        var archives = await _courrierJudiciaireAppService.GetArchivesAsync(null);
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Archives juridiques");
        ws.RightToLeft = true;

        var headers = new[]
        {
            "رقم الاستئناف",
            "رقم مكتب الضبط",
            "التاريخ",
            "المحكمة / المصدر",
            "الموضوع",
            "الموقع",
            "الحالة",
            "عدد السحوبات",
            "PDF",
            "الملاحظات"
        };

        WriteHeaders(ws, headers);
        var row = 2;
        foreach (var archive in archives)
        {
            ws.Cell(row, 1).Value = archive.NumeroDossier ?? string.Empty;
            ws.Cell(row, 2).Value = archive.IdBureauOrdre ?? string.Empty;
            WriteExcelDate(ws.Cell(row, 3), archive.Date);
            ws.Cell(row, 4).Value = archive.TribunalSource;
            ws.Cell(row, 5).Value = archive.Sujet;
            ws.Cell(row, 6).Value = archive.Emplacement;
            ws.Cell(row, 7).Value = archive.EtatArchive;
            ws.Cell(row, 8).Value = archive.RetraitsCount;
            ws.Cell(row, 9).Value = archive.LienPdf;
            ws.Cell(row, 10).Value = archive.Description;
            row++;
        }

        ws.Columns().AdjustToContents();
        return ExcelFile(workbook, $"archives-juridiques-{DateTime.Now:yyyyMMddHHmm}.xlsx");
    }

    [HttpGet("api/acteursjudiciaires/template-excel")]
    public IActionResult ExportArchiveImportTemplate()
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Import archives");
        ws.RightToLeft = true;
        WriteHeaders(ws, new[] { "Identifiant", "الخزانة", "الموقع" });
        ws.Cell(2, 1).Value = "2026/15/3";
        ws.Cell(2, 2).Value = "A-12";
        ws.Cell(2, 3).Value = "الحفظ";
        ws.Columns().AdjustToContents();
        return ExcelFile(workbook, "modele_import_archives.xlsx");
    }

    [HttpPost("api/acteursjudiciaires/import-archive/preview")]
    public IActionResult ImportArchivePreview(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Fichier requis.");
        }

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var headers = ws.Row(1).CellsUsed().Select(cell => cell.GetString().Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).ToList();
        return Ok(headers);
    }

    [HttpPost("api/acteursjudiciaires/import-archive/execute")]
    public async Task<IActionResult> ImportArchiveExecute(
        IFormFile file,
        [FromQuery] string colIdentifiant,
        [FromQuery] string? colCabinet,
        [FromQuery] string? colEmplacement)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Fichier requis.");
        }

        if (string.IsNullOrWhiteSpace(colIdentifiant))
        {
            return BadRequest("La colonne Identifiant est obligatoire.");
        }

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var headers = ws.Row(1).CellsUsed().Select(cell => cell.GetString().Trim()).ToList();
        var idIndex = headers.FindIndex(header => header.Equals(colIdentifiant, StringComparison.OrdinalIgnoreCase));
        if (idIndex < 0)
        {
            return BadRequest("Colonne Identifiant introuvable.");
        }

        var active = await GetAllJudiciaires();
        var archived = 0;
        var errors = new List<string>();

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            var identifier = row.Cell(idIndex + 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(identifier))
            {
                errors.Add($"Ligne {row.RowNumber()}: identifiant vide.");
                continue;
            }

            var normalized = NormalizeExportNumber(identifier);
            var target = active.FirstOrDefault(courrier =>
                NormalizeExportNumber(courrier.NumeroDossier) == normalized ||
                NormalizeExportNumber(courrier.IdBureauOrdre) == normalized);

            if (target == null)
            {
                errors.Add($"Ligne {row.RowNumber()}: dossier '{identifier}' introuvable ou deja archive.");
                continue;
            }

            await _courrierJudiciaireAppService.ArchiverAsync(target.Id);
            archived++;
        }

        return Ok(new { archived, errors });
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
        var existingCourriers = await GetAllJudiciaires();

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                var date = ReadDate(row.Cell(1)) ?? DateTime.Now;
                var idBureauOrdre = row.Cell(2).GetString().Trim();
                var tribunalSource = row.Cell(3).GetString().Trim();
                var typeRegistre = row.Cell(4).GetString().Trim();
                var typeDocument = row.Cell(5).GetString().Trim();
                var linkedNumero = row.Cell(6).GetString().Trim();
                var numeroDossier = row.Cell(7).GetString().Trim();
                var sujet = row.Cell(8).GetString().Trim();
                var destinataire = row.Cell(9).GetString().Trim();
                var idService = ReadServiceId(row.Cell(10).GetString());
                var isLinkedDocument = IsLinkedJudicialImport(typeRegistre, typeDocument, linkedNumero);
                int? parentId = null;

                if (isLinkedDocument)
                {
                    var parent = FindJudicialParentByNumero(existingCourriers, linkedNumero);
                    if (parent == null)
                    {
                        errors.Add($"Ligne {row.RowNumber()}: dossier judiciaire lie introuvable ({linkedNumero}).");
                        continue;
                    }

                    parentId = parent.Id;
                    if (string.IsNullOrWhiteSpace(numeroDossier))
                    {
                        numeroDossier = parent.NumeroDossier ?? string.Empty;
                    }
                }

                if (string.IsNullOrWhiteSpace(tribunalSource) || string.IsNullOrWhiteSpace(sujet) || idService <= 0 ||
                    (!isLinkedDocument && string.IsNullOrWhiteSpace(numeroDossier)))
                {
                    errors.Add($"Ligne {row.RowNumber()}: tribunal/source, numero dossier, sujet et service sont obligatoires.");
                    continue;
                }

                var created = await _courrierJudiciaireAppService.CreateAsync(new CreateUpdateCourrierJudiciaireDto
                {
                    IdBureauOrdre = idBureauOrdre,
                    Date = date,
                    TribunalSource = tribunalSource,
                    TypeEnregistrementJudiciaire = isLinkedDocument ? "DocumentLie" : "Dossier",
                    TypeDocumentJudiciaire = isLinkedDocument ? typeDocument : string.Empty,
                    CourrierJudiciaireParentId = parentId,
                    NumeroDossier = isLinkedDocument ? null : numeroDossier,
                    Sujet = sujet,
                    Destinataire = destinataire,
                    IdService = idService,
                    EtatArchive = EmptyToDefault(row.Cell(11).GetString(), "Nouveau"),
                    Emplacement = row.Cell(12).GetString().Trim(),
                    LienPdf = row.Cell(14).GetString().Trim(),
                    Description = string.Empty,
                    Direction = "Entrant",
                    EstTransmissible = true
                });
                existingCourriers.Add(created);
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
            "Traite par",
            "Service traitant",
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
            ws.Cell(row, 8).Value = transaction.ResponderUserName;
            ws.Cell(row, 9).Value = transaction.ResponderServiceName;
            ws.Cell(row, 10).Value = transaction.Message;
            ws.Cell(row, 11).Value = transaction.MessageReponse;
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
        WriteHeaders(ws, new[] { "Nom complet", "Login", "Service ID" });
        ws.Cell(2, 1).Value = "Exemple Utilisateur";
        ws.Cell(2, 2).Value = "exemple";
        ws.Cell(2, 3).Value = 1;
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
        var updated = 0;
        var errors = new List<string>();

        using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var headers = ReadHeaders(ws);
        var services = await GetAllServices();
        var existingUsersByLogin = (await GetAllUtilisateurs())
            .GroupBy(utilisateur => utilisateur.Login.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
        var importedLogins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in ws.RowsUsed().Skip(1))
        {
            try
            {
                var nom = ReadMappedCell(row, headers, colNom);
                var login = ReadMappedCell(row, headers, colLogin);
                var serviceText = ReadMappedCell(row, headers, colServiceId);

                if (string.IsNullOrWhiteSpace(nom) || string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(serviceText))
                {
                    errors.Add($"Ligne {row.RowNumber()}: nom, login et service sont obligatoires.");
                    continue;
                }

                var serviceId = ResolveUtilisateurServiceId(serviceText, services);
                if (serviceId == null)
                {
                    errors.Add($"Ligne {row.RowNumber()}: service introuvable ({serviceText}). Utilisez un ID de service existant ou le nom exact du service.");
                    continue;
                }

                var normalizedLogin = login.Trim();
                if (importedLogins.Contains(normalizedLogin))
                {
                    errors.Add($"Ligne {row.RowNumber()}: login duplique dans le fichier ({normalizedLogin}).");
                    continue;
                }

                if (existingUsersByLogin.TryGetValue(normalizedLogin, out var existingUser))
                {
                    await _utilisateurAppService.UpdateAsync(existingUser.Id, new UpdateUtilisateurDto
                    {
                        NomComplet = nom,
                        Login = normalizedLogin,
                        ServiceId = serviceId.Value
                    });
                    updated++;
                    importedLogins.Add(normalizedLogin);
                    continue;
                }

                var createdUser = await _utilisateurAppService.CreateAsync(new CreateUtilisateurDto
                {
                    NomComplet = nom,
                    Login = normalizedLogin,
                    ServiceId = serviceId.Value,
                    Password = DefaultImportPassword
                });
                imported++;
                importedLogins.Add(normalizedLogin);
                existingUsersByLogin[normalizedLogin] = createdUser;
            }
            catch (UserFriendlyException ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
            catch (BusinessException ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {FormatUtilisateurImportBusinessError(ex)}");
            }
            catch (Exception ex)
            {
                errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
            }
        }

        return Ok(new
        {
            imported,
            updated,
            errors,
            message = errors.Count > 0
                ? $"Import termine avec {errors.Count} erreur(s)."
                : $"{imported} utilisateur(s) importe(s), {updated} utilisateur(s) mis a jour avec succes."
        });
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

    private static HashSet<int> ParseIdSelection(string? ids)
    {
        if (string.IsNullOrWhiteSpace(ids))
        {
            return new HashSet<int>();
        }

        return ids
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => int.TryParse(value, out var id) ? id : 0)
            .Where(id => id > 0)
            .ToHashSet();
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

    private static int? ResolveUtilisateurServiceId(string value, IReadOnlyList<ServiceDto> services)
    {
        var normalized = value.Trim();
        if (int.TryParse(normalized, out var id) && services.Any(service => service.Id == id))
        {
            return id;
        }

        var firstToken = normalized
            .Split(new[] { ' ', '-', '\u2013', '\u2014', ':' }, StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();

        if (int.TryParse(firstToken, out id) && services.Any(service => service.Id == id))
        {
            return id;
        }

        var serviceByName = services.FirstOrDefault(service =>
            string.Equals(service.NomService, normalized, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(service.Description, normalized, StringComparison.OrdinalIgnoreCase));

        return serviceByName?.Id;
    }

    private static string FormatUtilisateurImportBusinessError(BusinessException exception)
    {
        return exception.Code switch
        {
            "ServiceInexistant" => "service inexistant.",
            "LoginDejaUtilise" => "login deja utilise.",
            _ => string.IsNullOrWhiteSpace(exception.Code)
                ? exception.Message
                : exception.Code
        };
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

    private static void StyleRegistreModele(IXLWorksheet ws, int rowCount)
    {
        var mainHeader = ws.Range(1, 1, 1, 12);
        mainHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F5F75");
        mainHeader.Style.Font.FontColor = XLColor.White;
        mainHeader.Style.Font.Bold = true;
        mainHeader.Style.Font.FontSize = 14;
        mainHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        mainHeader.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        mainHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        mainHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        var secondHeader = ws.Range(2, 1, 3, 12);
        secondHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#CFEAF3");
        secondHeader.Style.Font.Bold = true;
        secondHeader.Style.Font.FontSize = 12;
        secondHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        secondHeader.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        secondHeader.Style.Alignment.WrapText = true;
        secondHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        secondHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        ws.Row(1).Height = 22;
        ws.Row(2).Height = 24;
        ws.Row(3).Height = 28;
        for (var i = 4; i <= rowCount; i++)
        {
            ws.Row(i).Height = 22;
        }

        ws.Range(1, 1, rowCount, 12).Style.Alignment.ReadingOrder = XLAlignmentReadingOrderValues.RightToLeft;
    }

    private static void StyleRegistreData(IXLWorksheet ws, int lastRow)
    {
        var dataRange = ws.Range(4, 1, lastRow, 12);
        dataRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#F2F2F2");
        dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        dataRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        dataRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        dataRange.Style.Alignment.WrapText = true;
    }

    private static void WriteExcelDate(IXLCell cell, DateTime date)
    {
        cell.Value = date;
        cell.Style.DateFormat.Format = "dd/MM/yyyy";
    }

    private static bool IsAdministrativeMorasalat(CourrierAdministratifDto courrier)
    {
        return string.Equals(courrier.TypeRegistre, "Morasalat", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAdministrativeIncomingResponse(CourrierAdministratifDto courrier)
    {
        return string.Equals(courrier.TypeCorrespondance, "Entrante", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsLinkedToWarida(
        CourrierAdministratifDto morasala,
        CourrierAdministratifDto warida,
        IReadOnlyDictionary<int, CourrierAdministratifDto> courriersById)
    {
        if (HasAdministrativeAncestor(morasala, warida.Id, courriersById))
        {
            return true;
        }

        var morasalaNumber = GetAdministrativeExportNumber(morasala, courriersById);
        var waridaNumber = NormalizeExportNumber(warida.IdBureauOrdre);

        return !string.IsNullOrWhiteSpace(morasalaNumber) && morasalaNumber == waridaNumber;
    }

    private static bool HasAdministrativeAncestor(
        CourrierAdministratifDto courrier,
        int ancestorId,
        IReadOnlyDictionary<int, CourrierAdministratifDto> courriersById)
    {
        var visited = new HashSet<int>();
        var current = courrier;

        while (current.ParentId.HasValue && visited.Add(current.Id))
        {
            if (current.ParentId.Value == ancestorId)
            {
                return true;
            }

            if (!courriersById.TryGetValue(current.ParentId.Value, out var parent))
            {
                return false;
            }

            current = parent;
        }

        return false;
    }

    private static string GetAdministrativeExportNumber(
        CourrierAdministratifDto? courrier,
        IReadOnlyDictionary<int, CourrierAdministratifDto>? courriersById)
    {
        if (courrier == null)
        {
            return string.Empty;
        }

        var current = courrier;
        var visited = new HashSet<int>();

        while (visited.Add(current.Id))
        {
            var currentNumber = NormalizeExportNumber(current.IdBureauOrdre);
            if (!string.IsNullOrWhiteSpace(currentNumber))
            {
                return currentNumber;
            }

            if (courriersById == null ||
                !current.ParentId.HasValue ||
                !courriersById.TryGetValue(current.ParentId.Value, out var parent))
            {
                return string.Empty;
            }

            current = parent;
        }

        return string.Empty;
    }

    private static string NormalizeExportNumber(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
    }

    private static int WriteAdministrativeFamilyRows(
        IXLWorksheet ws,
        int startRow,
        CourrierAdministratifDto? warida,
        IReadOnlyList<CourrierAdministratifDto> outgoingMorasalat,
        IReadOnlyList<CourrierAdministratifDto> incomingMorasalat,
        IReadOnlyDictionary<int, CourrierAdministratifDto> courriersById,
        ISet<int>? exportedMorasalatIds)
    {
        var row = startRow;
        var usedIncomingIds = new HashSet<int>();
        var wroteAnyRow = false;

        foreach (var outgoing in outgoingMorasalat)
        {
            var linkedIncoming = incomingMorasalat
                .Where(incoming => !usedIncomingIds.Contains(incoming.Id))
                .Where(incoming => HasAdministrativeAncestor(incoming, outgoing.Id, courriersById))
                .OrderBy(incoming => incoming.Date)
                .ThenBy(incoming => incoming.Id)
                .ToList();

            if (linkedIncoming.Count == 0)
            {
                WriteAdministrativeRegisterRow(ws, row, warida, outgoing, incoming: null, courriersById);
                exportedMorasalatIds?.Add(outgoing.Id);
                wroteAnyRow = true;
                row++;
                continue;
            }

            foreach (var incoming in linkedIncoming)
            {
                WriteAdministrativeRegisterRow(ws, row, warida, outgoing, incoming, courriersById);
                exportedMorasalatIds?.Add(outgoing.Id);
                exportedMorasalatIds?.Add(incoming.Id);
                usedIncomingIds.Add(incoming.Id);
                wroteAnyRow = true;
                row++;
            }
        }

        var remainingIncoming = incomingMorasalat
            .Where(incoming => !usedIncomingIds.Contains(incoming.Id))
            .OrderBy(incoming => incoming.Date)
            .ThenBy(incoming => incoming.Id)
            .ToList();

        foreach (var incoming in remainingIncoming)
        {
            WriteAdministrativeRegisterRow(ws, row, warida, outgoing: null, incoming, courriersById);
            exportedMorasalatIds?.Add(incoming.Id);
            wroteAnyRow = true;
            row++;
        }

        if (!wroteAnyRow && warida != null)
        {
            WriteAdministrativeRegisterRow(ws, row, warida, outgoing: null, incoming: null, courriersById);
            row++;
        }

        return row;
    }

    private static void WriteAdministrativeRegisterRow(
        IXLWorksheet ws,
        int row,
        CourrierAdministratifDto? warida,
        CourrierAdministratifDto? outgoing,
        CourrierAdministratifDto? incoming,
        IReadOnlyDictionary<int, CourrierAdministratifDto> courriersById)
    {
        if (warida != null)
        {
            WriteAdministrativeWaridaRow(ws, row, warida);
        }
        else
        {
            var exportNumber = outgoing != null
                ? GetAdministrativeExportNumber(outgoing, courriersById)
                : GetAdministrativeExportNumber(incoming, courriersById);

            ws.Cell(row, 1).Value = exportNumber;
        }

        if (outgoing != null)
        {
            WriteAdministrativeOutgoingMorasalat(ws, row, outgoing);
        }

        if (incoming != null)
        {
            WriteAdministrativeIncomingMorasalat(ws, row, incoming);
        }
    }

    private static void WriteAdministrativeWaridaRow(IXLWorksheet ws, int row, CourrierAdministratifDto courrier)
    {
        ws.Cell(row, 1).Value = courrier.IdBureauOrdre ?? string.Empty;
        WriteExcelDate(ws.Cell(row, 2), courrier.Date);
        ws.Cell(row, 3).Value = !string.IsNullOrWhiteSpace(courrier.NumeroDeCourrier)
            ? courrier.NumeroDeCourrier
            : courrier.IdBureauOrdre ?? string.Empty;
        WriteExcelDate(ws.Cell(row, 4), courrier.CreationTime);
        ws.Cell(row, 5).Value = courrier.Source ?? string.Empty;
        ws.Cell(row, 6).Value = courrier.Sujet ?? string.Empty;
    }

    private static void WriteAdministrativeOutgoingMorasalat(IXLWorksheet ws, int row, CourrierAdministratifDto courrier)
    {
        WriteExcelDate(ws.Cell(row, 7), courrier.Date);
        ws.Cell(row, 8).Value = courrier.Destinataire ?? string.Empty;
        ws.Cell(row, 9).Value = courrier.Sujet ?? string.Empty;
        ws.Cell(row, 12).Value = courrier.Etat ?? string.Empty;
    }

    private static void WriteAdministrativeIncomingMorasalat(IXLWorksheet ws, int row, CourrierAdministratifDto courrier)
    {
        WriteExcelDate(ws.Cell(row, 10), courrier.Date);
        ws.Cell(row, 11).Value = BuildAdministrativeAnswer(courrier);
        ws.Cell(row, 12).Value = courrier.Etat ?? string.Empty;
    }

    private static string BuildAdministrativeAnswer(CourrierAdministratifDto courrier)
    {
        var parts = new[]
        {
            courrier.Source,
            courrier.Sujet,
            courrier.Description
        };

        return string.Join(" | ", parts.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static string BuildLinkedJudicialAnswer(CourrierJudiciaireDto courrier)
    {
        var parts = new[]
        {
            courrier.TribunalSource,
            courrier.TypeDocumentJudiciaire,
            courrier.DossierParentNumero ?? courrier.NumeroDossier,
            courrier.Description
        };

        return string.Join(" | ", parts.Where(x => !string.IsNullOrWhiteSpace(x)));
    }

    private static bool IsLinkedJudicialDocument(CourrierJudiciaireDto courrier)
    {
        return courrier.CourrierJudiciaireParentId.HasValue ||
            string.Equals(courrier.TypeEnregistrementJudiciaire, "DocumentLie", StringComparison.OrdinalIgnoreCase) ||
            !string.IsNullOrWhiteSpace(courrier.TypeDocumentJudiciaire);
    }

    private static bool IsLinkedJudicialImport(string typeRegistre, string typeDocument, string linkedNumero)
    {
        return typeRegistre.Contains("\u0648\u062B\u064A\u0642\u0629", StringComparison.OrdinalIgnoreCase) ||
            typeRegistre.Contains("DocumentLie", StringComparison.OrdinalIgnoreCase) ||
            !string.IsNullOrWhiteSpace(typeDocument) ||
            !string.IsNullOrWhiteSpace(linkedNumero);
    }

    private static CourrierJudiciaireDto? FindJudicialParentByNumero(
        IEnumerable<CourrierJudiciaireDto> courriers,
        string numero)
    {
        var normalizedNumero = NormalizeExportNumber(numero);
        if (string.IsNullOrWhiteSpace(normalizedNumero))
        {
            return null;
        }

        return courriers.FirstOrDefault(courrier =>
            !IsLinkedJudicialDocument(courrier) &&
            NormalizeExportNumber(courrier.NumeroDossier) == normalizedNumero);
    }

    private static FileContentResult ExcelFile(XLWorkbook workbook, string fileName)
    {
        foreach (var ws in workbook.Worksheets)
        {
            if (!string.Equals(ws.Name, "\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0642\u0636\u0627\u0626\u064A", StringComparison.Ordinal) &&
                !string.Equals(ws.Name, "\u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u064A", StringComparison.Ordinal))
            {
                ws.Columns().AdjustToContents();
            }
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
        var normalized = value?.Trim() ?? string.Empty;
        if (int.TryParse(normalized, out var id))
            return id;

        var firstToken = normalized
            .Split(new[] { ' ', '-', '\u2013', '\u2014', ':' }, StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();

        if (int.TryParse(firstToken, out id))
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
