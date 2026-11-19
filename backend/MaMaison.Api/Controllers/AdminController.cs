using MaMaison.Application.Services;
using MaMaison.Domain.Entities;
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
    [HttpPut("biens/{id}/coordonnees")]
    public async Task<IActionResult> CoordonneesBien(Guid id, CoordonneesCommand cmd, CancellationToken ct)
    {
        if (!cmd.Latitude.HasValue || !cmd.Longitude.HasValue) return BadRequest(new { message = "Renseignez les deux coordonnées." });
        try { Coordonnees.Valider(cmd.Latitude.Value, cmd.Longitude.Value); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        if (await context.Villas.FindAsync([id], ct) is { } villa) villa.DefinirCoordonnees(cmd.Latitude.Value, cmd.Longitude.Value);
        else if (await context.Locations.FindAsync([id], ct) is { } location) location.DefinirCoordonnees(cmd.Latitude.Value, cmd.Longitude.Value);
        else if (await context.Terrains.FindAsync([id], ct) is { } terrain) terrain.DefinirCoordonnees(cmd.Latitude.Value, cmd.Longitude.Value);
        else return NotFound();
        await context.SaveChangesAsync(ct);
        return Ok();
    }

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
            .Select(v => new { v.Id, v.Titre, v.Latitude, v.Longitude, v.Quartier, v.Ville, v.Prix, v.Statut, v.ScoreMaMaison, v.DateCreation, NbMedias = v.Medias.Count })
            .ToListAsync(ct);
        return Ok(villas);
    }

    [HttpPut("villas/{id}/publier")]
    public async Task<IActionResult> PublierVilla(Guid id, CancellationToken ct)
    {
        var villa = await context.Villas.Include(v => v.Medias).Include(v => v.PointsVisite).FirstOrDefaultAsync(v => v.Id == id, ct);
        if (villa is null) return NotFound();
        var categories = await context.JustificatifsBien.Where(d => d.BienId == id && d.Valide)
            .Select(d => d.Categorie).Distinct().ToListAsync(ct);
        if (!categories.Contains("Propriete") || !categories.Contains("IdentiteProprietaire"))
            return BadRequest(new { message = "Validez une preuve de propriété et une pièce d'identité du propriétaire avant publication." });
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
            .Select(l => new { l.Id, l.Titre, l.Latitude, l.Longitude, l.Quartier, l.Commune, l.Loyer, l.Statut, l.ScoreMaMaison, l.DateCreation,
                TitulaireIdentifie = l.ProprietaireId != null, l.MotifRejet,
                DeposantNom = context.Utilisateurs.Where(u => u.Id == l.DeposantId).Select(u => u.Nom).FirstOrDefault(),
                ProprietaireNom = context.Utilisateurs.Where(u => u.Id == l.ProprietaireId).Select(u => u.Nom).FirstOrDefault(),
                ResponsableNom = context.Utilisateurs.Where(u => u.Id == l.ResponsableVisitesId).Select(u => u.Nom).FirstOrDefault() })
            .ToListAsync(ct);
        return Ok(locations);
    }

    [HttpPut("locations/{id}/valider")]
    public async Task<IActionResult> ValiderLocation(Guid id, CancellationToken ct)
    {
        var location = await context.Locations.Include(l => l.Medias).FirstOrDefaultAsync(l => l.Id == id, ct);
        if (location is null) return NotFound();
        if (location.Statut != StatutLocation.EnVerification || location.ProprietaireId is null)
            return BadRequest(new { message = "Le dossier doit être soumis et son propriétaire identifié." });
        var categories = await context.JustificatifsBien.Where(d => d.BienId == id && d.Valide)
            .Select(d => d.Categorie).Distinct().ToListAsync(ct);
        if (!categories.Contains("Propriete") || !categories.Contains("IdentiteProprietaire"))
            return BadRequest(new { message = "Validez une preuve de propriété et une pièce d'identité du propriétaire avant publication." });
        location.Publier();
        var score = ScoreMaMaisonService.CalculerLocation(location, 0, 0);
        // Score appliqué directement sur la propriété
        location.MettreAJourScore(score);
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Location publiée.", score });
    }

    [HttpPut("locations/{id}/rejeter")]
    public async Task<IActionResult> RejeterLocation(Guid id, [FromBody] string? raison, CancellationToken ct)
    {
        var location = await context.Locations.FindAsync([id], ct);
        if (location is null) return NotFound();
        if (string.IsNullOrWhiteSpace(raison) || raison.Length > 1000) return BadRequest(new { message = "Un motif est requis (1000 caractères maximum)." });
        location.Rejeter(raison.Trim());
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Location rejetée." });
    }

    // ── Demandes de visite ───────────────────────────────────────
    [HttpGet("demandes")]
    public async Task<IActionResult> GetDemandes(CancellationToken ct)
    {
        var demandes = await (
            from d in context.DemandesVisite.AsNoTracking()
            join u in context.Utilisateurs on d.UtilisateurId equals u.Id into utilisateurs
            from u in utilisateurs.DefaultIfEmpty()
            orderby d.DateCreation descending
            select new
            {
                d.Id, d.BienId, d.Statut, d.DateSouhaitee, d.Commentaire, d.DateCreation, d.Reponse,
                Nature = d.Nature ?? (d.BienId == Guid.Empty ? "contact" : "historique"),
                Location = context.Locations.Any(l => l.Id == d.BienId),
                Titre = context.Locations.Where(l => l.Id == d.BienId).Select(l => l.Titre).FirstOrDefault()
                    ?? context.Villas.Where(v => v.Id == d.BienId).Select(v => v.Titre).FirstOrDefault()
                    ?? context.Terrains.Where(t => t.Id == d.BienId).Select(t => t.Titre).FirstOrDefault(),
                Nom = u == null ? null : u.Nom,
                Telephone = u == null ? null : u.Telephone
            })
            .ToListAsync(ct);
        return Ok(demandes);
    }

    [HttpPut("demandes/{id}/confirmer")]
    public async Task<IActionResult> ConfirmerDemande(Guid id, CancellationToken ct)
    {
        var demande = await context.DemandesVisite.FindAsync([id], ct);
        if (demande is null) return NotFound();
        if (demande.Statut != StatutDemandeVisite.EnAttente || demande.Nature is not ("visite" or "3d")
            || (demande.Nature == "visite" && await context.Locations.AnyAsync(l => l.Id == demande.BienId, ct))) return Conflict();
        demande.Confirmer();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Demande confirmée." });
    }

    [HttpPut("demandes/{id}/repondre")]
    public async Task<IActionResult> Repondre(Guid id, [FromBody] string texte, CancellationToken ct)
    {
        var d = await context.DemandesVisite.FindAsync([id], ct);
        if (d is null) return NotFound();
        if (d.Statut != StatutDemandeVisite.EnAttente || d.Nature is "visite" or "3d") return Conflict();
        if (string.IsNullOrWhiteSpace(texte) || texte.Length > 1000) return BadRequest();
        d.Repondre(texte.Trim());
        await context.SaveChangesAsync(ct);
        return NoContent();
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

public record CoordonneesCommand(double? Latitude, double? Longitude);
