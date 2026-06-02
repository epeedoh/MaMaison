using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/admin/terrains")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class TerrainsAdminController(MaMaisonDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Lister(CancellationToken ct)
    {
        var terrains = await context.Terrains
            .Include(t => t.Documents)
            .OrderByDescending(t => t.DateCreation)
            .Select(t => new {
                t.Id, t.Titre, t.Commune, t.Surface, t.Prix,
                t.Statut, t.NiveauVerification, t.ScoreMaMaison,
                t.DateCreation, NbDocuments = t.Documents.Count
            })
            .ToListAsync(ct);
        return Ok(terrains);
    }

    [HttpPost]
    public async Task<IActionResult> Creer([FromBody] CreerTerrainCommand cmd, CancellationToken ct)
    {
        var terrain = Terrain.Creer(
            cmd.Titre, cmd.Localisation, cmd.Commune,
            cmd.Surface, cmd.Prix, cmd.Usage);

        if (cmd.Latitude.HasValue && cmd.Longitude.HasValue)
            terrain.DefinirCoordonnees(cmd.Latitude.Value, cmd.Longitude.Value);

        if (!string.IsNullOrWhiteSpace(cmd.Description))
            terrain.GetType().GetProperty("Description")!
                .SetValue(terrain, cmd.Description);

        terrain.GetType().GetProperty("Quartier")!
            .SetValue(terrain, cmd.Quartier);
        terrain.GetType().GetProperty("TypeDocument")!
            .SetValue(terrain, cmd.TypeDocument);

        await context.Terrains.AddAsync(terrain, ct);
        await context.SaveChangesAsync(ct);
        return Created($"/api/terrains/{terrain.Id}", new { id = terrain.Id });
    }

    [HttpPut("{id}/publier")]
    public async Task<IActionResult> Publier(Guid id, CancellationToken ct)
    {
        var terrain = await context.Terrains
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (terrain is null) return NotFound();
        terrain.Publier();
        // Recalcule niveau vérification selon documents
        RecalculerNiveau(terrain);
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Terrain publié.", niveau = terrain.NiveauVerification });
    }

    [HttpPut("{id}/suspendre")]
    public async Task<IActionResult> Suspendre(Guid id, CancellationToken ct)
    {
        var terrain = await context.Terrains.FindAsync([id], ct);
        if (terrain is null) return NotFound();
        terrain.Suspendre();
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Terrain suspendu." });
    }

    [HttpPost("{id}/documents")]
    public async Task<IActionResult> AjouterDocument(
        Guid id, [FromBody] AjouterDocumentCommand cmd, CancellationToken ct)
    {
        var terrain = await context.Terrains
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.Id == id, ct);
        if (terrain is null) return NotFound();

        var doc = DocumentVerification.Creer(id, cmd.TypeDocument, cmd.Url);
        doc.Valider("Validé par l'équipe MaMaison");

        await context.DocumentsVerification.AddAsync(doc, ct);
        RecalculerNiveau(terrain);
        await context.SaveChangesAsync(ct);
        return Ok(new { message = "Document ajouté.", niveau = terrain.NiveauVerification });
    }

    // Calcul automatique du niveau selon les documents présents
    private static void RecalculerNiveau(Terrain terrain)
    {
        var nbDocs = terrain.Documents.Count(d => d.StatutValidation == StatutValidationDocument.Valide);
        var niveau = terrain.Latitude.HasValue && terrain.Longitude.HasValue
            ? NiveauVerificationTerrain.Niveau2
            : NiveauVerificationTerrain.Niveau1;

        if (nbDocs >= 1) niveau = NiveauVerificationTerrain.Niveau3;
        if (nbDocs >= 2) niveau = NiveauVerificationTerrain.Niveau4;
        if (nbDocs >= 3) niveau = NiveauVerificationTerrain.Niveau5;

        terrain.EleveNiveauVerification(niveau);
    }
}

public record CreerTerrainCommand(
    string Titre,
    string Localisation,
    string Commune,
    string? Quartier,
    decimal Surface,
    decimal Prix,
    UsageTerrain Usage,
    double? Latitude,
    double? Longitude,
    string? TypeDocument,
    string? Description
);

public record AjouterDocumentCommand(string TypeDocument, string Url);
