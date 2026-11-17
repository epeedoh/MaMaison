using System.Security.Claims;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DemarcheursController(MaMaisonDbContext context) : ControllerBase
{
    /// <summary>Inscription d'un démarcheur (feature flag: AllowBrokerRegistration)</summary>
    [HttpPost("inscrire")]
    [Authorize(Roles = "Demarcheur,Admin,SuperAdmin")]
    public async Task<IActionResult> Inscrire(
        [FromBody] InscrireDemarcheurCommand cmd,
        CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated != true
            || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var utilisateurId)
            || utilisateurId == Guid.Empty)
            return Unauthorized();
        if (!await context.Utilisateurs.AnyAsync(u => u.Id == utilisateurId && u.EstActif, ct))
            return Unauthorized();
        if (await context.Demarcheurs.AnyAsync(d => d.UtilisateurId == utilisateurId || d.Telephone == cmd.Telephone, ct))
            return Conflict(new { message = "Ce compte ou numéro est déjà enregistré." });

        var d = Demarcheur.Creer(utilisateurId, cmd.Nom, cmd.Telephone, cmd.ZoneActivite);
        await context.Demarcheurs.AddAsync(d, ct);
        await context.SaveChangesAsync(ct);
        return Created("", new { id = d.Id, message = "Demande d'inscription reçue. Vérification en cours." });
    }

    /// <summary>Soumettre une opportunité immobilière (pas de publication directe)</summary>
    [Authorize(Roles = "Demarcheur,Admin,SuperAdmin")]
    [HttpPost("{id}/soumettre-opportunite")]
    public async Task<IActionResult> SoumettreOpportunite(
        Guid id,
        [FromBody] OpportuniteCommand cmd,
        CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated != true
            || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var utilisateurId)
            || utilisateurId == Guid.Empty)
            return Unauthorized();

        var demarcheur = await context.Demarcheurs.FindAsync([id], ct);
        if (demarcheur is null) return NotFound();
        if (!User.IsInRole("Admin") && !User.IsInRole("SuperAdmin")
            && demarcheur.UtilisateurId != utilisateurId)
            return Forbid();
        if (demarcheur.Statut == StatutDemarcheur.Suspendu)
            return Forbid();

        Location loc;
        try
        {
            loc = Location.Creer(
                demarcheur.UtilisateurId, cmd.Titre, cmd.TypeBien,
                cmd.Quartier, cmd.Commune, cmd.NombrePieces,
                cmd.Loyer, cmd.Caution, cmd.Avance, 0m);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        // Reste en brouillon pour validation admin
        demarcheur.EnregistrerSoumission();
        await context.Locations.AddAsync(loc, ct);
        await context.SaveChangesAsync(ct);

        return Ok(new {
            message = "Opportunité soumise. MaMaison va vérifier et vous recontactera.",
            locationId = loc.Id,
            statut = "EnVerification"
        });
    }

    // ── Admin ──────────────────────────────────────────────────
    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Lister(CancellationToken ct)
    {
        var list = await context.Demarcheurs
            .OrderByDescending(d => d.DateCreation)
            .Select(d => new {
                d.Id, d.Nom, d.Telephone, d.ZoneActivite,
                d.Statut, d.ScoreFiabilite,
                d.NombreSoumissions, d.NombreSignalements, d.DateCreation
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPut("{id}/verifier")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Verifier(Guid id, [FromBody] string cniUrl, CancellationToken ct)
    {
        var d = await context.Demarcheurs.FindAsync([id], ct);
        if (d is null) return NotFound();
        d.Verifier(cniUrl);
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Démarcheur vérifié." });
    }

    [HttpPut("{id}/suspendre")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Suspendre(Guid id, CancellationToken ct)
    {
        var d = await context.Demarcheurs.FindAsync([id], ct);
        if (d is null) return NotFound();
        d.Suspendre();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Démarcheur suspendu." });
    }
}

public record InscrireDemarcheurCommand(string Nom, string Telephone, string ZoneActivite);
public record OpportuniteCommand(
    string Titre, TypeLocationBien TypeBien,
    string Quartier, string Commune, int NombrePieces,
    decimal Loyer, decimal Caution, decimal Avance);
