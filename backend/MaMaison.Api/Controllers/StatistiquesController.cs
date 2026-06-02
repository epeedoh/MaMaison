using MaMaison.Application.Features.Statistiques;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatistiquesController(MaMaisonDbContext context) : ControllerBase
{
    /// <summary>
    /// Prix moyen/m² pour une zone et un type de bien (anonyme — jamais de noms de promoteurs).
    /// </summary>
    [HttpGet("prix-m2")]
    public async Task<IActionResult> GetPrixM2(
        [FromQuery] string? quartier,
        [FromQuery] string? commune,
        [FromQuery] TypeVilla? typeVilla,
        CancellationToken ct)
    {
        var query = context.Villas
            .Where(v => v.Statut == StatutVilla.Publie
                     && v.SurfaceHabitable > 0
                     && v.Prix > 0);

        if (!string.IsNullOrWhiteSpace(quartier))
            query = query.Where(v => v.Quartier.Contains(quartier));
        else if (!string.IsNullOrWhiteSpace(commune))
            query = query.Where(v => v.Ville.Contains(commune));

        if (typeVilla.HasValue)
            query = query.Where(v => v.TypeVilla == typeVilla.Value);

        var biens = await query
            .Select(v => new { v.Prix, v.SurfaceHabitable, v.Quartier, v.TypeVilla })
            .ToListAsync(ct);

        if (biens.Count == 0)
            return NotFound(new { message = "Pas assez de données pour cette zone." });

        var prixM2List = biens.Select(b => b.Prix / b.SurfaceHabitable).ToList();

        var dto = new StatistiquesPrixDto(
            Zone:           quartier ?? commune ?? "Côte d'Ivoire",
            PrixMoyenM2:    Math.Round(prixM2List.Average(), 0),
            PrixMinM2:      Math.Round(prixM2List.Min(), 0),
            PrixMaxM2:      Math.Round(prixM2List.Max(), 0),
            NombreBiens:    biens.Count,
            TypeBienLabel:  typeVilla.HasValue ? typeVilla.ToString() : "Tous"
        );

        return Ok(dto);
    }

    /// <summary>
    /// Analyse le positionnement prix d'un bien spécifique vs le marché de sa zone.
    /// </summary>
    [HttpGet("analyse-bien/{villaId}")]
    public async Task<IActionResult> AnalyseBien(Guid villaId, CancellationToken ct)
    {
        var villa = await context.Villas
            .Where(v => v.Id == villaId && v.SurfaceHabitable > 0 && v.Prix > 0)
            .FirstOrDefaultAsync(ct);

        if (villa is null) return NotFound();

        // Marché : même quartier + même type, hors ce bien
        var prixM2Marche = await context.Villas
            .Where(v => v.Id != villaId
                     && v.Statut == StatutVilla.Publie
                     && v.Quartier == villa.Quartier
                     && v.TypeVilla == villa.TypeVilla
                     && v.SurfaceHabitable > 0
                     && v.Prix > 0)
            .Select(v => v.Prix / v.SurfaceHabitable)
            .ToListAsync(ct);

        // Fallback : même ville si pas assez de données
        if (prixM2Marche.Count < 2)
        {
            prixM2Marche = await context.Villas
                .Where(v => v.Id != villaId
                         && v.Statut == StatutVilla.Publie
                         && v.Ville == villa.Ville
                         && v.SurfaceHabitable > 0
                         && v.Prix > 0)
                .Select(v => v.Prix / v.SurfaceHabitable)
                .ToListAsync(ct);
        }

        var prixM2Bien = villa.Prix / villa.SurfaceHabitable;

        // Si toujours pas de données comparables → on retourne null
        if (prixM2Marche.Count == 0)
            return Ok(new { insuffisantDonnees = true });

        var moyenneMarche = prixM2Marche.Average();
        var ecart = Math.Round((prixM2Bien - moyenneMarche) / moyenneMarche * 100, 1);

        string badge, label, emoji;
        if (ecart > 12)       { badge = "au_dessus";     label = "Au-dessus du marché";    emoji = "🔴"; }
        else if (ecart < -8)  { badge = "bonne_affaire"; label = "Bonne affaire du marché"; emoji = "🟢"; }
        else                  { badge = "dans_moyenne";  label = "Dans la moyenne";         emoji = "🟡"; }

        return Ok(new AnalysePrixBienDto(
            PrixM2Bien:           Math.Round(prixM2Bien, 0),
            PrixM2Marche:         Math.Round(moyenneMarche, 0),
            EcartPourcentage:     ecart,
            Badge:                badge,
            BadgeLabel:           label,
            BadgeEmoji:           emoji
        ));
    }
}
