using MaMaison.Application.Features.Locations;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocationsController(ILocationRepository locationRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Rechercher(
        [FromQuery] string? quartier,
        [FromQuery] string? commune,
        [FromQuery] TypeLocationBien? type,
        [FromQuery] decimal? loyerMax,
        [FromQuery] int? nombrePiecesMin,
        CancellationToken ct)
    {
        var locations = await locationRepository.RechercherAsync(
            quartier, commune, type, loyerMax, nombrePiecesMin, ct);

        var dtos = locations.Select(l => new LocationListeDto(
            l.Id, l.Titre, l.TypeBien, l.Quartier, l.Commune,
            l.NombrePieces, l.Loyer, l.TotalAPrevoir, l.EstDisponible,
            l.ScoreMaMaison, null));

        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> ObtenirDetail(Guid id, CancellationToken ct)
    {
        var location = await locationRepository.ObtenirParIdAsync(id, ct);
        if (location is null) return NotFound();

        var dto = new LocationDetailDto(
            location.Id, location.Titre, location.TypeBien,
            location.Quartier, location.Commune, location.NombrePieces,
            location.Loyer, location.Caution, location.Avance,
            location.FraisAgence, location.FraisVisite, location.TotalAPrevoir,
            location.EstDisponible, location.DateConfirmationDisponibilite,
            location.ScoreMaMaison);

        return Ok(dto);
    }
}
