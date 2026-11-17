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

        var demande = DemandeVisite.Creer(
            bienId: cmd.BienId,
            utilisateurId: utilisateurId,
            dateSouhaitee: cmd.DateSouhaitee,
            commentaire: cmd.Commentaire);

        await context.DemandesVisite.AddAsync(demande, ct);
        await context.SaveChangesAsync(ct);

        return Created($"/api/demandes-visite/{demande.Id}",
            new DemandeVisiteCreeeDto(
                demande.Id,
                "Votre demande a bien été enregistrée. Nous vous contacterons dans les 24h."));
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
