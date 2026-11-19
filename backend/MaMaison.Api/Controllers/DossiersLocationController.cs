using System.Security.Claims;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController, Authorize, Route("api/dossiers-location/{id:guid}")]
public class DossiersLocationController(MaMaisonDbContext db) : ControllerBase
{
    private Guid Moi => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private Task<Location?> Dossier(Guid id, CancellationToken ct) =>
        db.Locations.SingleOrDefaultAsync(l => l.Id == id && (l.DeposantId == Moi || l.ProprietaireId == Moi), ct);
    private IQueryable<Location> Geres(Guid id) => db.Locations.Where(l => l.Id == id && l.ResponsableVisitesId == Moi
        && l.Statut == StatutLocation.Publie && l.EstDisponible && db.Utilisateurs.Any(u => u.Id == Moi && u.EstActif)
        && !db.Demarcheurs.Any(d => d.UtilisateurId == Moi && d.Statut == StatutDemarcheur.Suspendu));

    [HttpPut("corriger")]
    public async Task<IActionResult> Corriger(Guid id, CorrectionLocation c, CancellationToken ct)
    {
        var l = await Dossier(id, ct);
        if (l is null) return NotFound();
        if (l.Statut is not (StatutLocation.Rejete or StatutLocation.Brouillon)) return Conflict();
        if (string.IsNullOrWhiteSpace(c.Titre) || c.Titre.Length > 200 || string.IsNullOrWhiteSpace(c.Quartier)
            || c.Quartier.Length > 100 || string.IsNullOrWhiteSpace(c.Commune) || c.Commune.Length > 100
            || c.Pieces < 1 || c.Loyer <= 0 || c.Caution < 0 || c.Avance < 0 || c.Frais < 0)
            return BadRequest(new { message = "Vérifiez les champs de la location." });
        l.Corriger(c.Titre, c.Quartier, c.Commune, c.Pieces, c.Loyer, c.Caution, c.Avance, c.Frais);
        return await Sauver(ct);
    }

    [HttpPut("proprietaire"), Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Identifier(Guid id, CompteLocation c, CancellationToken ct)
    {
        var l = await db.Locations.FindAsync([id], ct);
        if (l is null) return NotFound();
        if (l.ProprietaireId.HasValue) return Conflict(new { message = "Un titulaire est déjà identifié." });
        var preuves = await db.JustificatifsBien.Where(d => d.BienId == id && d.Valide).Select(d => d.Categorie).Distinct().ToListAsync(ct);
        if (!preuves.Contains("Propriete") || !preuves.Contains("IdentiteProprietaire"))
            return BadRequest(new { message = "Vérifiez les deux justificatifs et leur correspondance avec le titulaire." });
        var titulaire = await db.Utilisateurs.SingleOrDefaultAsync(u => u.EstActif && u.Telephone == c.Telephone && u.Role == RoleUtilisateur.Proprietaire, ct);
        if (titulaire is null) return BadRequest(new { message = "Compte propriétaire actif requis." });
        l.IdentifierProprietaire(titulaire.Id);
        return await Sauver(ct);
    }

    [HttpPut("responsable")]
    public async Task<IActionResult> Deleguer(Guid id, CompteLocation c, CancellationToken ct)
    {
        var l = await db.Locations.SingleOrDefaultAsync(x => x.Id == id && x.ProprietaireId == Moi, ct);
        if (l is null) return NotFound();
        var cible = Moi;
        if (!string.IsNullOrWhiteSpace(c.Telephone))
        {
            var u = await db.Utilisateurs.SingleOrDefaultAsync(x => x.EstActif && x.Telephone == c.Telephone, ct);
            if (u is null || (u.Role != RoleUtilisateur.AgentImmobilier && !(u.Role == RoleUtilisateur.Demarcheur
                && await db.Demarcheurs.AnyAsync(d => d.UtilisateurId == u.Id && (d.Statut == StatutDemarcheur.Verifie || d.Statut == StatutDemarcheur.Certifie), ct))))
                return BadRequest(new { message = "Choisissez un agent actif ou un démarcheur vérifié." });
            cible = u.Id;
        }
        l.DeleguerVisites(cible);
        return await Sauver(ct);
    }

    [HttpGet("visites")]
    public async Task<IActionResult> Visites(Guid id, CancellationToken ct)
    {
        if (!await Geres(id).AnyAsync(ct)) return NotFound();
        return Ok(await (from l in Geres(id) join d in db.DemandesVisite on l.Id equals d.BienId
            where d.Nature == "visite" orderby d.DateCreation descending
            select new { d.Id, d.DateSouhaitee, d.Commentaire, d.Statut, d.DateConfirmee }).ToListAsync(ct));
    }

    [HttpPut("visites/{demandeId:guid}/confirmer")]
    public async Task<IActionResult> Confirmer(Guid id, Guid demandeId, Creneau c, CancellationToken ct)
    {
        var demande = await (from l in Geres(id) join d in db.DemandesVisite on l.Id equals d.BienId
            where d.Id == demandeId && d.Nature == "visite" select d).SingleOrDefaultAsync(ct);
        if (demande is null) return NotFound();
        if (demande.Statut != StatutDemandeVisite.EnAttente) return Conflict();
        if (c.Date <= DateTimeOffset.UtcNow) return BadRequest(new { message = "Choisissez un créneau futur." });
        demande.Confirmer(c.Date.UtcDateTime);
        return await Sauver(ct);
    }

    private async Task<IActionResult> Sauver(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); return NoContent(); }
        catch (DbUpdateConcurrencyException) { return Conflict(new { message = "Dossier modifié, actualisez-le." }); }
    }
}

public record CompteLocation(string? Telephone);
public record Creneau(DateTimeOffset Date);
public record CorrectionLocation(string Titre, string Quartier, string Commune, int Pieces, decimal Loyer, decimal Caution, decimal Avance, decimal Frais);
