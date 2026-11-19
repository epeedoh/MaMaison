using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfilController(MaMaisonDbContext context) : ControllerBase
{
    private Guid UtilisateurId => Guid.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetProfil(CancellationToken ct)
    {
        var user = await context.Utilisateurs
            .Where(u => u.Id == UtilisateurId)
            .Select(u => new { u.Id, u.Nom, u.Telephone, u.Email, u.Role, u.TelephoneVerifie, u.DateCreation })
            .FirstOrDefaultAsync(ct);

        if (user is null) return NotFound();
        return Ok(user);
    }

    [HttpPatch]
    public async Task<IActionResult> MettreAJour(
        [FromBody] MettreAJourProfilCommand cmd,
        CancellationToken ct)
    {
        var user = await context.Utilisateurs.FindAsync([UtilisateurId], ct);
        if (user is null) return NotFound();

        // Mise à jour via reflection minimale (les setters sont privés dans Domain)
        // On passe par EF tracking pour modifier les colonnes directement
        if (!string.IsNullOrWhiteSpace(cmd.Nom))
        {
            context.Entry(user).Property("Nom").CurrentValue = cmd.Nom.Trim();
        }
        if (!string.IsNullOrWhiteSpace(cmd.Email))
        {
            context.Entry(user).Property("Email").CurrentValue = cmd.Email.Trim();
        }

        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Profil mis à jour.", nom = cmd.Nom, email = cmd.Email });
    }

    [HttpGet("demandes")]
    public async Task<IActionResult> MesDemandes(CancellationToken ct)
    {
        var demandes = await context.DemandesVisite
            .Where(d => d.UtilisateurId == UtilisateurId)
            .OrderByDescending(d => d.DateCreation)
            .Select(d => new { d.Id, d.BienId, d.Statut, d.DateSouhaitee, d.DateConfirmee, d.Commentaire, d.DateCreation, d.Reponse,
                Nature = d.Nature ?? (d.BienId == Guid.Empty ? "contact" : "historique"),
                Titre = context.Locations.Where(l => l.Id == d.BienId).Select(l => l.Titre).FirstOrDefault()
                    ?? context.Villas.Where(v => v.Id == d.BienId).Select(v => v.Titre).FirstOrDefault()
                    ?? context.Terrains.Where(t => t.Id == d.BienId).Select(t => t.Titre).FirstOrDefault() })
            .ToListAsync(ct);
        return Ok(demandes);
    }

    [HttpGet("locations")]
    public async Task<IActionResult> MesLocations(CancellationToken ct)
    {
        var locations = await context.Locations
            .Where(l => l.ProprietaireId == UtilisateurId || l.DeposantId == UtilisateurId || l.ResponsableVisitesId == UtilisateurId)
            .OrderByDescending(l => l.DateCreation)
            .Select(l => new { l.Id, l.Titre, l.Quartier, l.Commune, l.Loyer, l.Statut, l.ScoreMaMaison, l.DateCreation,
                l.NombrePieces, l.Caution, l.Avance, l.FraisAgence,
                MotifRejet = l.DeposantId == UtilisateurId || l.ProprietaireId == UtilisateurId ? l.MotifRejet : null,
                Deposant = l.DeposantId == UtilisateurId, Proprietaire = l.ProprietaireId == UtilisateurId,
                Responsable = l.ResponsableVisitesId == UtilisateurId, TitulaireIdentifie = l.ProprietaireId != null,
                ResponsableNom = context.Utilisateurs.Where(u => u.Id == l.ResponsableVisitesId).Select(u => u.Nom).FirstOrDefault() })
            .ToListAsync(ct);
        return Ok(locations);
    }

    [HttpGet("signalements")]
    public async Task<IActionResult> MesSignalements(CancellationToken ct)
    {
        var sig = await context.Signalements
            .Where(s => s.UtilisateurId == UtilisateurId)
            .OrderByDescending(s => s.DateCreation)
            .Select(s => new { s.Id, s.BienId, s.Motif, s.Statut, s.DateCreation })
            .ToListAsync(ct);
        return Ok(sig);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> MesStats(CancellationToken ct)
    {
        var userId = UtilisateurId;
        return Ok(new {
            NbDemandes     = await context.DemandesVisite.CountAsync(d => d.UtilisateurId == userId, ct),
            NbLocations    = await context.Locations.CountAsync(l => l.ProprietaireId == userId || l.DeposantId == userId || l.ResponsableVisitesId == userId, ct),
            NbSignalements = await context.Signalements.CountAsync(s => s.UtilisateurId == userId, ct),
        });
    }
}

public record MettreAJourProfilCommand(string? Nom, string? Email);
