using MaMaison.Application.Features.Terrains;
using MaMaison.Application.Configuration;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TerrainsController(
    ITerrainRepository terrainRepository,
    IOptions<FeatureFlags> featureFlags) : ControllerBase
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
        [FromQuery] decimal? prixMax,
        CancellationToken ct)
    {
        var terrains = await terrainRepository.RechercherAsync(commune, usage, surfaceMin, prixMax, ct);

        var dtos = terrains.Select(t => new TerrainListeDto(
            t.Id, t.Titre, t.Commune, t.Quartier,
            t.Surface, t.Prix, t.Usage, t.NiveauVerification,
            t.ScoreMaMaison, null));

        return Ok(dtos);
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
