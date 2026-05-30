using MaMaison.Application.Features.Visites;
using MaMaison.Domain.Entities;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DemandesVisiteController(MaMaisonDbContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Soumettre(
        [FromBody] SoumettreDemandeVisiteCommand cmd,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Nom))
            return BadRequest(new { message = "Le nom est requis." });

        if (string.IsNullOrWhiteSpace(cmd.Telephone))
            return BadRequest(new { message = "Le téléphone est requis." });

        var utilisateurId = Guid.NewGuid();

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
    public async Task<IActionResult> Lister(CancellationToken ct)
    {
        var demandes = await context.DemandesVisite
            .OrderByDescending(d => d.DateCreation)
            .Select(d => new
            {
                d.Id,
                d.BienId,
                d.Statut,
                d.DateSouhaitee,
                d.Commentaire,
                d.DateCreation
            })
            .ToListAsync(ct);

        return Ok(demandes);
    }
}
