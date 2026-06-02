using ClosedXML.Excel;
using GestionCourrier.ApplicationContracts.Transactions;
using GestionCourrier.DTOs;
using GestionCourrier.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GestionCourrier.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ITransactionWorkflowAppService _transactionWorkflowAppService;

        public TransactionsController(
            ApplicationDbContext context,
            ITransactionWorkflowAppService transactionWorkflowAppService)
        {
            _context = context;
            _transactionWorkflowAppService = transactionWorkflowAppService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return claim != null ? int.Parse(claim) : 0;
        }

        [HttpGet("incoming")]
        public async Task<IActionResult> GetIncoming()
        {
            try
            {
                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                var transactions = await _context.Transactions
                    .Where(t => t.DestinationServiceId == user.IdService && t.Statut == "En attente")
                    .ToListAsync();

                var result = new List<object>();
                foreach (var t in transactions)
                {
                    string sujet = "";
                    if (t.DocumentType == "Administratif")
                    {
                        sujet = await _context.Entites.Where(e => e.IdEntite == t.DocumentId).Select(e => e.Sujet).FirstOrDefaultAsync() ?? "";
                    }
                    else
                    {
                        sujet = await _context.EntitesDJs.Where(e => e.Id == t.DocumentId).Select(e => e.Sujet).FirstOrDefaultAsync() ?? "";
                    }
                    var sourceServiceNom = await _context.Services.Where(s => s.IdService == t.SourceServiceId).Select(s => s.NomService).FirstOrDefaultAsync() ?? "";
                    result.Add(new
                    {
                        id = t.Id,
                        documentId = t.DocumentId,
                        documentType = t.DocumentType,
                        documentSujet = sujet,
                        sourceServiceNom = sourceServiceNom,
                        message = t.Message,
                        dateEnvoi = t.DateEnvoi
                    });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("outgoing")]
        public async Task<IActionResult> GetOutgoing()
        {
            try
            {
                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                var transactions = await _context.Transactions
                    .Where(t => t.SourceServiceId == user.IdService)
                    .ToListAsync();

                var result = new List<object>();
                foreach (var t in transactions)
                {
                    string sujet = "";
                    if (t.DocumentType == "Administratif")
                    {
                        sujet = await _context.Entites.Where(e => e.IdEntite == t.DocumentId).Select(e => e.Sujet).FirstOrDefaultAsync() ?? "";
                    }
                    else
                    {
                        sujet = await _context.EntitesDJs.Where(e => e.Id == t.DocumentId).Select(e => e.Sujet).FirstOrDefaultAsync() ?? "";
                    }
                    var destServiceNom = await _context.Services.Where(s => s.IdService == t.DestinationServiceId).Select(s => s.NomService).FirstOrDefaultAsync() ?? "";
                    result.Add(new
                    {
                        id = t.Id,
                        documentId = t.DocumentId,
                        documentType = t.DocumentType,
                        documentSujet = sujet,
                        destinationServiceNom = destServiceNom,
                        doitRevenir = t.DoitRevenir,
                        dateEnvoi = t.DateEnvoi,
                        dateReponse = t.DateReponse,
                        statut = t.Statut,
                        message = t.Message,
                        messageReponse = t.MessageReponse
                    });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DemandeTransactionDto dto)
        {
            try
            {
                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                var existing = await _context.Transactions
                    .FirstOrDefaultAsync(t => t.DocumentId == dto.DocumentId && t.DocumentType == dto.DocumentType && (t.Statut == "En attente" || t.Statut == "Accepté"));
                if (existing != null)
                    return BadRequest("Ce document est déjà impliqué dans une transaction en cours.");

                bool docExists = dto.DocumentType == "Administratif"
                    ? await _context.Entites.AnyAsync(e => e.IdEntite == dto.DocumentId && e.EstTransmissible)
                    : await _context.EntitesDJs.AnyAsync(e => e.Id == dto.DocumentId && e.EstTransmissible);
                if (!docExists) return BadRequest("Document non transmissible.");

                var transaction = new Transaction
                {
                    DocumentId = dto.DocumentId,
                    DocumentType = dto.DocumentType,
                    SourceServiceId = user.IdService,
                    DestinationServiceId = dto.DestinationServiceId,
                    DestinationUserId = dto.DestinationUserId,
                    DoitRevenir = dto.DoitRevenir,
                    Message = dto.Message,
                    DateEnvoi = DateTime.Now,
                    Statut = "En attente"
                };
                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();
                return Ok(transaction);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("{id}/respond")]
        public async Task<IActionResult> Respond(int id, [FromBody] ReponseTransactionDto dto)
        {
            try
            {
                await _transactionWorkflowAppService.RespondAsync(id, GetCurrentUserId(), dto);
                return Ok(new { message = "Reponse enregistree" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            try
            {
                var transaction = await _context.Transactions.FindAsync(id);
                if (transaction == null) return NotFound();

                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                if (user.IdService != transaction.SourceServiceId)
                    return Forbid("Vous n'êtes pas l'émetteur.");

                if (transaction.Statut != "En attente")
                    return BadRequest("Seules les transactions en attente peuvent être annulées.");

                transaction.Statut = "Annulé";
                transaction.DateReponse = DateTime.Now;
                transaction.MessageReponse = "Annulée par l'émetteur";
                await _context.SaveChangesAsync();
                return Ok(transaction);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            try
            {
                var transaction = await _context.Transactions.FindAsync(id);
                if (transaction == null) return NotFound();

                if (transaction.Statut != "Accepté" && transaction.Statut != "Refusé")
                    return BadRequest("Seules les transactions acceptées ou refusées peuvent être supprimées.");

                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                bool isAdmin = user.IdService == 1 || user.Service?.NomService == "Administrateur";
                if (user.IdService != transaction.SourceServiceId && !isAdmin)
                    return Forbid("Vous n'avez pas le droit de supprimer cette transaction.");

                _context.Transactions.Remove(transaction);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Transaction supprimée." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("pending-returns")]
        public async Task<IActionResult> GetPendingReturns()
        {
            try
            {
                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                var transactions = await _context.Transactions
                    .Where(t => t.SourceServiceId == user.IdService && t.DoitRevenir == true && t.Statut == "Accepté")
                    .ToListAsync();

                var result = new List<object>();
                foreach (var t in transactions)
                {
                    string sujet = "";
                    if (t.DocumentType == "Administratif")
                    {
                        sujet = await _context.Entites.Where(e => e.IdEntite == t.DocumentId).Select(e => e.Sujet).FirstOrDefaultAsync() ?? "";
                    }
                    else
                    {
                        sujet = await _context.EntitesDJs.Where(e => e.Id == t.DocumentId).Select(e => e.Sujet).FirstOrDefaultAsync() ?? "";
                    }
                    var destServiceNom = await _context.Services.Where(s => s.IdService == t.DestinationServiceId).Select(s => s.NomService).FirstOrDefaultAsync() ?? "";
                    result.Add(new
                    {
                        id = t.Id,
                        documentSujet = sujet,
                        destinationServiceNom = destServiceNom,
                        dateEnvoi = t.DateEnvoi,
                        message = t.Message
                    });
                }
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("{id}/mark-returned")]
        public async Task<IActionResult> MarkReturned(int id)
        {
            try
            {
                var transaction = await _context.Transactions.FindAsync(id);
                if (transaction == null) return NotFound();

                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                if (user.IdService != transaction.SourceServiceId)
                    return Forbid("Vous n'êtes pas l'émetteur.");

                if (transaction.DoitRevenir != true)
                    return BadRequest("Cette transaction ne nécessite pas de retour.");

                if (transaction.Statut != "Accepté")
                    return BadRequest("Seule une transaction acceptée peut être retournée.");

                transaction.DoitRevenir = false;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Document marqué comme retourné." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("export-selected")]
        public async Task<IActionResult> ExportSelected([FromBody] List<int> ids)
        {
            try
            {
                var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
                if (user == null) return Unauthorized();

                var transactions = await _context.Transactions
                    .Where(t => ids.Contains(t.Id) && t.SourceServiceId == user.IdService)
                    .OrderByDescending(t => t.DateReponse ?? t.DateEnvoi)
                    .ToListAsync();

                using var workbook = new XLWorkbook();
                var ws = workbook.Worksheets.Add("Transactions_selectionnees");
                ws.Cell(1, 1).Value = "ID";
                ws.Cell(1, 2).Value = "Document ID";
                ws.Cell(1, 3).Value = "Type document";
                ws.Cell(1, 4).Value = "Numero BO";
                ws.Cell(1, 5).Value = "Numero dossier judiciaire";
                ws.Cell(1, 6).Value = "Service source ID";
                ws.Cell(1, 7).Value = "Service source";
                ws.Cell(1, 8).Value = "Service destinataire ID";
                ws.Cell(1, 9).Value = "Service destinataire";
                ws.Cell(1, 10).Value = "Etat";
                ws.Cell(1, 11).Value = "Date envoi";
                ws.Cell(1, 12).Value = "Date reponse";
                ws.Cell(1, 13).Value = "Message";
                ws.Cell(1, 14).Value = "Reponse";

                int row = 2;
                foreach (var t in transactions)
                {
                    string numeroBureauOrdre = "";
                    string numeroDossierJudiciaire = "";
                    if (t.DocumentType == "Administratif")
                    {
                        numeroBureauOrdre = await _context.Entites
                            .Where(e => e.IdEntite == t.DocumentId)
                            .Select(e => e.IdBureauOrdre ?? e.NumeroDeCourrier)
                            .FirstOrDefaultAsync() ?? "";
                    }
                    else
                    {
                        var judiciaire = await _context.EntitesDJs
                            .Include(e => e.NumeroDossier)
                            .FirstOrDefaultAsync(e => e.Id == t.DocumentId);
                        numeroBureauOrdre = judiciaire?.IdBureauOrdre ?? "";
                        numeroDossierJudiciaire = judiciaire?.NumeroDossier == null
                            ? ""
                            : $"{judiciaire.NumeroDossier.Nombre}/{judiciaire.NumeroDossier.NumeroSujet}/{judiciaire.NumeroDossier.Annee}";
                    }
                    var sourceServiceNom = await _context.Services.Where(s => s.IdService == t.SourceServiceId).Select(s => s.NomService).FirstOrDefaultAsync() ?? "";
                    var destServiceNom = await _context.Services.Where(s => s.IdService == t.DestinationServiceId).Select(s => s.NomService).FirstOrDefaultAsync() ?? "";
                    ws.Cell(row, 1).Value = t.Id;
                    ws.Cell(row, 2).Value = t.DocumentId;
                    ws.Cell(row, 3).Value = t.DocumentType;
                    ws.Cell(row, 4).Value = numeroBureauOrdre;
                    ws.Cell(row, 5).Value = numeroDossierJudiciaire;
                    ws.Cell(row, 6).Value = t.SourceServiceId;
                    ws.Cell(row, 7).Value = sourceServiceNom;
                    ws.Cell(row, 8).Value = t.DestinationServiceId;
                    ws.Cell(row, 9).Value = destServiceNom;
                    ws.Cell(row, 10).Value = t.Statut;
                    ws.Cell(row, 11).Value = t.DateEnvoi;
                    ws.Cell(row, 11).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                    ws.Cell(row, 12).Value = t.DateReponse;
                    ws.Cell(row, 12).Style.DateFormat.Format = "dd/MM/yyyy HH:mm";
                    ws.Cell(row, 13).Value = t.Message;
                    ws.Cell(row, 14).Value = t.MessageReponse ?? "";
                    row++;
                }
                ws.Columns().AdjustToContents();
                ApplyStandardExcelStyle(ws);
                using var stream = new MemoryStream();
                workbook.SaveAs(stream);
                return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "transactions_selectionnees.xlsx");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private static void ApplyStandardExcelStyle(IXLWorksheet ws)
        {
            var usedRange = ws.RangeUsed();
            if (usedRange == null) return;

            var firstRow = usedRange.FirstRow().RowNumber();
            var lastRow = usedRange.LastRow().RowNumber();
            var firstColumn = usedRange.FirstColumn().ColumnNumber();
            var lastColumn = usedRange.LastColumn().ColumnNumber();

            var fullRange = ws.Range(firstRow, firstColumn, lastRow, lastColumn);
            fullRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            fullRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            fullRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            fullRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            fullRange.Style.Alignment.WrapText = true;

            var headerRange = ws.Range(firstRow, firstColumn, firstRow, lastColumn);
            headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F6D7D");
            headerRange.Style.Font.FontColor = XLColor.White;
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            headerRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            headerRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            if (lastRow > firstRow)
            {
                ws.Range(firstRow + 1, firstColumn, lastRow, lastColumn)
                    .Style.Fill.BackgroundColor = XLColor.FromHtml("#F2F2F2");
            }
        }
    }
}
