using MaMaison.Application.Features.Locations;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocationsController(ILocationRepository locationRepository, MaMaisonDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Rechercher(
        [FromQuery] string? quartier,
        [FromQuery] string? commune,
        [FromQuery] TypeLocationBien? type,
        [FromQuery] decimal? loyerMax,
        [FromQuery] decimal? loyerMin,
        [FromQuery] int? nombrePiecesMin,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var query = context.Locations
            .Where(l => l.Statut == StatutLocation.Publie && l.EstDisponible);

        if (!string.IsNullOrWhiteSpace(quartier)) query = query.Where(l => l.Quartier.Contains(quartier));
        if (!string.IsNullOrWhiteSpace(commune))  query = query.Where(l => l.Commune.Contains(commune));
        if (type.HasValue)         query = query.Where(l => l.TypeBien == type.Value);
        if (loyerMax.HasValue)     query = query.Where(l => l.Loyer <= loyerMax.Value);
        if (loyerMin.HasValue)     query = query.Where(l => l.Loyer >= loyerMin.Value);
        if (nombrePiecesMin.HasValue) query = query.Where(l => l.NombrePieces >= nombrePiecesMin.Value);

        var total      = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        var items      = await query
            .OrderByDescending(l => l.ScoreMaMaison)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => new LocationListeDto(
                l.Id, l.Titre, l.TypeBien, l.Quartier, l.Commune,
                l.NombrePieces, l.Loyer, l.TotalAPrevoir, l.EstDisponible,
                l.ScoreMaMaison, null))
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize, totalPages });
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

    [HttpPost]
    public async Task<IActionResult> Soumettre(
        [FromBody] SoumettreLocationCommand cmd,
        CancellationToken ct)
    {
        var proprietaireId = Guid.NewGuid();

        var location = Location.Creer(
            proprietaireId, cmd.Titre, cmd.TypeBien,
            cmd.Quartier, cmd.Commune, cmd.NombrePieces,
            cmd.Loyer, cmd.Caution, cmd.Avance, cmd.FraisAgence);

        await locationRepository.AjouterAsync(location, ct);
        await locationRepository.SauvegarderAsync(ct);

        return Created($"/api/locations/{location.Id}", new { id = location.Id,
            message = "Votre bien a été soumis. Vérification en cours (48h)." });
    }
}
