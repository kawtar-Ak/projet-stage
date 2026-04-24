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
    public class ServicesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public ServicesController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? etage)
        {
            var query = _context.Services.AsQueryable();
            if (!string.IsNullOrEmpty(search))
                query = query.Where(s => s.NomService.Contains(search) || s.Description.Contains(search));
            if (!string.IsNullOrEmpty(etage))
                query = query.Where(s => s.Etage != null && s.Etage.Contains(etage));
            return Ok(await query.ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var service = await _context.Services.FindAsync(id);
            return service == null ? NotFound() : Ok(service);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Service model)
        {
            if (string.IsNullOrWhiteSpace(model.NomService))
                return BadRequest("Nom requis");
            if (await _context.Services.AnyAsync(s => s.IdService == model.IdService))
                return BadRequest($"L'ID {model.IdService} existe déjà.");
            _context.Services.Add(model);
            await _context.SaveChangesAsync();
            return Ok(model);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Service model)
        {
            if (id != model.IdService) return BadRequest("ID mismatch");
            var existing = await _context.Services.FindAsync(id);
            if (existing == null) return NotFound();
            existing.NomService = model.NomService;
            existing.Description = model.Description;
            existing.Etage = model.Etage;
            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var service = await _context.Services.Include(s => s.Equipements).FirstOrDefaultAsync(s => s.IdService == id);
            if (service == null) return NotFound();
            if (service.Equipements.Any())
                return BadRequest("Impossible : des équipements dépendent de ce service.");
            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return Ok();
        }

// Export Excel
[HttpGet("export/excel")]
public async Task<IActionResult> ExportExcel()
{
    var services = await _context.Services.ToListAsync();
    using var workbook = new XLWorkbook();
    var ws = workbook.Worksheets.Add("Services");
    ws.Cell(1, 1).Value = "ID";
    ws.Cell(1, 2).Value = "Nom";
    ws.Cell(1, 3).Value = "Description";
    ws.Cell(1, 4).Value = "Étage";
    int row = 2;
    foreach (var s in services)
    {
        ws.Cell(row, 1).Value = s.IdService;
        ws.Cell(row, 2).Value = s.NomService;
        ws.Cell(row, 3).Value = s.Description;
        ws.Cell(row, 4).Value = s.Etage;
        row++;
    }
    ws.Columns().AdjustToContents();
    using var stream = new MemoryStream();
    workbook.SaveAs(stream);
    return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "services.xlsx");
}

// Preview import
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

// Execute import avec mapping
[HttpPost("import/execute")]
public async Task<IActionResult> ExecuteImport(
    [FromForm] IFormFile file,
    [FromQuery] string colId,
    [FromQuery] string colNom,
    [FromQuery] string colDescription,
    [FromQuery] string colEtage)
{
    if (file == null) return BadRequest("Fichier requis");
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    using var workbook = new XLWorkbook(stream);
    var ws = workbook.Worksheet(1);
    var headerRow = ws.Row(1);
    var colIndex = new Dictionary<string, int>();
    for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
    {
        string val = headerRow.Cell(c).GetString().Trim();
        if (!string.IsNullOrEmpty(val))
            colIndex[val] = c;
    }
    if (!colIndex.TryGetValue(colId, out int idxId) ||
        !colIndex.TryGetValue(colNom, out int idxNom) ||
        !colIndex.TryGetValue(colDescription, out int idxDesc) ||
        !colIndex.TryGetValue(colEtage, out int idxEtage))
    {
        return BadRequest("Une ou plusieurs colonnes sélectionnées n'existent pas.");
    }

    var rows = ws.RowsUsed().Skip(1);
    int imported = 0;
    var errors = new List<string>();
    int lineNum = 2;
    foreach (var row in rows)
    {
        string idStr = row.Cell(idxId).GetString().Trim();
        string nom = row.Cell(idxNom).GetString().Trim();
        string desc = row.Cell(idxDesc).GetString().Trim();
        string etage = row.Cell(idxEtage).GetString().Trim();
        var lineErrors = new List<string>();

        if (!int.TryParse(idStr, out int id))
            lineErrors.Add($"ID '{idStr}' non valide");
        if (string.IsNullOrEmpty(nom))
            lineErrors.Add("Nom obligatoire");

        if (lineErrors.Any())
        {
            errors.Add($"Ligne {lineNum} : {string.Join(" | ", lineErrors)}");
        }
        else
        {
            var existing = await _context.Services.FindAsync(id);
            if (existing == null)
            {
                _context.Services.Add(new Service
                {
                    IdService = id,
                    NomService = nom,
                    Description = desc,
                    Etage = etage
                });
            }
            else
            {
                existing.NomService = nom;
                existing.Description = desc;
                existing.Etage = etage;
            }
            imported++;
        }
        lineNum++;
    }
    await _context.SaveChangesAsync();
    return Ok(new { imported, errors });
}   
}
}