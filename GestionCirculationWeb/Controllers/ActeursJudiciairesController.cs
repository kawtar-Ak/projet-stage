using GestionCourrier.Models;
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

        public ActeursJudiciairesController(ApplicationDbContext context)
        {
            _context = context;
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

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? motCle)
        {
            var query = BaseQuery().Where(e => !e.EstArchive);

            if (!string.IsNullOrWhiteSpace(motCle))
            {
                var keyword = motCle.Trim();
                query = query.Where(e =>
                    e.TribunalSource.Contains(keyword) ||
                    e.Sujet.Contains(keyword) ||
                    e.Destinataire.Contains(keyword) ||
                    e.Description.Contains(keyword) ||
                    e.Direction.Contains(keyword) ||
                    e.EtatArchive.Contains(keyword) ||
                    e.Emplacement.Contains(keyword));
            }

            var items = await query
                .OrderByDescending(e => e.DateArchivage)
                .ThenByDescending(e => e.Id)
                .ToListAsync();

            return Ok(items.Select(ToResponse));
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
                idBureauOrdre = e.IdBureauOrdre,
                idService = e.IdService,
                serviceNom = e.Service != null ? e.Service.NomService : null,
                numeroDossier = e.NumeroDossier != null
                    ? e.NumeroDossier.Annee + "/" + e.NumeroDossier.Nombre + "/" + e.NumeroDossier.NumeroSujet
                    : null,
                retraitsCount = e.Retraits.Count
            };
        }
    }
}
