using System.Security.Claims;
using MaMaison.Domain.Entities;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SignalementsController(MaMaisonDbContext context) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Signaler(
        [FromBody] SignalementCommand cmd,
        CancellationToken ct)
    {
        var utilisateurId = Guid.NewGuid();
        if (User.Identity?.IsAuthenticated == true)
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out utilisateurId)
                || utilisateurId == Guid.Empty)
                return Unauthorized();
            if (!await context.Utilisateurs.AnyAsync(u => u.Id == utilisateurId && u.EstActif, ct))
                return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(cmd.Motif))
            return BadRequest(new { message = "Le motif est requis." });

        var sig = Signalement.Creer(
            cmd.BienId,
            utilisateurId,
            cmd.Motif,
            cmd.Description);

        await context.Signalements.AddAsync(sig, ct);
        await context.SaveChangesAsync(ct);

        return Created("", new { message = "Signalement enregistré. Merci de votre vigilance." });
    }
}

public record SignalementCommand(Guid BienId, string Motif, string? Description);
