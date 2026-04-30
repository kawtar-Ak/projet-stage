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
    public class DocumentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public DocumentsController(ApplicationDbContext context) => _context = context;

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return claim != null ? int.Parse(claim) : 0;
        }

        [HttpGet]
        public async Task<IActionResult> GetDocumentsForCurrentService()
        {
            var user = await _context.Utilisateurs.FindAsync(GetCurrentUserId());
            if (user == null) return Unauthorized();

            var admins = await _context.Entites
                .Where(e => e.IdService == user.IdService && !e.EstArchive && e.EstTransmissible)
                .Select(e => new
                {
                    IdEntite = e.IdEntite,
                    e.Sujet,
                    DateCreation = e.DateCreation,
                    Source = e.Source,
                    e.Destinataire,
                    Type = "Administratif",
                    e.IdService
                })
                .ToListAsync();

            var juds = await _context.EntitesDJs
                .Where(e => e.IdService == user.IdService && !e.EstArchive && e.EstTransmissible)
                .Select(e => new
                {
                    IdEntite = e.Id,
                    e.Sujet,
                    DateCreation = e.DateArchivage,
                    Source = e.TribunalSource,
                    e.Destinataire,
                    Type = "Judiciaire",
                    e.IdService
                })
                .ToListAsync();

            var result = admins.Cast<object>().Concat(juds.Cast<object>());
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDocumentById(int id, [FromQuery] string type)
        {
            if (type == "Administratif")
            {
                var doc = await _context.Entites
                    .Where(e => e.IdEntite == id)
                    .Select(e => new
                    {
                        idEntite = e.IdEntite,
                        sujet = e.Sujet,
                        type = "Administratif",
                        dateCreation = e.DateCreation,
                        source = e.Source,
                        destinataire = e.Destinataire,
                        description = e.Description,
                        etat = e.Etat
                    })
                    .FirstOrDefaultAsync();
                if (doc == null) return NotFound();
                return Ok(doc);
            }
            else if (type == "Judiciaire")
            {
                var doc = await _context.EntitesDJs
                    .Where(e => e.Id == id)
                    .Select(e => new
                    {
                        idEntite = e.Id,
                        sujet = e.Sujet,
                        type = "Judiciaire",
                        dateCreation = e.DateArchivage,
                        source = e.TribunalSource,
                        destinataire = e.Destinataire,
                        description = e.Description,
                        etatArchive = e.EtatArchive
                    })
                    .FirstOrDefaultAsync();
                if (doc == null) return NotFound();
                return Ok(doc);
            }
            return BadRequest("Type invalide");
        }
    }
}