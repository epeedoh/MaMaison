using MaMaison.Application.Services;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AdminController(MaMaisonDbContext context) : ControllerBase
{
    // ── Tableau de bord ──────────────────────────────────────────
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct)
    {
        var stats = new
        {
            Villas = new
            {
                Total      = await context.Villas.CountAsync(ct),
                EnValidation = await context.Villas.CountAsync(v => v.Statut == StatutVilla.EnValidation, ct),
                Publiees   = await context.Villas.CountAsync(v => v.Statut == StatutVilla.Publie, ct),
            },
            Locations = new
            {
                Total        = await context.Locations.CountAsync(ct),
                EnVerification = await context.Locations.CountAsync(l => l.Statut == StatutLocation.EnVerification, ct),
                Publiees     = await context.Locations.CountAsync(l => l.Statut == StatutLocation.Publie, ct),
            },
            Terrains = new
            {
                Total    = await context.Terrains.CountAsync(ct),
                Publies  = await context.Terrains.CountAsync(t => t.Statut == StatutTerrain.Publie, ct),
            },
            DemandesVisite = new
            {
                Total     = await context.DemandesVisite.CountAsync(ct),
                EnAttente = await context.DemandesVisite.CountAsync(d => d.Statut == StatutDemandeVisite.EnAttente, ct),
                Confirmees = await context.DemandesVisite.CountAsync(d => d.Statut == StatutDemandeVisite.Confirmee, ct),
            },
            Signalements = new
            {
                Total     = await context.Signalements.CountAsync(ct),
                EnAttente = await context.Signalements.CountAsync(s => s.Statut == StatutSignalement.EnAttente, ct),
            },
            Utilisateurs = await context.Utilisateurs.CountAsync(ct),
        };
        return Ok(stats);
    }

    // ── Gestion Villas ───────────────────────────────────────────
    [HttpGet("villas")]
    public async Task<IActionResult> GetVillas([FromQuery] StatutVilla? statut, CancellationToken ct)
    {
        var query = context.Villas.Include(v => v.Medias).AsQueryable();
        if (statut.HasValue) query = query.Where(v => v.Statut == statut.Value);
        var villas = await query.OrderByDescending(v => v.DateCreation)
            .Select(v => new { v.Id, v.Titre, v.Quartier, v.Ville, v.Prix, v.Statut, v.ScoreMaMaison, v.DateCreation, NbMedias = v.Medias.Count })
            .ToListAsync(ct);
        return Ok(villas);
    }

    [HttpPut("villas/{id}/publier")]
    public async Task<IActionResult> PublierVilla(Guid id, CancellationToken ct)
    {
        var villa = await context.Villas.Include(v => v.Medias).Include(v => v.PointsVisite).FirstOrDefaultAsync(v => v.Id == id, ct);
        if (villa is null) return NotFound();
        villa.Publier();
        // Recalcule le score
        var score = ScoreMaMaisonService.CalculerVilla(villa, 0, villa.PointsVisite.Count > 0);
        villa.MettreAJourScore(score);
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Villa publiée.", score });
    }

    [HttpPut("villas/{id}/suspendre")]
    public async Task<IActionResult> SuspendreVilla(Guid id, CancellationToken ct)
    {
        var villa = await context.Villas.FindAsync([id], ct);
        if (villa is null) return NotFound();
        villa.Suspendre();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Villa suspendue." });
    }

    // ── Gestion Locations ────────────────────────────────────────
    [HttpGet("locations")]
    public async Task<IActionResult> GetLocations([FromQuery] StatutLocation? statut, CancellationToken ct)
    {
        var query = context.Locations.AsQueryable();
        if (statut.HasValue) query = query.Where(l => l.Statut == statut.Value);
        var locations = await query.OrderByDescending(l => l.DateCreation)
            .Select(l => new { l.Id, l.Titre, l.Quartier, l.Commune, l.Loyer, l.Statut, l.ScoreMaMaison, l.DateCreation })
            .ToListAsync(ct);
        return Ok(locations);
    }

    [HttpPut("locations/{id}/valider")]
    public async Task<IActionResult> ValiderLocation(Guid id, CancellationToken ct)
    {
        var location = await context.Locations.Include(l => l.Medias).FirstOrDefaultAsync(l => l.Id == id, ct);
        if (location is null) return NotFound();
        location.Publier();
        var score = ScoreMaMaisonService.CalculerLocation(location, 0, 0);
        location.MettreAJourScore(score);
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Location publiée.", score });
    }

    [HttpPut("locations/{id}/rejeter")]
    public async Task<IActionResult> RejeterLocation(Guid id, [FromBody] string? raison, CancellationToken ct)
    {
        var location = await context.Locations.FindAsync([id], ct);
        if (location is null) return NotFound();
        location.Rejeter();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Location rejetée." });
    }

    // ── Demandes de visite ───────────────────────────────────────
    [HttpGet("demandes")]
    public async Task<IActionResult> GetDemandes(CancellationToken ct)
    {
        var demandes = await context.DemandesVisite
            .OrderByDescending(d => d.DateCreation)
            .Select(d => new { d.Id, d.BienId, d.Statut, d.DateSouhaitee, d.Commentaire, d.DateCreation })
            .ToListAsync(ct);
        return Ok(demandes);
    }

    [HttpPut("demandes/{id}/confirmer")]
    public async Task<IActionResult> ConfirmerDemande(Guid id, CancellationToken ct)
    {
        var demande = await context.DemandesVisite.FindAsync([id], ct);
        if (demande is null) return NotFound();
        demande.Confirmer();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Demande confirmée." });
    }

    // ── Signalements ─────────────────────────────────────────────
    [HttpGet("signalements")]
    public async Task<IActionResult> GetSignalements(CancellationToken ct)
    {
        var signalements = await context.Signalements
            .Where(s => s.Statut == StatutSignalement.EnAttente)
            .OrderByDescending(s => s.DateCreation)
            .Select(s => new { s.Id, s.BienId, s.Motif, s.Description, s.Statut, s.DateCreation })
            .ToListAsync(ct);
        return Ok(signalements);
    }

    [HttpPut("signalements/{id}/resoudre")]
    public async Task<IActionResult> ResoudreSignalement(Guid id, CancellationToken ct)
    {
        var sig = await context.Signalements.FindAsync([id], ct);
        if (sig is null) return NotFound();
        sig.Resoudre();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Signalement résolu." });
    }
}
