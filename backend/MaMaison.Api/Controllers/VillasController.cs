using MaMaison.Application.Common;
using MaMaison.Application.Features.Villas;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VillasController(IVillaRepository villaRepository, MaMaisonDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Rechercher(
        [FromQuery] TypeVilla? type,
        [FromQuery] string? quartier,
        [FromQuery] decimal? prixMax,
        [FromQuery] Guid? promoteurId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        // Requête paginée directement sur DbContext pour éviter le chargement total
        var query = context.Villas
            .Where(v => v.Statut == StatutVilla.Publie);

        if (type.HasValue)          query = query.Where(v => v.TypeVilla == type.Value);
        if (!string.IsNullOrEmpty(quartier)) query = query.Where(v => v.Quartier.Contains(quartier));
        if (prixMax.HasValue)       query = query.Where(v => v.Prix <= prixMax.Value);
        if (promoteurId.HasValue)   query = query.Where(v => v.PromoteurId == promoteurId.Value);

        var total      = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        var items      = await query
            .OrderBy(v => v.Prix)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new VillaListeDto(
                v.Id, v.Titre, v.TypeVilla, v.Quartier, v.Ville,
                v.Prix, v.SurfaceHabitable, v.NombrePieces,
                v.ImagePrincipaleUrl, v.Modele3DUrl != null, v.ScoreMaMaison))
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize, totalPages });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> ObtenirDetail(Guid id, CancellationToken ct)
    {
        var villa = await villaRepository.ObtenirAvecPointsVisiteAsync(id, ct);
        if (villa is null) return NotFound();

        var dto = new VillaDetailDto(
            villa.Id,
            villa.PromoteurId,
            NomPromoteur: string.Empty,
            villa.Titre,
            villa.TypeVilla,
            villa.Quartier,
            villa.Ville,
            villa.Prix,
            villa.SurfaceTerrain,
            villa.SurfaceHabitable,
            villa.NombrePieces,
            villa.Description,
            villa.ImagePrincipaleUrl,
            villa.Modele3DUrl,
            villa.ScoreMaMaison,
            villa.Medias.Select(m => new MediaBienDto(m.Id, m.TypeMedia.ToString(), m.Url, m.Ordre)),
            villa.PointsVisite.OrderBy(p => p.Ordre).Select(p => new PointVisite3DDto(
                p.Id, p.NomPiece, p.Description,
                p.PositionX, p.PositionY, p.PositionZ,
                p.RotationX, p.RotationY, p.RotationZ,
                p.Ordre,
                p.Hotspots.Select(h => new HotspotVisiteDto(
                    h.Id, h.Libelle, h.Contenu, h.PositionX, h.PositionY, h.PositionZ)))));

        return Ok(dto);
    }
}
