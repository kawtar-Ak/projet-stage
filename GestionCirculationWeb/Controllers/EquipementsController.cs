using ClosedXML.Excel;
using GestionCourrier.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace GestionCourrier.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EquipementsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public EquipementsController(ApplicationDbContext context) => _context = context;

        // GET: api/equipements?search=&type=&etat=&decharge=
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] int? type,
            [FromQuery] int? etat,
            [FromQuery] bool? decharge)
        {
            try
            {
                var query = _context.Equipements.AsQueryable();
                if (!string.IsNullOrEmpty(search))
                    query = query.Where(e => e.Serial.ToString().Contains(search));
                if (type.HasValue)
                    query = query.Where(e => e.Type == type);
                if (etat.HasValue)
                    query = query.Where(e => e.Etat == etat);
                if (decharge == true)
                    query = query.Where(e => e.EstCharge == false);

                var equipements = await query.ToListAsync();
                var serviceIds = equipements.Select(e => e.IdService).Distinct();
                var services = await _context.Services
                    .Where(s => serviceIds.Contains(s.IdService))
                    .ToDictionaryAsync(s => s.IdService);

                var result = equipements.Select(e => new
                {
                    e.Id,
                    e.Serial,
                    e.Type,
                    e.Etat,
                    e.IdService,
                    e.EstCharge,
                    e.DateDechargement,
                    ServiceNom = services.ContainsKey(e.IdService) ? services[e.IdService].NomService : null,
                    ServiceEtage = services.ContainsKey(e.IdService) ? services[e.IdService].Etage : null
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var eq = await _context.Equipements.FindAsync(id);
            return eq == null ? NotFound() : Ok(eq);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Equipment model)
        {
            if (model.Serial <= 0) return BadRequest("Série invalide");
            if (!await _context.Services.AnyAsync(s => s.IdService == model.IdService))
                return BadRequest("Service inexistant");
            model.EstCharge = false;
            model.DateDechargement = null;
            _context.Equipements.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Equipment model)
        {
            if (id != model.Id) return BadRequest("ID mismatch");
            var existing = await _context.Equipements.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Serial = model.Serial;
            existing.Type = model.Type;
            existing.Etat = model.Etat;
            existing.IdService = model.IdService;
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpPost("{id}/charger")]
        public async Task<IActionResult> Charger(int id)
        {
            var eq = await _context.Equipements.FindAsync(id);
            if (eq == null) return NotFound();
            eq.EstCharge = true;
            eq.DateDechargement = null;
            await _context.SaveChangesAsync();
            return Ok(eq);
        }

        [HttpPost("{id}/decharger")]
        public async Task<IActionResult> Decharger(int id)
        {
            var eq = await _context.Equipements.FindAsync(id);
            if (eq == null) return NotFound();
            eq.EstCharge = false;
            eq.DateDechargement = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(eq);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var eq = await _context.Equipements.FindAsync(id);
            if (eq == null) return NotFound();
            _context.Equipements.Remove(eq);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // EXPORT EXCEL (avec libellés)
        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel()
        {
            var data = await _context.Equipements.Include(e => e.Service).ToListAsync();
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Equipements");
            ws.Cell(1, 1).Value = "ID";
            ws.Cell(1, 2).Value = "Série";
            ws.Cell(1, 3).Value = "Type";
            ws.Cell(1, 4).Value = "État";
            ws.Cell(1, 5).Value = "Service ID";
            ws.Cell(1, 6).Value = "Service Nom";
            ws.Cell(1, 7).Value = "Chargé";
            ws.Cell(1, 8).Value = "Date déchargement";
            int row = 2;
            foreach (var e in data)
            {
                string typeLib = e.Type switch
                {
                    1 => "Ordinateur",
                    2 => "Imprimante",
                    3 => "Scanner",
                    4 => "Photocopieur",
                    _ => e.Type.ToString()
                };
                string etatLib = e.Etat switch
                {
                    1 => "Neuf",
                    2 => "Bon état",
                    3 => "À réparer",
                    4 => "Hors service",
                    _ => e.Etat.ToString()
                };
                ws.Cell(row, 1).Value = e.Id;
                ws.Cell(row, 2).Value = e.Serial;
                ws.Cell(row, 3).Value = typeLib;
                ws.Cell(row, 4).Value = etatLib;
                ws.Cell(row, 5).Value = e.IdService;
                ws.Cell(row, 6).Value = e.Service?.NomService;
                ws.Cell(row, 7).Value = e.EstCharge ? "Oui" : "Non";
                ws.Cell(row, 8).Value = e.DateDechargement?.ToString("yyyy-MM-dd HH:mm");
                row++;
            }
            ws.Columns().AdjustToContents();
            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "equipements.xlsx");
        }

        // PREVIEW IMPORT – lit les en-têtes
        // PREVIEW – Lit les en-têtes
[HttpPost("import/preview")]
public async Task<IActionResult> PreviewImport(IFormFile file)
{
    if (file == null || file.Length == 0)
        return BadRequest("Fichier requis");
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    using var workbook = new XLWorkbook(stream);
    var ws = workbook.Worksheet(1);
    var headers = ws.Row(1).CellsUsed().Select(c => c.GetString().Trim()).ToList();
    return Ok(headers);
}

// EXECUTE – Import avec mapping et rapport d'erreurs
[HttpPost("import/execute")]
public async Task<IActionResult> ExecuteImport(
    [FromForm] IFormFile file,
    [FromQuery] string colSerie,
    [FromQuery] string colType,
    [FromQuery] string colEtat,
    [FromQuery] string colServiceId)
{
    if (file == null) return BadRequest("Fichier requis");
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    using var workbook = new XLWorkbook(stream);
    var ws = workbook.Worksheet(1);
    var headerRow = ws.Row(1);

    // 1. Vérifier que les colonnes choisies existent
    int idxSerie = -1, idxType = -1, idxEtat = -1, idxService = -1;
    var colIndex = new Dictionary<string, int>();
    for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
    {
        string val = headerRow.Cell(c).GetString().Trim();
        if (!string.IsNullOrEmpty(val))
            colIndex[val] = c;
    }
    if (!colIndex.TryGetValue(colSerie, out idxSerie) ||
        !colIndex.TryGetValue(colType, out idxType) ||
        !colIndex.TryGetValue(colEtat, out idxEtat) ||
        !colIndex.TryGetValue(colServiceId, out idxService))
    {
        return BadRequest("Une ou plusieurs colonnes sélectionnées n'existent pas dans le fichier.");
    }

    var rows = ws.RowsUsed().Skip(1);
    int imported = 0;
    var errors = new List<string>();
    int lineNum = 2;

    foreach (var row in rows)
    {
        string serieStr = row.Cell(idxSerie).GetString().Trim();
        string typeStr = row.Cell(idxType).GetString().Trim();
        string etatStr = row.Cell(idxEtat).GetString().Trim();
        string serviceStr = row.Cell(idxService).GetString().Trim();

        var lineErrors = new List<string>();

        if (!int.TryParse(serieStr, out int serie))
            lineErrors.Add($"Série '{serieStr}' non valide");
        if (!int.TryParse(serviceStr, out int idService))
            lineErrors.Add($"Service ID '{serviceStr}' non valide");
        int type = ParseImportValue(typeStr);
        if (type == 0)
            lineErrors.Add($"Type '{typeStr}' non reconnu (ex: Ordinateur, Imprimante, ou 1,2,3,4)");
        int etat = ParseImportValue(etatStr);
        if (etat == 0)
            lineErrors.Add($"État '{etatStr}' non reconnu (ex: Neuf, Bon état, ou 1,2,3,4)");

        if (idService != 0 && !await _context.Services.AnyAsync(s => s.IdService == idService))
            lineErrors.Add($"Service ID {idService} inexistant");

        if (lineErrors.Any())
        {
            errors.Add($"Ligne {lineNum} : {string.Join(" | ", lineErrors)}");
        }
        else
        {
            _context.Equipements.Add(new Equipment
            {
                Serial = serie,
                Type = type,
                Etat = etat,
                IdService = idService,
                EstCharge = false,
                DateDechargement = null
            });
            imported++;
        }
        lineNum++;
    }

    await _context.SaveChangesAsync();

    var result = new { imported = imported, errors = errors };
    if (errors.Any())
        return Ok(new { message = $"{imported} équipements importés, {errors.Count} lignes ignorées.", details = errors });
    else
        return Ok(new { message = $"{imported} équipements importés avec succès.", details = new string[0] });
}

private int ParseImportValue(string input)
{
    if (string.IsNullOrWhiteSpace(input)) return 0;
    if (int.TryParse(input, out int code) && code >= 1 && code <= 4)
        return code;
    return input.Trim() switch
    {
        "Ordinateur" => 1,
        "Imprimante" => 2,
        "Scanner" => 3,
        "Photocopieur" => 4,
        "Neuf" => 1,
        "Bon état" => 2,
        "À réparer" => 3,
        "Hors service" => 4,
        _ => 0
    };
}
        
    }
}