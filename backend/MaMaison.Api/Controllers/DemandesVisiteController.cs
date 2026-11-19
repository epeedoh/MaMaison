using System.Security.Claims;
using MaMaison.Application.Features.Visites;
using MaMaison.Domain.Entities;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DemandesVisiteController(MaMaisonDbContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Soumettre(
        [FromBody] SoumettreDemandeVisiteCommand cmd,
        CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated != true
            || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var utilisateurId)
            || utilisateurId == Guid.Empty)
            return Unauthorized();
        if (!await context.Utilisateurs.AnyAsync(u => u.Id == utilisateurId && u.EstActif, ct))
            return Unauthorized();

        // Older clients did not distinguish a callback from a visit.
        var nature = cmd.Nature ?? (cmd.BienId == Guid.Empty ? "contact" : "historique");
        if (nature is not ("contact" or "rappel" or "visite" or "3d" or "historique")
            || (nature == "contact") != (cmd.BienId == Guid.Empty)
            || (nature is "contact" or "rappel" && cmd.DateSouhaitee.HasValue))
            return BadRequest(new { message = "Objet de la demande invalide." });
        if (nature != "contact" && !await context.Locations.AnyAsync(l => l.Id == cmd.BienId && l.EstDisponible && l.Statut == MaMaison.Domain.Enums.StatutLocation.Publie, ct)
            && !await context.Villas.AnyAsync(v => v.Id == cmd.BienId && v.Statut == MaMaison.Domain.Enums.StatutVilla.Publie, ct)
            && !(await context.ParametresPlateforme.AnyAsync(p => p.Cle == "terrains" && p.Actif, ct)
                 && await context.Terrains.AnyAsync(t => t.Id == cmd.BienId && t.Statut == MaMaison.Domain.Enums.StatutTerrain.Publie, ct)))
            return NotFound();
        var demande = DemandeVisite.Creer(
            bienId: cmd.BienId,
            utilisateurId: utilisateurId,
            dateSouhaitee: cmd.DateSouhaitee,
            commentaire: cmd.Commentaire, nature: nature);

        await context.DemandesVisite.AddAsync(demande, ct);
        await context.SaveChangesAsync(ct);

        return Created($"/api/demandes-visite/{demande.Id}",
            new DemandeVisiteCreeeDto(
                demande.Id,
                "Votre demande a été enregistrée."));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Lister(CancellationToken ct)
    {
        var demandes = await (
            from d in context.DemandesVisite.AsNoTracking()
            join u in context.Utilisateurs on d.UtilisateurId equals u.Id into utilisateurs
            from u in utilisateurs.DefaultIfEmpty()
            orderby d.DateCreation descending
            select new
            {
                d.Id,
                d.BienId,
                d.Statut,
                d.DateSouhaitee,
                d.Commentaire,
                d.DateCreation,
                Nom = u == null ? null : u.Nom,
                Telephone = u == null ? null : u.Telephone
            })
            .ToListAsync(ct);

        return Ok(demandes);
    }
}
