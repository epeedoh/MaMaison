using MaMaison.Application.Features.Villas;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VillasController(IVillaRepository villaRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Rechercher(
        [FromQuery] TypeVilla? type,
        [FromQuery] string? quartier,
        [FromQuery] decimal? prixMax,
        [FromQuery] Guid? promoteurId,
        CancellationToken ct)
    {
        var villas = await villaRepository.RechercherAsync(type, quartier, prixMax, promoteurId, ct);

        var dtos = villas.Select(v => new VillaListeDto(
            v.Id, v.Titre, v.TypeVilla, v.Quartier, v.Ville,
            v.Prix, v.SurfaceHabitable, v.NombrePieces,
            v.ImagePrincipaleUrl, v.Modele3DUrl != null, v.ScoreMaMaison));

        return Ok(dtos);
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
