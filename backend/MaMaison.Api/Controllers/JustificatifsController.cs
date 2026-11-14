using System.Security.Claims;
using MaMaison.Domain.Entities;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace MaMaison.Api.Controllers;

[ApiController, Authorize, Route("api/biens/{bienId:guid}/justificatifs")]
public class JustificatifsController(MaMaisonDbContext context, IWebHostEnvironment env) : ControllerBase
{
    private string Dossier => Path.Combine(env.ContentRootPath, "App_Data", "justificatifs");
    private bool Admin => User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
    private async Task<bool> Autorise(Guid id, CancellationToken ct)
    {
        if (Admin) return await context.Locations.AnyAsync(b => b.Id == id, ct)
            || await context.Villas.AnyAsync(b => b.Id == id, ct) || await context.Terrains.AnyAsync(b => b.Id == id, ct);
        return Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
            && await context.Locations.AnyAsync(b => b.Id == id && b.ProprietaireId == userId, ct);
    }
    [HttpGet]
    public async Task<IActionResult> Lister(Guid bienId, CancellationToken ct)
    {
        if (!await Autorise(bienId, ct)) return NotFound();
        return Ok(await context.JustificatifsBien.Where(d => d.BienId == bienId)
            .Select(d => new { d.Id, d.Categorie, d.Valide }).ToListAsync(ct));
    }
    [HttpPost, RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Ajouter(Guid bienId, [FromForm] string categorie, IFormFile file, CancellationToken ct)
    {
        if (!await Autorise(bienId, ct)) return NotFound();
        if (categorie is not ("Propriete" or "IdentiteProprietaire")) return BadRequest(new { message = "Catégorie invalide." });
        if (file is null || file.Length == 0 || file.Length > 10 * 1024 * 1024) return BadRequest(new { message = "Fichier requis, maximum 10 Mo." });
        // Vérifier le contenu, sans se fier à l'extension fournie par le client.
        await using var input = file.OpenReadStream();
        var header = new byte[12];
        var count = await input.ReadAsync(header.AsMemory(), ct);
        string? type = count >= 5 && System.Text.Encoding.ASCII.GetString(header, 0, 5) == "%PDF-" ? "application/pdf"
            : count >= 3 && header[0] == 0xff && header[1] == 0xd8 && header[2] == 0xff ? "image/jpeg"
            : count >= 8 && header.Take(8).SequenceEqual(new byte[] {137,80,78,71,13,10,26,10}) ? "image/png" : null;
        if (type is null) return BadRequest(new { message = "Utilisez un PDF, JPEG ou PNG." });
        Directory.CreateDirectory(Dossier);
        var name = Guid.NewGuid().ToString("N");
        var path = Path.Combine(Dossier, name);
        try
        {
            await using (var output = System.IO.File.Create(path))
            {
                await output.WriteAsync(header.AsMemory(0, count), ct);
                await input.CopyToAsync(output, ct);
            }
            var doc = new JustificatifBien { BienId = bienId, Categorie = categorie, Fichier = name, ContentType = type };
            context.JustificatifsBien.Add(doc);
            await context.SaveChangesAsync(ct);
            return Ok(new { doc.Id, doc.Categorie, doc.Valide });
        }
        catch { System.IO.File.Delete(path); throw; }
    }
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Lire(Guid bienId, Guid id, CancellationToken ct)
    {
        if (!await Autorise(bienId, ct)) return NotFound();
        var doc = await context.JustificatifsBien.SingleOrDefaultAsync(d => d.Id == id && d.BienId == bienId, ct);
        if (doc is null || !System.IO.File.Exists(Path.Combine(Dossier, doc.Fichier))) return NotFound();
        return PhysicalFile(Path.Combine(Dossier, doc.Fichier), doc.ContentType, "justificatif" + (doc.ContentType == "application/pdf" ? ".pdf" : doc.ContentType == "image/png" ? ".png" : ".jpg"));
    }
    [Authorize(Roles = "Admin,SuperAdmin"), HttpPut("{id:guid}/valider")]
    public async Task<IActionResult> Valider(Guid bienId, Guid id, CancellationToken ct)
    {
        var doc = await context.JustificatifsBien.SingleOrDefaultAsync(d => d.Id == id && d.BienId == bienId, ct);
        if (doc is null) return NotFound();
        doc.Valide = true;
        await context.SaveChangesAsync(ct);
        return Ok();
    }
}
