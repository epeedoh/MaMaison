using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RechercheController(MaMaisonDbContext context) : ControllerBase
{
    /// <summary>
    /// Recherche globale sur tous les types de biens.
    /// Retourne les résultats groupés par catégorie.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Rechercher(
        [FromQuery] string q,
        [FromQuery] int limit = 5,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return BadRequest(new { message = "La recherche doit contenir au moins 2 caractères." });

        var terme = q.Trim().ToLower();

        var villas = await context.Villas
            .Where(v => v.Statut == StatutVilla.Publie &&
                       (v.Titre.Contains(terme) || v.Quartier.Contains(terme) || v.Ville.Contains(terme)))
            .OrderByDescending(v => v.ScoreMaMaison)
            .Take(limit)
            .Select(v => new { v.Id, v.Titre, Soustitre = v.Quartier + ", " + v.Ville, v.Prix, Type = "villa" })
            .ToListAsync(ct);

        var locations = await context.Locations
            .Where(l => l.Statut == StatutLocation.Publie && l.EstDisponible &&
                       (l.Titre.Contains(terme) || l.Quartier.Contains(terme) || l.Commune.Contains(terme)))
            .OrderByDescending(l => l.ScoreMaMaison)
            .Take(limit)
            .Select(l => new { l.Id, l.Titre, Soustitre = l.Quartier + ", " + l.Commune, Prix = l.Loyer, Type = "location" })
            .ToListAsync(ct);

        var terrains = await context.Terrains
            .Where(t => t.Statut == StatutTerrain.Publie &&
                       (t.Titre.Contains(terme) || t.Commune.Contains(terme) || t.Localisation.Contains(terme)))
            .OrderByDescending(t => t.ScoreMaMaison)
            .Take(limit)
            .Select(t => new { t.Id, t.Titre, Soustitre = t.Commune, t.Prix, Type = "terrain" })
            .ToListAsync(ct);

        return Ok(new {
            total = villas.Count + locations.Count + terrains.Count,
            villas,
            locations,
            terrains
        });
    }
}
