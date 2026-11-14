using MaMaison.Domain.Entities;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace MaMaison.Api.Controllers;
[ApiController, Route("api/fonctionnalites")]
public class FonctionnalitesController(MaMaisonDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Lire(CancellationToken ct) => Ok(new {
        terrainsActifs = await context.ParametresPlateforme.Where(p => p.Cle == "terrains").Select(p => (bool?)p.Actif).SingleOrDefaultAsync(ct) ?? false
    });
    [Authorize(Roles = "Admin,SuperAdmin"), HttpPut("terrains")]
    public async Task<IActionResult> Modifier(ModifierTerrains cmd, CancellationToken ct)
    {
        var param = await context.ParametresPlateforme.FindAsync(["terrains"], ct);
        if (param is null) context.ParametresPlateforme.Add(new() { Cle = "terrains", Actif = cmd.Actif });
        else param.Actif = cmd.Actif;
        await context.SaveChangesAsync(ct);
        return Ok(new { terrainsActifs = cmd.Actif });
    }
}
public record ModifierTerrains(bool Actif);
