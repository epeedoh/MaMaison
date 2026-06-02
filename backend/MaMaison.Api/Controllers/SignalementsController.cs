using MaMaison.Domain.Entities;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

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
        if (string.IsNullOrWhiteSpace(cmd.Motif))
            return BadRequest(new { message = "Le motif est requis." });

        var sig = Signalement.Creer(
            cmd.BienId,
            Guid.NewGuid(), // utilisateur anonyme si non connecté
            cmd.Motif,
            cmd.Description);

        await context.Signalements.AddAsync(sig, ct);
        await context.SaveChangesAsync(ct);

        return Created("", new { message = "Signalement enregistré. Merci de votre vigilance." });
    }
}

public record SignalementCommand(Guid BienId, string Motif, string? Description);
