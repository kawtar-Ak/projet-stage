using ClosedXML.Excel;
using GestionCourrier.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GestionCourrier.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CourriersController : ControllerBase
    {
        private const string TypeDocumentAdministratif = "Administratif";
        private const string TypeRegistreWaridat = "Waridat";
        private const string TypeRegistreMorasalat = "Morasalat";
        private const string TypeCorrespondanceSortante = "Sortante";
        private const string TypeCorrespondanceEntrante = "Entrante";
        private readonly ApplicationDbContext _context;

        public CourriersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? numeroBureauOrdre,
            [FromQuery] DateTime? date,
            [FromQuery] string? type)
        {
            var courriers = await ApplyStructuredFilters(
                    BaseQuery().Where(e => !e.EstArchive),
                    numeroBureauOrdre,
                    date,
                    type)
                .OrderByDescending(e => e.DateCreation)
                .ThenByDescending(e => e.IdEntite)
                .ToListAsync();

            return Ok(courriers.Select(ToResponse));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var courrier = await BaseQuery()
                .FirstOrDefaultAsync(e => e.IdEntite == id);

            return courrier == null ? NotFound("Courrier introuvable") : Ok(ToResponse(courrier));
        }

        [HttpGet("waridat")]
        public async Task<IActionResult> GetWaridat()
        {
            var waridat = await BaseQuery()
                .Where(e => !e.EstArchive &&
                    e.ParentId == null &&
                    (e.TypeRegistre == TypeRegistreWaridat || e.TypeRegistre == null || e.TypeRegistre == string.Empty))
                .OrderByDescending(e => e.DateCreation)
                .ThenByDescending(e => e.IdEntite)
                .ToListAsync();

            return Ok(waridat.Select(ToResponse));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CourrierAdministratifRequest request)
        {
            var validation = await ValidateRequest(request);
            if (validation != null) return validation;

            var typeRegistre = NormalizeTypeRegistre(request.TypeRegistre);
            var typeCorrespondance = NormalizeTypeCorrespondance(request.TypeCorrespondance, request.Direction);
            var direction = NormalizeDirection(request.Direction);

            string idBureauOrdre;
            int? parentId = null;

            if (typeRegistre == TypeRegistreMorasalat)
            {
                if (request.ParentId.HasValue && request.ParentId.Value > 0)
                {
                    var parent = await FindWaridatParent(request.ParentId.Value);

                    if (parent == null)
                        return BadRequest("La waridat parent est introuvable.");

                    if (string.IsNullOrWhiteSpace(parent.IdBureauOrdre))
                        return BadRequest("La waridat parent n'a pas de numero bureau d'ordre.");

                    idBureauOrdre = parent.IdBureauOrdre ?? string.Empty;
                    parentId = parent.IdEntite;
                }
                else
                {
                    idBureauOrdre = request.IdBureauOrdre!.Trim();
                    if (await ExistsIdBureauOrdre(idBureauOrdre))
                        return BadRequest("Ce numero bureau d'ordre existe deja.");
                }

                direction = typeCorrespondance == TypeCorrespondanceSortante ? "Sortant" : "Interne";
            }
            else
            {
                idBureauOrdre = request.IdBureauOrdre!.Trim();
                if (await ExistsIdBureauOrdre(idBureauOrdre))
                    return BadRequest("Ce numero bureau d'ordre existe deja.");

                direction = "Entrant";
                typeCorrespondance = null;
            }

            var courrier = new Entite
            {
                IdBureauOrdre = idBureauOrdre,
                DateCreation = request.Date,
                Source = request.Source.Trim(),
                Sujet = request.Sujet.Trim(),
                Destinataire = request.Destinataire?.Trim() ?? string.Empty,
                Description = request.Description?.Trim() ?? string.Empty,
                Etat = NormalizeEtat(request.Etat),
                LienPdf = request.LienPdf?.Trim() ?? string.Empty,
                Direction = direction,
                TypeDocument = TypeDocumentAdministratif,
                TypeGenerale = GetTypeGenerale(direction),
                NumeroDeCourrier = request.NumeroDeCourrier?.Trim() ?? string.Empty,
                IdService = request.IdService,
                EstArchive = false,
                ParentId = parentId,
                TypeRegistre = typeRegistre,
                TypeCorrespondance = typeCorrespondance
            };

            _context.Entites.Add(courrier);
            await _context.SaveChangesAsync();

            var created = await BaseQuery().FirstAsync(e => e.IdEntite == courrier.IdEntite);
            return CreatedAtAction(nameof(GetById), new { id = courrier.IdEntite }, ToResponse(created));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, CourrierAdministratifRequest request)
        {
            var courrier = await _context.Entites
                .FirstOrDefaultAsync(e => e.IdEntite == id && e.TypeDocument == TypeDocumentAdministratif);

            if (courrier == null) return NotFound("Courrier introuvable");

            var validation = await ValidateRequest(request);
            if (validation != null) return validation;

            var typeRegistre = NormalizeTypeRegistre(request.TypeRegistre);
            var typeCorrespondance = NormalizeTypeCorrespondance(request.TypeCorrespondance, request.Direction);
            var direction = NormalizeDirection(request.Direction);
            string idBureauOrdre;
            int? parentId = null;

            if (typeRegistre == TypeRegistreMorasalat)
            {
                if (request.ParentId.HasValue && request.ParentId.Value > 0)
                {
                    var parent = await FindWaridatParent(request.ParentId.Value);

                    if (parent == null)
                        return BadRequest("La waridat parent est introuvable.");

                    if (string.IsNullOrWhiteSpace(parent.IdBureauOrdre))
                        return BadRequest("La waridat parent n'a pas de numero bureau d'ordre.");

                    idBureauOrdre = parent.IdBureauOrdre ?? string.Empty;
                    parentId = parent.IdEntite;
                }
                else
                {
                    idBureauOrdre = request.IdBureauOrdre!.Trim();
                    if (await ExistsIdBureauOrdre(idBureauOrdre, id))
                        return BadRequest("Ce numero bureau d'ordre est deja utilise par une autre ligne principale.");
                }

                direction = typeCorrespondance == TypeCorrespondanceSortante ? "Sortant" : "Interne";
            }
            else
            {
                idBureauOrdre = request.IdBureauOrdre!.Trim();
                if (await ExistsIdBureauOrdre(idBureauOrdre, id))
                    return BadRequest("Ce numero bureau d'ordre est deja utilise par une autre waridat.");

                direction = "Entrant";
                typeCorrespondance = null;
            }

            var oldIdBureauOrdre = courrier.IdBureauOrdre;
            courrier.IdBureauOrdre = idBureauOrdre;
            courrier.DateCreation = request.Date;
            courrier.Source = request.Source.Trim();
            courrier.Sujet = request.Sujet.Trim();
            courrier.Destinataire = request.Destinataire?.Trim() ?? string.Empty;
            courrier.Description = request.Description?.Trim() ?? string.Empty;
            courrier.Etat = NormalizeEtat(request.Etat);
            courrier.LienPdf = request.LienPdf?.Trim() ?? string.Empty;
            courrier.Direction = direction;
            courrier.TypeDocument = TypeDocumentAdministratif;
            courrier.TypeGenerale = GetTypeGenerale(direction);
            courrier.NumeroDeCourrier = request.NumeroDeCourrier?.Trim() ?? string.Empty;
            courrier.IdService = request.IdService;
            courrier.ParentId = parentId;
            courrier.TypeRegistre = typeRegistre;
            courrier.TypeCorrespondance = typeCorrespondance;

            if (typeRegistre == TypeRegistreWaridat && oldIdBureauOrdre != idBureauOrdre)
            {
                var children = await _context.Entites
                    .Where(e => e.ParentId == id && e.TypeDocument == TypeDocumentAdministratif)
                    .ToListAsync();

                foreach (var child in children)
                    child.IdBureauOrdre = idBureauOrdre;
            }

            await _context.SaveChangesAsync();

            var updated = await BaseQuery().FirstAsync(e => e.IdEntite == id);
            return Ok(ToResponse(updated));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var courrier = await _context.Entites
                .FirstOrDefaultAsync(e => e.IdEntite == id && e.TypeDocument == TypeDocumentAdministratif);

            if (courrier == null) return NotFound("Courrier introuvable");

            _context.Entites.Remove(courrier);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPut("archiver/{id:int}")]
        public async Task<IActionResult> Archiver(int id)
        {
            var courrier = await _context.Entites
                .FirstOrDefaultAsync(e => e.IdEntite == id && e.TypeDocument == TypeDocumentAdministratif);

            if (courrier == null) return NotFound("Courrier introuvable");

            courrier.EstArchive = true;
            courrier.Etat = "Archive";
            await _context.SaveChangesAsync();

            return Ok(ToResponse(courrier));
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? motCle,
            [FromQuery] string? numeroBureauOrdre,
            [FromQuery] DateTime? date,
            [FromQuery] string? type)
        {
            var query = ApplyStructuredFilters(
                BaseQuery().AsNoTracking().Where(e => !e.EstArchive),
                numeroBureauOrdre,
                date,
                type);

            if (!string.IsNullOrWhiteSpace(motCle))
            {
                var keyword = motCle.Trim();
                query = query.Where(e =>
                    (e.IdBureauOrdre != null && e.IdBureauOrdre.StartsWith(keyword)) ||
                    e.Source.StartsWith(keyword) ||
                    e.Sujet.StartsWith(keyword) ||
                    e.Destinataire.StartsWith(keyword) ||
                    e.Description.StartsWith(keyword) ||
                    e.Etat.StartsWith(keyword));
            }

            var results = await query
                .OrderByDescending(e => e.DateCreation)
                .ThenByDescending(e => e.IdEntite)
                .ToListAsync();

            return Ok(results.Select(ToResponse));
        }

        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] string? motCle,
            [FromQuery] string? numeroBureauOrdre,
            [FromQuery] DateTime? date,
            [FromQuery] string? type)
        {
            var query = ApplyStructuredFilters(
                BaseQuery().Where(e => !e.EstArchive),
                numeroBureauOrdre,
                date,
                type);

            if (!string.IsNullOrWhiteSpace(motCle))
            {
                var keyword = motCle.Trim();
                query = query.Where(e =>
                    (e.IdBureauOrdre != null && e.IdBureauOrdre.StartsWith(keyword)) ||
                    e.Source.StartsWith(keyword) ||
                    e.Sujet.StartsWith(keyword) ||
                    e.Destinataire.StartsWith(keyword) ||
                    e.Description.StartsWith(keyword) ||
                    e.Etat.StartsWith(keyword));
            }

            var courriers = await query
                .OrderByDescending(e => e.DateCreation)
                .ThenByDescending(e => e.IdEntite)
                .ToListAsync();

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Courriers");
            string[] headers =
            {
                "رقم مكتب الضبط",
                "تاريخ الواردة / المراسلة",
                "مصدر الواردة",
                "موضوع الواردة",
                "المرسل إليه / المحال عليه",
                "المراسلات الصادرة",
                "المراسلات الواردة",
                "المصلحة",
                "الحالة",
                "الرقم الداخلي",
                "رابط PDF",
                "الملاحظات / النتيجة"
            };

            for (int i = 0; i < headers.Length; i++)
                ws.Cell(1, i + 1).Value = headers[i];

            var childrenByParent = courriers
                .Where(c => c.ParentId.HasValue)
                .GroupBy(c => c.ParentId!.Value)
                .ToDictionary(g => g.Key, g => g.ToList());

            var exportedIds = new HashSet<int>();
            int row = 2;
            foreach (var courrier in courriers.Where(c => !c.ParentId.HasValue))
            {
                childrenByParent.TryGetValue(courrier.IdEntite, out var children);
                children ??= new List<Entite>();

                var linked = new[] { courrier }.Concat(children).ToList();
                foreach (var item in linked)
                    exportedIds.Add(item.IdEntite);

                ws.Cell(row, 1).Value = courrier.IdBureauOrdre;
                ws.Cell(row, 2).Value = courrier.DateCreation;
                ws.Cell(row, 2).Style.DateFormat.Format = "dd/MM/yyyy";
                ws.Cell(row, 3).Value = courrier.TypeRegistre == TypeRegistreMorasalat ? string.Empty : courrier.Source;
                ws.Cell(row, 4).Value = courrier.TypeRegistre == TypeRegistreMorasalat ? string.Empty : courrier.Sujet;
                ws.Cell(row, 5).Value = courrier.TypeRegistre == TypeRegistreMorasalat ? string.Empty : courrier.Destinataire;
                ws.Cell(row, 6).Value = JoinLines(linked.Where(IsCorrespondanceSortante).Select(FormatCorrespondance));
                ws.Cell(row, 7).Value = JoinLines(linked.Where(IsCorrespondanceEntrante).Select(FormatCorrespondance));
                ws.Cell(row, 8).Value = courrier.Service?.NomService;
                ws.Cell(row, 9).Value = ToArabicEtat(courrier.Etat);
                ws.Cell(row, 10).Value = JoinLines(linked.Select(c => c.NumeroDeCourrier).Where(v => !string.IsNullOrWhiteSpace(v)));
                ws.Cell(row, 11).Value = JoinLines(linked.Select(c => c.LienPdf).Where(v => !string.IsNullOrWhiteSpace(v)));
                ws.Cell(row, 12).Value = JoinLines(linked.Select(c => c.Description).Where(v => !string.IsNullOrWhiteSpace(v)));
                row++;
            }

            foreach (var courrier in courriers.Where(c => !exportedIds.Contains(c.IdEntite)))
            {
                ws.Cell(row, 1).Value = courrier.IdBureauOrdre;
                ws.Cell(row, 2).Value = courrier.DateCreation;
                ws.Cell(row, 2).Style.DateFormat.Format = "dd/MM/yyyy";
                ws.Cell(row, 6).Value = IsCorrespondanceSortante(courrier) ? FormatCorrespondance(courrier) : string.Empty;
                ws.Cell(row, 7).Value = IsCorrespondanceEntrante(courrier) ? FormatCorrespondance(courrier) : string.Empty;
                ws.Cell(row, 8).Value = courrier.Service?.NomService;
                ws.Cell(row, 9).Value = ToArabicEtat(courrier.Etat);
                ws.Cell(row, 10).Value = courrier.NumeroDeCourrier;
                ws.Cell(row, 11).Value = courrier.LienPdf;
                ws.Cell(row, 12).Value = courrier.Description;
                row++;
            }

            ws.Row(1).Style.Font.Bold = true;
            ws.Row(1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.SheetView.FreezeRows(1);
            ws.Columns(1, headers.Length).Width = 24;
            ws.Column(6).Width = 45;
            ws.Column(7).Width = 45;
            ws.Column(12).Width = 40;

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "courriers-administratifs.xlsx");
        }

        [HttpPost("import/excel")]
        public async Task<IActionResult> ImportExcel(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Fichier Excel requis.");

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var workbook = new XLWorkbook(stream);
            var ws = workbook.Worksheet(1);
            var rows = ws.RowsUsed().Skip(1);
            int imported = 0;
            var errors = new List<string>();
            int lineNumber = 2;

            foreach (var row in rows)
            {
                var idBureauOrdre = row.Cell(1).GetString().Trim();
                var dateText = row.Cell(2).GetString().Trim();
                var source = row.Cell(3).GetString().Trim();
                var sujet = row.Cell(4).GetString().Trim();
                var destinataire = row.Cell(5).GetString().Trim();
                var correspondanceSortante = row.Cell(6).GetString().Trim();
                var correspondanceEntrante = row.Cell(7).GetString().Trim();
                var serviceText = row.Cell(8).GetString().Trim();
                var etatText = row.Cell(9).GetString().Trim();
                var numeroText = row.Cell(10).GetString().Trim();
                var lienPdf = row.Cell(11).GetString().Trim();
                var description = row.Cell(12).GetString().Trim();

                var hasWaridatFields = !string.IsNullOrWhiteSpace(source) || !string.IsNullOrWhiteSpace(sujet);
                var hasSortante = !string.IsNullOrWhiteSpace(correspondanceSortante);
                var hasEntrante = !string.IsNullOrWhiteSpace(correspondanceEntrante);
                var typeRegistre = hasWaridatFields ? TypeRegistreWaridat : TypeRegistreMorasalat;
                var typeCorrespondance = hasSortante ? TypeCorrespondanceSortante :
                    hasEntrante ? TypeCorrespondanceEntrante : (string?)null;
                var direction = typeRegistre == TypeRegistreWaridat
                    ? "Entrant"
                    : typeCorrespondance == TypeCorrespondanceSortante ? "Sortant" : "Interne";

                if (!hasWaridatFields)
                {
                    source = hasEntrante ? "Import Excel" : source;
                    sujet = hasSortante ? correspondanceSortante : correspondanceEntrante;
                }

                var lineErrors = new List<string>();

                if (string.IsNullOrWhiteSpace(idBureauOrdre))
                    lineErrors.Add("Numero bureau d'ordre obligatoire");

                if (!TryReadDate(row.Cell(2), dateText, out var dateValue))
                    lineErrors.Add("Date non valide");

                if (string.IsNullOrWhiteSpace(source))
                    lineErrors.Add("Source obligatoire");

                if (string.IsNullOrWhiteSpace(sujet))
                    lineErrors.Add("Sujet obligatoire");

                var service = await FindService(serviceText);
                if (service == null)
                    lineErrors.Add($"Service '{serviceText}' introuvable");

                if (!string.IsNullOrWhiteSpace(idBureauOrdre) && await ExistsIdBureauOrdre(idBureauOrdre))
                    lineErrors.Add($"Numero bureau d'ordre '{idBureauOrdre}' existe deja");

                if (lineErrors.Any())
                {
                    errors.Add($"Ligne {lineNumber}: {string.Join(" | ", lineErrors)}");
                }
                else
                {
                    _context.Entites.Add(new Entite
                    {
                        IdBureauOrdre = idBureauOrdre,
                        DateCreation = dateValue,
                        Direction = direction,
                        TypeGenerale = GetTypeGenerale(direction),
                        Source = source,
                        Sujet = sujet,
                        Destinataire = destinataire,
                        IdService = service!.IdService,
                        Etat = NormalizeEtat(FromArabicEtat(etatText)),
                        NumeroDeCourrier = numeroText,
                        LienPdf = lienPdf,
                        Description = description,
                        TypeDocument = TypeDocumentAdministratif,
                        TypeRegistre = typeRegistre,
                        TypeCorrespondance = typeCorrespondance,
                        ParentId = null,
                        EstArchive = false
                    });
                    imported++;
                }

                lineNumber++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { imported, errors });
        }

        private static IQueryable<Entite> ApplyStructuredFilters(
            IQueryable<Entite> query,
            string? numeroBureauOrdre,
            DateTime? date,
            string? type)
        {
            if (!string.IsNullOrWhiteSpace(numeroBureauOrdre))
            {
                var numero = numeroBureauOrdre.Trim();
                query = query.Where(e => e.IdBureauOrdre != null && e.IdBureauOrdre.StartsWith(numero));
            }

            if (date.HasValue)
            {
                var day = date.Value.Date;
                query = query.Where(e => e.DateCreation.Date == day);
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                var normalized = type.Trim();
                if (normalized.Equals(TypeRegistreWaridat, StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(e => e.ParentId == null &&
                        (e.TypeRegistre == TypeRegistreWaridat || e.TypeRegistre == null || e.TypeRegistre == string.Empty));
                }
                else if (normalized.Equals(TypeRegistreMorasalat, StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(e => e.TypeRegistre == TypeRegistreMorasalat || e.ParentId != null);
                }
                else if (normalized.Equals(TypeCorrespondanceSortante, StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(e => e.TypeCorrespondance == TypeCorrespondanceSortante || e.Direction == "Sortant");
                }
                else if (normalized.Equals(TypeCorrespondanceEntrante, StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(e => e.TypeCorrespondance == TypeCorrespondanceEntrante || e.Direction == "Interne");
                }
                else
                {
                    var direction = NormalizeDirection(type);
                    query = query.Where(e => e.Direction == direction);
                }
            }

            return query;
        }

        private IQueryable<Entite> BaseQuery()
        {
            return _context.Entites
                .Include(e => e.Service)
                .Where(e => e.TypeDocument == TypeDocumentAdministratif);
        }

        private async Task<IActionResult?> ValidateRequest(CourrierAdministratifRequest request)
        {
            var typeRegistre = NormalizeTypeRegistre(request.TypeRegistre);

            if (typeRegistre == TypeRegistreWaridat && string.IsNullOrWhiteSpace(request.IdBureauOrdre))
                return BadRequest("Numero bureau d'ordre obligatoire.");

            if (typeRegistre == TypeRegistreMorasalat &&
                (!request.ParentId.HasValue || request.ParentId.Value <= 0) &&
                string.IsNullOrWhiteSpace(request.IdBureauOrdre))
                return BadRequest("Numero bureau d'ordre obligatoire pour une morasalat independante.");

            if (request.Date == default)
                return BadRequest("Date obligatoire.");

            if (string.IsNullOrWhiteSpace(request.Source))
                return BadRequest("Source obligatoire.");

            if (string.IsNullOrWhiteSpace(request.Sujet))
                return BadRequest("Sujet obligatoire.");

            if (request.IdService <= 0)
                return BadRequest("Service obligatoire.");

            if (!await _context.Services.AnyAsync(s => s.IdService == request.IdService))
                return BadRequest("Service inexistant.");

            return null;
        }

        private async Task<bool> ExistsIdBureauOrdre(string idBureauOrdre, int? excludedId = null)
        {
            var normalizedIdBureauOrdre = idBureauOrdre.Trim();

            return await _context.Entites.AnyAsync(e =>
                e.TypeDocument == TypeDocumentAdministratif &&
                e.ParentId == null &&
                e.IdBureauOrdre != null &&
                e.IdBureauOrdre.Trim() == normalizedIdBureauOrdre &&
                (!excludedId.HasValue || e.IdEntite != excludedId.Value));
        }

        private async Task<Entite?> FindWaridatParent(int parentId)
        {
            return await _context.Entites.FirstOrDefaultAsync(e =>
                e.IdEntite == parentId &&
                e.TypeDocument == TypeDocumentAdministratif &&
                (e.TypeRegistre == TypeRegistreWaridat || e.TypeRegistre == null || e.TypeRegistre == string.Empty) &&
                e.ParentId == null);
        }

        private async Task<Service?> FindService(string value)
        {
            if (int.TryParse(value, out var idService))
                return await _context.Services.FirstOrDefaultAsync(s => s.IdService == idService);

            return await _context.Services.FirstOrDefaultAsync(s => s.NomService == value);
        }

        private static bool TryReadDate(IXLCell cell, string text, out DateTime value)
        {
            if (cell.DataType == XLDataType.DateTime)
            {
                value = cell.GetDateTime();
                return true;
            }

            return DateTime.TryParse(text, out value);
        }

        private static string NormalizeDirection(string? direction)
        {
            if (direction?.Equals("Sortant", StringComparison.OrdinalIgnoreCase) == true)
                return "Sortant";

            if (direction?.Equals("Interne", StringComparison.OrdinalIgnoreCase) == true)
                return "Interne";

            return "Entrant";
        }

        private static string NormalizeTypeRegistre(string? typeRegistre)
        {
            if (typeRegistre?.Equals(TypeRegistreMorasalat, StringComparison.OrdinalIgnoreCase) == true)
                return TypeRegistreMorasalat;

            return TypeRegistreWaridat;
        }

        private static string? NormalizeTypeCorrespondance(string? typeCorrespondance, string? direction)
        {
            if (typeCorrespondance?.Equals(TypeCorrespondanceEntrante, StringComparison.OrdinalIgnoreCase) == true)
                return TypeCorrespondanceEntrante;

            if (typeCorrespondance?.Equals(TypeCorrespondanceSortante, StringComparison.OrdinalIgnoreCase) == true)
                return TypeCorrespondanceSortante;

            if (direction?.Equals("Interne", StringComparison.OrdinalIgnoreCase) == true)
                return TypeCorrespondanceEntrante;

            return TypeCorrespondanceSortante;
        }

        private static string FromArabicDirection(string? direction)
        {
            return direction switch
            {
                "وارد" or "الواردات" => "Entrant",
                "صادر" or "صادرة" or "المراسلات الصادرة" => "Sortant",
                "داخلي" or "داخلية" or "المراسلات الداخلية" => "Interne",
                _ => direction ?? string.Empty
            };
        }

        private static string ToArabicDirection(string? direction)
        {
            return direction switch
            {
                "Sortant" => "صادر",
                "Interne" => "داخلي",
                _ => "وارد"
            };
        }

        private static string ToArabicRegister(Entite courrier)
        {
            if (courrier.TypeRegistre == TypeRegistreMorasalat)
            {
                return courrier.TypeCorrespondance == TypeCorrespondanceEntrante
                    ? "المراسلات الواردة"
                    : "المراسلات الصادرة";
            }

            return "الواردات";
        }

        private static bool IsCorrespondanceSortante(Entite courrier)
        {
            return courrier.TypeRegistre == TypeRegistreMorasalat &&
                (courrier.TypeCorrespondance == TypeCorrespondanceSortante || courrier.Direction == "Sortant");
        }

        private static bool IsCorrespondanceEntrante(Entite courrier)
        {
            return courrier.TypeRegistre == TypeRegistreMorasalat &&
                (courrier.TypeCorrespondance == TypeCorrespondanceEntrante || courrier.Direction == "Interne");
        }

        private static string FormatCorrespondance(Entite courrier)
        {
            var parts = new List<string>();

            if (courrier.DateCreation != default)
                parts.Add(courrier.DateCreation.ToString("dd/MM/yyyy"));

            if (!string.IsNullOrWhiteSpace(courrier.Source))
                parts.Add($"المصدر: {courrier.Source}");

            if (!string.IsNullOrWhiteSpace(courrier.Destinataire))
                parts.Add($"المرسل إليه: {courrier.Destinataire}");

            if (!string.IsNullOrWhiteSpace(courrier.Sujet))
                parts.Add($"الموضوع/الجواب: {courrier.Sujet}");

            if (!string.IsNullOrWhiteSpace(courrier.Description))
                parts.Add($"النتيجة: {courrier.Description}");

            return string.Join(" | ", parts);
        }

        private static string JoinLines(IEnumerable<string?> values)
        {
            return string.Join(Environment.NewLine, values.Where(v => !string.IsNullOrWhiteSpace(v)));
        }

        private static string NormalizeEtat(string? etat)
        {
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

        private static string FromArabicEtat(string? etat)
        {
            return etat switch
            {
                "جديد" => "Nouveau",
                "قيد المعالجة" => "En cours",
                "تمت المعالجة" => "Traite",
                "مؤرشف" => "Archive",
                _ => etat ?? string.Empty
            };
        }

        private static string ToArabicEtat(string? etat)
        {
            return etat switch
            {
                "En cours" => "قيد المعالجة",
                "Traite" => "تمت المعالجة",
                "Archive" => "مؤرشف",
                _ => "جديد"
            };
        }

        private static TypeEntite GetTypeGenerale(string direction)
        {
            return direction switch
            {
                "Sortant" => TypeEntite.CourrierSortant,
                "Interne" => TypeEntite.Interne,
                _ => TypeEntite.CourrierEntrant
            };
        }

        private static object ToResponse(Entite e)
        {
            return new
            {
                id = e.IdEntite,
                idBureauOrdre = e.IdBureauOrdre,
                date = e.DateCreation,
                sujet = e.Sujet,
                source = e.Source,
                destinataire = e.Destinataire,
                description = e.Description,
                etat = e.Etat,
                lienPdf = e.LienPdf,
                direction = e.Direction,
                typeRegistre = string.IsNullOrWhiteSpace(e.TypeRegistre)
                    ? (e.ParentId.HasValue ? TypeRegistreMorasalat : TypeRegistreWaridat)
                    : e.TypeRegistre,
                typeCorrespondance = e.TypeCorrespondance,
                parentId = e.ParentId,
                typeDocument = e.TypeDocument,
                typeGenerale = e.TypeGenerale,
                numeroDeCourrier = e.NumeroDeCourrier,
                idService = e.IdService,
                serviceNom = e.Service != null ? e.Service.NomService : null
            };
        }
    }

    public class CourrierAdministratifRequest
    {
        public string? IdBureauOrdre { get; set; }
        public DateTime Date { get; set; }
        public string Source { get; set; } = string.Empty;
        public string Sujet { get; set; } = string.Empty;
        public string? Destinataire { get; set; }
        public string? Description { get; set; }
        public string? Etat { get; set; }
        public string? LienPdf { get; set; }
        public string? Direction { get; set; }
        public string? TypeRegistre { get; set; }
        public string? TypeCorrespondance { get; set; }
        public int? ParentId { get; set; }
        public int IdService { get; set; }
        public string? NumeroDeCourrier { get; set; }
    }
}
