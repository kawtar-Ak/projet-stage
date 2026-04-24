using ClosedXML.Excel;
using GestionCourrier.DTOs;
using GestionCourrier.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace GestionCourrier.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class UtilisateursController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public UtilisateursController(ApplicationDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _context.Utilisateurs.Include(u => u.Service)
                .Select(u => new UtilisateurDto
                {
                    Id = u.Id,
                    NomComplet = u.NomComplet,
                    Login = u.Login,
                    IdService = u.IdService,
                    NomService = u.Service != null ? u.Service.NomService : null
                }).ToListAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await _context.Utilisateurs.FindAsync(id);
            return u == null ? NotFound() : Ok(u);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateUtilisateurDto dto)
        {
            if (await _context.Utilisateurs.AnyAsync(u => u.Login == dto.Login))
                return BadRequest("Login déjà utilisé");
            if (!await _context.Services.AnyAsync(s => s.IdService == dto.IdService))
                return BadRequest("Service inexistant");
            var user = new Utilisateur
            {
                NomComplet = dto.NomComplet,
                Login = dto.Login,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                IdService = dto.IdService
            };
            _context.Utilisateurs.Add(user);
            await _context.SaveChangesAsync();
            return Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateUtilisateurDto dto)
        {
            var user = await _context.Utilisateurs.FindAsync(id);
            if (user == null) return NotFound();
            if (!string.IsNullOrEmpty(dto.NomComplet)) user.NomComplet = dto.NomComplet;
            if (!string.IsNullOrEmpty(dto.Login))
            {
                if (await _context.Utilisateurs.AnyAsync(u => u.Id != id && u.Login == dto.Login))
                    return BadRequest("Login déjà utilisé");
                user.Login = dto.Login;
            }
            if (!string.IsNullOrEmpty(dto.Password))
                user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            if (dto.IdService.HasValue)
            {
                if (!await _context.Services.AnyAsync(s => s.IdService == dto.IdService.Value))
                    return BadRequest("Service inexistant");
                user.IdService = dto.IdService.Value;
            }
            await _context.SaveChangesAsync();
            return Ok(user);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Utilisateurs.FindAsync(id);
            if (user == null) return NotFound();
            _context.Utilisateurs.Remove(user);
            await _context.SaveChangesAsync();
            return Ok();
        }

     [HttpGet("export/excel")]
public async Task<IActionResult> ExportExcel()
{
    var users = await _context.Utilisateurs.Include(u => u.Service).ToListAsync();
    using var workbook = new XLWorkbook();
    var ws = workbook.Worksheets.Add("Utilisateurs");
    ws.Cell(1, 1).Value = "ID";
    ws.Cell(1, 2).Value = "Nom complet";
    ws.Cell(1, 3).Value = "Login";
    ws.Cell(1, 4).Value = "Service ID";
    ws.Cell(1, 5).Value = "Service Nom";
    int row = 2;
    foreach (var u in users)
    {
        ws.Cell(row, 1).Value = u.Id;
        ws.Cell(row, 2).Value = u.NomComplet;
        ws.Cell(row, 3).Value = u.Login;
        ws.Cell(row, 4).Value = u.IdService;
        ws.Cell(row, 5).Value = u.Service?.NomService;
        row++;
    }
    ws.Columns().AdjustToContents();
    using var stream = new MemoryStream();
    workbook.SaveAs(stream);
    return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "utilisateurs.xlsx");
}

[HttpPost("import/preview")]
public async Task<IActionResult> PreviewImport(IFormFile file)
{
    if (file == null || file.Length == 0) return BadRequest("Fichier requis");
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    using var workbook = new XLWorkbook(stream);
    var ws = workbook.Worksheet(1);
    var headers = ws.Row(1).CellsUsed().Select(c => c.GetString().Trim()).ToList();
    return Ok(headers);
}
[HttpPost("import/execute")]
public async Task<IActionResult> ExecuteImport(
    [FromForm] IFormFile file,
    [FromQuery] string colNom,
    [FromQuery] string colLogin,
    [FromQuery] string colServiceId)
{
    if (file == null) return BadRequest("Fichier requis");
    using var stream = new MemoryStream();
    await file.CopyToAsync(stream);
    using var workbook = new XLWorkbook(stream);
    var ws = workbook.Worksheet(1);
    var headerRow = ws.Row(1);

    // Index des colonnes
    var colIndex = new Dictionary<string, int>();
    for (int c = 1; c <= headerRow.LastCellUsed().Address.ColumnNumber; c++)
    {
        string val = headerRow.Cell(c).GetString().Trim();
        if (!string.IsNullOrEmpty(val))
            colIndex[val] = c;
    }

    if (!colIndex.TryGetValue(colNom, out int idxNom) ||
        !colIndex.TryGetValue(colLogin, out int idxLogin) ||
        !colIndex.TryGetValue(colServiceId, out int idxService))
    {
        return BadRequest("Colonnes obligatoires manquantes : Nom, Login, Service ID");
    }

    var rows = ws.RowsUsed().Skip(1);
    int imported = 0;
    var errors = new List<string>();
    int lineNum = 2;

    foreach (var row in rows)
    {
        string nom = row.Cell(idxNom).GetString().Trim();
        string login = row.Cell(idxLogin).GetString().Trim();
        string serviceIdStr = row.Cell(idxService).GetString().Trim();

        var lineErrors = new List<string>();

        if (string.IsNullOrWhiteSpace(nom))
            lineErrors.Add("Nom complet manquant");
        if (string.IsNullOrWhiteSpace(login))
            lineErrors.Add("Login manquant");
        if (!int.TryParse(serviceIdStr, out int idService))
            lineErrors.Add($"Service ID '{serviceIdStr}' invalide");
        else if (!await _context.Services.AnyAsync(s => s.IdService == idService))
            lineErrors.Add($"Service ID {idService} inexistant");

        if (await _context.Utilisateurs.AnyAsync(u => u.Login == login))
            lineErrors.Add($"Login '{login}' existe déjà");

        if (lineErrors.Any())
        {
            errors.Add($"Ligne {lineNum} : {string.Join(" | ", lineErrors)}");
        }
        else
        {
            var newUser = new Utilisateur
            {
                NomComplet = nom,
                Login = login,
                IdService = idService,
                Password = BCrypt.Net.BCrypt.HashPassword("default123")
            };
            _context.Utilisateurs.Add(newUser);
            imported++;
        }
        lineNum++;
    }

    await _context.SaveChangesAsync();
    return Ok(new { imported, errors });
}
[HttpGet("template")]
public IActionResult GetTemplate()
{
    using var workbook = new XLWorkbook();
    var ws = workbook.Worksheets.Add("Modele_Utilisateurs");
    ws.Cell(1, 1).Value = "NomComplet";
    ws.Cell(1, 2).Value = "Login";
    ws.Cell(1, 3).Value = "ServiceID";
    ws.Cell(2, 1).Value = "Jean Dupont";
    ws.Cell(2, 2).Value = "jdupont";
    ws.Cell(2, 3).Value = 1;
    ws.Columns().AdjustToContents();
    using var stream = new MemoryStream();
    workbook.SaveAs(stream);
    return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "modele_utilisateurs.xlsx");
}
    }
}