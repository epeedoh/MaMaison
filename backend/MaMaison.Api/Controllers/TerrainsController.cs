using MaMaison.Application.Features.Terrains;
using MaMaison.Application.Configuration;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TerrainsController(
    ITerrainRepository terrainRepository,
    IOptions<FeatureFlags> featureFlags,
    MaMaisonDbContext context) : ControllerBase
{
    private const string AvertissementJuridique =
        "MaMaison effectue une vérification préliminaire des informations transmises. " +
        "Toute acquisition doit faire l'objet d'une vérification finale auprès d'un notaire, " +
        "d'un géomètre et des autorités compétentes.";

    [HttpGet]
    public async Task<IActionResult> Rechercher(
        [FromQuery] string? commune,
        [FromQuery] UsageTerrain? usage,
        [FromQuery] decimal? surfaceMin,
        [FromQuery] decimal? surfaceMax,
        [FromQuery] decimal? prixMax,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var query = context.Terrains.Where(t => t.Statut == StatutTerrain.Publie);
        if (!string.IsNullOrWhiteSpace(commune)) query = query.Where(t => t.Commune.Contains(commune));
        if (usage.HasValue)      query = query.Where(t => t.Usage == usage.Value);
        if (surfaceMin.HasValue) query = query.Where(t => t.Surface >= surfaceMin.Value);
        if (surfaceMax.HasValue) query = query.Where(t => t.Surface <= surfaceMax.Value);
        if (prixMax.HasValue)    query = query.Where(t => t.Prix <= prixMax.Value);

        var total      = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        var items      = await query.OrderBy(t => t.Prix)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        var dtos = items.Select(t => new TerrainListeDto(
            t.Id, t.Titre, t.Commune, t.Quartier,
            t.Surface, t.Prix, t.Usage, t.NiveauVerification,
            t.ScoreMaMaison, null));

        return Ok(new { items = dtos, total, page, pageSize, totalPages });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> ObtenirDetail(Guid id, CancellationToken ct)
    {
        var terrain = await terrainRepository.ObtenirParIdAsync(id, ct);
        if (terrain is null) return NotFound();

        var dto = new TerrainDetailDto(
            terrain.Id, terrain.Titre, terrain.Localisation, terrain.Commune, terrain.Quartier,
            terrain.Surface, terrain.Prix, terrain.Usage, terrain.TypeDocument,
            terrain.Latitude, terrain.Longitude, terrain.NiveauVerification,
            terrain.ScoreMaMaison, AvertissementJuridique);

        return Ok(dto);
    }
}
