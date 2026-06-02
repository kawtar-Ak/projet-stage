using GestionCourrier.Models;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestionCourrier.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ActeursJudiciairesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public ActeursJudiciairesController(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await BaseQuery()
                .Where(e => !e.EstArchive)
                .OrderByDescending(e => e.DateArchivage)
                .ThenByDescending(e => e.Id)
                .ToListAsync();

            return Ok(items.Select(ToResponse));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await BaseQuery().FirstOrDefaultAsync(e => e.Id == id);
            return item == null ? NotFound("Element judiciaire introuvable") : Ok(ToResponse(item));
        }

        [HttpGet("archives")]
        public async Task<IActionResult> GetArchives([FromQuery] string? motCle)
        {
            var query = BaseQuery().Where(e => e.EstArchive || e.EtatArchive == "Archive");

            if (!string.IsNullOrWhiteSpace(motCle))
            {
                var keyword = motCle.Trim();
                query = query.Where(e =>
                    (e.IdBureauOrdre != null && e.IdBureauOrdre.Contains(keyword)) ||
                    e.TribunalSource.Contains(keyword) ||
                    e.Sujet.Contains(keyword) ||
                    e.Destinataire.Contains(keyword) ||
                    e.Description.Contains(keyword) ||
                    e.Direction.Contains(keyword) ||
                    e.EtatArchive.Contains(keyword) ||
                    e.Emplacement.Contains(keyword) ||
                    (e.NumeroDossier != null &&
                        (e.NumeroDossier.Annee.ToString().Contains(keyword) ||
                         e.NumeroDossier.Nombre.ToString().Contains(keyword) ||
                         e.NumeroDossier.NumeroSujet.ToString().Contains(keyword))));
            }

            var items = await query
                .OrderByDescending(e => e.DateArchivage)
                .ThenByDescending(e => e.Id)
                .ToListAsync();

            return Ok(items.Select(ToResponse));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CourrierJudiciaireRequest request)
        {
            var validation = await ValidateRequest(request);
            if (validation != null) return validation;

            var item = new EntiteDJ
            {
                DateArchivage = request.Date,
                TribunalSource = request.TribunalSource.Trim(),
                Sujet = request.Sujet.Trim(),
                Direction = NormalizeDirection(request.Direction),
                Destinataire = request.Destinataire?.Trim() ?? string.Empty,
                Description = request.Description?.Trim() ?? string.Empty,
                EtatArchive = GetJudicialStateForService(request.IdService),
                Emplacement = request.Emplacement?.Trim() ?? string.Empty,
                LienPdf = request.LienPdf?.Trim() ?? string.Empty,
                IdBureauOrdre = request.IdBureauOrdre,
                IdService = request.IdService,
                EstArchive = request.IdService == 13,
                EstTransmissible = true
            };

            ApplyNumeroDossier(item, request);

            _context.EntitesDJs.Add(item);
            await _context.SaveChangesAsync();

            var created = await BaseQuery().FirstAsync(e => e.Id == item.Id);
            return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponse(created));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, CourrierJudiciaireRequest request)
        {
            var item = await _context.EntitesDJs
                .Include(e => e.NumeroDossier)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (item == null) return NotFound("Element judiciaire introuvable");

            var validation = await ValidateRequest(request);
            if (validation != null) return validation;

            item.DateArchivage = request.Date;
            item.TribunalSource = request.TribunalSource.Trim();
            item.Sujet = request.Sujet.Trim();
            item.Direction = NormalizeDirection(request.Direction);
            item.Destinataire = request.Destinataire?.Trim() ?? string.Empty;
            item.Description = request.Description?.Trim() ?? string.Empty;
            item.Emplacement = request.Emplacement?.Trim() ?? string.Empty;
            item.LienPdf = request.LienPdf?.Trim() ?? string.Empty;
            item.IdBureauOrdre = request.IdBureauOrdre;
            item.IdService = request.IdService;
            item.EtatArchive = GetJudicialStateForService(request.IdService);
            item.EstArchive = request.IdService == 13;
            item.EstTransmissible = true;

            ApplyNumeroDossier(item, request);

            await _context.SaveChangesAsync();

            var updated = await BaseQuery().FirstAsync(e => e.Id == id);
            return Ok(ToResponse(updated));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.EntitesDJs.FirstOrDefaultAsync(e => e.Id == id);
            if (item == null) return NotFound("Element judiciaire introuvable");

            _context.EntitesDJs.Remove(item);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("archiver/{id:int}")]
        public async Task<IActionResult> Archiver(int id)
        {
            var item = await _context.EntitesDJs.FirstOrDefaultAsync(e => e.Id == id);
            if (item == null) return NotFound("Element judiciaire introuvable");

            item.EstArchive = true;
            item.EtatArchive = "Archive";
            await _context.SaveChangesAsync();

            return Ok(ToResponse(item));
        }

        [HttpPost("{id:int}/retraits")]
        public async Task<IActionResult> EnregistrerRetrait(int id, RetraitRequest request)
        {
            var item = await _context.EntitesDJs.FirstOrDefaultAsync(e => e.Id == id);
            if (item == null) return NotFound("Element judiciaire introuvable");

            if (string.IsNullOrWhiteSpace(request.MotifDeRetrait))
                return BadRequest("Motif de retrait obligatoire.");

            var retrait = new Retrait
            {
                EntiteDJId = id,
                DateDeRetrait = request.DateDeRetrait == default ? DateTime.Now : request.DateDeRetrait,
                MotifDeRetrait = request.MotifDeRetrait.Trim(),
                EffectuePar = request.EffectuePar?.Trim() ?? string.Empty,
                DateDeRetour = request.DateDeRetour ?? DateTime.MinValue,
                Notes = request.Notes?.Trim() ?? string.Empty
            };

            _context.Retraits.Add(retrait);
            await _context.SaveChangesAsync();

            var updated = await BaseQuery().FirstAsync(e => e.Id == id);
            return Ok(ToResponse(updated));
        }

        [HttpPut("retraits/{retraitId:int}/retour")]
        public async Task<IActionResult> EnregistrerRetour(int retraitId, RetraitRetourRequest request)
        {
            var retrait = await _context.Retraits.FirstOrDefaultAsync(r => r.Id == retraitId);
            if (retrait == null) return NotFound("Retrait introuvable");

            retrait.DateDeRetour = request.DateDeRetour == default ? DateTime.Now : request.DateDeRetour;

            if (!string.IsNullOrWhiteSpace(request.Notes))
                retrait.Notes = request.Notes.Trim();

            await _context.SaveChangesAsync();

            var updated = await BaseQuery().FirstAsync(e => e.Id == retrait.EntiteDJId);
            return Ok(ToResponse(updated));
        }

        [HttpPost("upload-pdf")]
        [HttpPost("upload-document")]
        public async Task<IActionResult> UploadDocument([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Fichier requis.");

            var extension = Path.GetExtension(file.FileName);
            var allowedExtensions = new[] { ".pdf", ".doc", ".docx" };
            if (!allowedExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                return BadRequest("Seuls les fichiers PDF ou Word sont acceptes.");

            var uploadsRoot = Path.Combine(_environment.WebRootPath, "uploads", "documents");
            Directory.CreateDirectory(uploadsRoot);

            var safeBaseName = Path.GetFileNameWithoutExtension(file.FileName);
            safeBaseName = string.Join("-", safeBaseName.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries));
            if (string.IsNullOrWhiteSpace(safeBaseName))
                safeBaseName = "document";

            var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}-{safeBaseName}{extension.ToLowerInvariant()}";
            var filePath = Path.Combine(uploadsRoot, fileName);

            await using (var stream = System.IO.File.Create(filePath))
            {
                await file.CopyToAsync(stream);
            }

            var link = $"/uploads/documents/{fileName}";
            return Ok(new { lienPdf = link });
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? motCle)
        {
            var query = BaseQuery().Where(e => !e.EstArchive);

            if (!string.IsNullOrWhiteSpace(motCle))
            {
                var keyword = motCle.Trim();
                if (int.TryParse(keyword, out var numero))
                {
                    query = query.Where(e => (e.IdBureauOrdre != null && e.IdBureauOrdre.Contains(keyword)) ||
                        (e.NumeroDossier != null &&
                            (e.NumeroDossier.Annee == numero ||
                             e.NumeroDossier.Nombre == numero ||
                             e.NumeroDossier.NumeroSujet == numero)) ||
                        e.TribunalSource.Contains(keyword) ||
                        e.Sujet.Contains(keyword) ||
                        e.Destinataire.Contains(keyword) ||
                        e.Description.Contains(keyword) ||
                        e.Direction.Contains(keyword) ||
                        e.EtatArchive.Contains(keyword) ||
                        e.Emplacement.Contains(keyword));
                }
                else
                {
                    query = query.Where(e =>
                        (e.IdBureauOrdre != null && e.IdBureauOrdre.Contains(keyword)) ||
                        e.TribunalSource.Contains(keyword) ||
                        e.Sujet.Contains(keyword) ||
                        e.Destinataire.Contains(keyword) ||
                        e.Description.Contains(keyword) ||
                        e.Direction.Contains(keyword) ||
                        e.EtatArchive.Contains(keyword) ||
                        e.Emplacement.Contains(keyword));
                }
            }

            var items = await query
                .OrderByDescending(e => e.DateArchivage)
                .ThenByDescending(e => e.Id)
                .ToListAsync();

            return Ok(items.Select(ToResponse));
        }

        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel()
        {
            var courriers = await BaseQuery()
                .Where(e => !e.EstArchive)
                .OrderByDescending(e => e.DateArchivage)
                .ThenByDescending(e => e.Id)
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Courriers juridiques");

            var headers = new[]
            {
                "رقم مكتب الضبط (اختياري)",
                "التاريخ",
                "المحكمة / المصدر",
                "رقم ملف الاستئناف القضائي",
                "الموضوع",
                "المرسل إليه",
                "المصلحة",
                "الحالة",
                "الموقع",
                "رابط PDF",
                "الملاحظات"
            };

            for (var i = 0; i < headers.Length; i++)
            {
                ws.Cell(1, i + 1).Value = headers[i];
                ws.Cell(1, i + 1).Style.Font.Bold = true;
            }

            var row = 2;
            foreach (var courrier in courriers)
            {
                ws.Cell(row, 1).Value = courrier.IdBureauOrdre;
                ws.Cell(row, 2).Value = courrier.DateArchivage;
                ws.Cell(row, 2).Style.DateFormat.Format = "dd/MM/yyyy";
                ws.Cell(row, 3).Value = courrier.TribunalSource;
                ws.Cell(row, 4).Value = FormatNumeroDossier(courrier);
                ws.Cell(row, 5).Value = courrier.Sujet;
                ws.Cell(row, 6).Value = courrier.Destinataire;
                ws.Cell(row, 7).Value = courrier.Service?.NomService ?? courrier.IdService.ToString();
                ws.Cell(row, 8).Value = ToArabicEtat(courrier.EtatArchive);
                ws.Cell(row, 9).Value = courrier.Emplacement;
                ws.Cell(row, 10).Value = courrier.LienPdf;
                ws.Cell(row, 11).Value = courrier.Description;
                row++;
            }

            ws.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"courriers-juridiques-{DateTime.Now:yyyyMMddHHmm}.xlsx");
        }

        [HttpPost("import/excel")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
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
                    var date = ReadDate(row.Cell(2));
                    var tribunalSource = row.Cell(3).GetString().Trim();
                    var sujet = row.Cell(5).GetString().Trim();
                    var numeroDossier = row.Cell(4).GetString().Trim();
                    var service = await ResolveService(row.Cell(7).GetString().Trim());

                    if (date == null || string.IsNullOrWhiteSpace(tribunalSource) ||
                        string.IsNullOrWhiteSpace(sujet) || string.IsNullOrWhiteSpace(numeroDossier) || service == null)
                    {
                        errors.Add($"Ligne {row.RowNumber()}: date, tribunal/source, numero dossier, sujet et service sont obligatoires.");
                        continue;
                    }

                    var item = new EntiteDJ
                    {
                        IdBureauOrdre = row.Cell(1).GetString().Trim(),
                        DateArchivage = date.Value,
                        TribunalSource = tribunalSource,
                        Sujet = sujet,
                        Direction = "Entrant",
                        Destinataire = row.Cell(6).GetString().Trim(),
                        IdService = service.IdService,
                        EtatArchive = FromArabicEtat(row.Cell(8).GetString().Trim()),
                        Emplacement = row.Cell(9).GetString().Trim(),
                        EstTransmissible = true,
                        LienPdf = row.Cell(10).GetString().Trim(),
                        Description = row.Cell(11).GetString().Trim(),
                        EstArchive = false
                    };

                    ApplyNumeroDossier(item, new CourrierJudiciaireRequest { NumeroDossier = numeroDossier });

                    _context.EntitesDJs.Add(item);
                    imported++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Ligne {row.RowNumber()}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { imported, errors });
        }

        private IQueryable<EntiteDJ> BaseQuery()
        {
            return _context.EntitesDJs
                .Include(e => e.Service)
                .Include(e => e.NumeroDossier)
                .Include(e => e.Retraits);
        }

        private static object ToResponse(EntiteDJ e)
        {
            return new
            {
                id = e.Id,
                date = e.DateArchivage,
                tribunalSource = e.TribunalSource,
                sujet = e.Sujet,
                direction = e.Direction,
                destinataire = e.Destinataire,
                description = e.Description,
                etatArchive = e.EtatArchive,
                emplacement = e.Emplacement,
                lienPdf = e.LienPdf,
                // Permet au tableau React d'afficher Oui/Non.
                estTransmissible = e.EstTransmissible,
                idBureauOrdre = e.IdBureauOrdre,
                idService = e.IdService,
                serviceNom = e.Service != null ? e.Service.NomService : null,
                numeroDossier = e.NumeroDossier != null
                    ? e.NumeroDossier.Annee + "/" + e.NumeroDossier.Nombre + "/" + e.NumeroDossier.NumeroSujet
                    : null,
                numeroDossierAnnee = e.NumeroDossier != null ? e.NumeroDossier.Annee : (int?)null,
                numeroDossierNombre = e.NumeroDossier != null ? e.NumeroDossier.Nombre : (int?)null,
                numeroDossierSujet = e.NumeroDossier != null ? e.NumeroDossier.NumeroSujet : (int?)null,
                retraitsCount = e.Retraits.Count,
                retraits = e.Retraits
                    .OrderByDescending(r => r.DateDeRetrait)
                    .Select(r => new
                    {
                        id = r.Id,
                        dateDeRetrait = r.DateDeRetrait,
                        motifDeRetrait = r.MotifDeRetrait,
                        effectuePar = r.EffectuePar,
                        dateDeRetour = r.DateDeRetour == DateTime.MinValue ? (DateTime?)null : r.DateDeRetour,
                        notes = r.Notes
                    })
            };
        }

        private async Task<IActionResult?> ValidateRequest(CourrierJudiciaireRequest request)
        {
            if (request.Date == default)
                return BadRequest("Date obligatoire.");

            if (string.IsNullOrWhiteSpace(request.TribunalSource))
                return BadRequest("Tribunal / source obligatoire.");

            if (string.IsNullOrWhiteSpace(request.Sujet))
                return BadRequest("Sujet obligatoire.");

            if (string.IsNullOrWhiteSpace(request.NumeroDossier))
                return BadRequest("Numero dossier juridique obligatoire.");

            if (!TryParseNumeroDossier(request.NumeroDossier, out _, out _, out _))
                return BadRequest("Numero dossier juridique invalide. Exemple: 2026/15/3.");

            if (request.IdService <= 0)
                return BadRequest("Service obligatoire.");

            if (!await _context.Services.AnyAsync(s => s.IdService == request.IdService))
                return BadRequest("Service inexistant.");

            return null;
        }

        private void ApplyNumeroDossier(EntiteDJ item, CourrierJudiciaireRequest request)
        {
            var hasNumeroDossierTexte = TryParseNumeroDossier(request.NumeroDossier, out var annee, out var nombre, out var numeroSujet);
            var hasNumeroDossier = hasNumeroDossierTexte ||
                request.NumeroDossierAnnee.HasValue ||
                request.NumeroDossierNombre.HasValue ||
                request.NumeroDossierSujet.HasValue;

            if (!hasNumeroDossier)
                return;

            if (item.NumeroDossier == null)
                item.NumeroDossier = new NumeroDossierJuridique();

            item.NumeroDossier.Annee = hasNumeroDossierTexte ? annee : request.NumeroDossierAnnee ?? DateTime.Now.Year;
            item.NumeroDossier.Nombre = hasNumeroDossierTexte ? nombre : request.NumeroDossierNombre ?? 0;
            item.NumeroDossier.NumeroSujet = hasNumeroDossierTexte ? numeroSujet : request.NumeroDossierSujet ?? 0;
        }

        private static string NormalizeDirection(string? direction)
        {
            if (direction?.Equals("Sortant", StringComparison.OrdinalIgnoreCase) == true)
                return "Sortant";

            if (direction?.Equals("Interne", StringComparison.OrdinalIgnoreCase) == true)
                return "Interne";

            return "Entrant";
        }

        private static string NormalizeEtat(string? etat)
        {
            if (etat?.Equals("Jugé", StringComparison.OrdinalIgnoreCase) == true ||
                etat?.Equals("Juge", StringComparison.OrdinalIgnoreCase) == true)
                return "Jugé";

            if (etat?.Equals("En cours", StringComparison.OrdinalIgnoreCase) == true)
                return "En cours";

            if (etat?.Equals("Traite", StringComparison.OrdinalIgnoreCase) == true ||
                etat?.Equals("Traité", StringComparison.OrdinalIgnoreCase) == true)
                return "Traite";

            if (etat?.Equals("Archive", StringComparison.OrdinalIgnoreCase) == true ||
                etat?.Equals("Archivé", StringComparison.OrdinalIgnoreCase) == true)
                return "Archive";

            return "Nouveau";
        }

        private static string GetJudicialStateForService(int serviceId)
        {
            return serviceId switch
            {
                2 or 3 => "Nouveau",
                7 or 10 => "Jugé",
                13 => "Archive",
                _ => "En cours"
            };
        }

        private async Task<Service?> ResolveService(string value)
        {
            if (int.TryParse(value, out var id))
                return await _context.Services.FirstOrDefaultAsync(s => s.IdService == id);

            return await _context.Services.FirstOrDefaultAsync(s => s.NomService == value);
        }

        private static DateTime? ReadDate(IXLCell cell)
        {
            if (cell.TryGetValue<DateTime>(out var date))
                return date;

            return DateTime.TryParse(cell.GetString(), out date) ? date : null;
        }

        private static string FormatNumeroDossier(EntiteDJ courrier)
        {
            return courrier.NumeroDossier != null
                ? $"{courrier.NumeroDossier.Annee}/{courrier.NumeroDossier.Nombre}/{courrier.NumeroDossier.NumeroSujet}"
                : string.Empty;
        }

        private static CourrierJudiciaireRequest ParseNumeroDossier(string value)
        {
            var request = new CourrierJudiciaireRequest();
            if (!TryParseNumeroDossier(value, out var annee, out var nombre, out var sujet))
                return request;

            if (annee > 0)
                request.NumeroDossierAnnee = annee;

            if (nombre > 0)
                request.NumeroDossierNombre = nombre;

            if (sujet > 0)
                request.NumeroDossierSujet = sujet;

            return request;
        }

        private static bool TryParseNumeroDossier(string? value, out int annee, out int nombre, out int numeroSujet)
        {
            annee = 0;
            nombre = 0;
            numeroSujet = 0;

            if (string.IsNullOrWhiteSpace(value))
                return false;

            var parts = value.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 0 || parts.Length > 3)
                return false;

            if (!int.TryParse(parts[0], out annee))
                return false;

            if (parts.Length > 1 && !int.TryParse(parts[1], out nombre))
                return false;

            if (parts.Length > 2 && !int.TryParse(parts[2], out numeroSujet))
                return false;

            return true;
        }

        private static bool FromArabicBool(string value)
        {
            return value.Equals("نعم", StringComparison.OrdinalIgnoreCase) ||
                value.Equals("Oui", StringComparison.OrdinalIgnoreCase) ||
                value.Equals("True", StringComparison.OrdinalIgnoreCase);
        }

        private static string FromArabicEtat(string value)
        {
            return value switch
            {
                "قيد المعالجة" => "En cours",
                "تمت المعالجة" => "Traite",
                "مؤرشف" => "Archive",
                _ => NormalizeEtat(value)
            };
        }

        private static string ToArabicEtat(string? value)
        {
            return value switch
            {
                "En cours" => "قيد المعالجة",
                "Traite" => "تمت المعالجة",
                "Archive" => "مؤرشف",
                _ => "جديد"
            };
        }
    }

    public class CourrierJudiciaireRequest
    {
        public string? IdBureauOrdre { get; set; }
        public DateTime Date { get; set; }
        public string TribunalSource { get; set; } = string.Empty;
        public string Sujet { get; set; } = string.Empty;
        public string? Direction { get; set; }
        public string? Destinataire { get; set; }
        public string? Description { get; set; }
        public string? EtatArchive { get; set; }
        public string? Emplacement { get; set; }
        public string? LienPdf { get; set; }
        public int IdService { get; set; }
        public bool EstTransmissible { get; set; }
        public string? NumeroDossier { get; set; }
        public int? NumeroDossierAnnee { get; set; }
        public int? NumeroDossierNombre { get; set; }
        public int? NumeroDossierSujet { get; set; }
    }

    public class RetraitRequest
    {
        public DateTime DateDeRetrait { get; set; }
        public string MotifDeRetrait { get; set; } = string.Empty;
        public string? EffectuePar { get; set; }
        public DateTime? DateDeRetour { get; set; }
        public string? Notes { get; set; }
    }

    public class RetraitRetourRequest
    {
        public DateTime DateDeRetour { get; set; }
        public string? Notes { get; set; }
    }
}
