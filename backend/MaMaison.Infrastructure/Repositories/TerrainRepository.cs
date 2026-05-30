using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Infrastructure.Repositories;

public class TerrainRepository(MaMaisonDbContext context) : Repository<Terrain>(context), ITerrainRepository
{
    public async Task<IEnumerable<Terrain>> RechercherAsync(string? commune, UsageTerrain? usage,
        decimal? surfaceMin, decimal? prixMax, CancellationToken ct = default)
    {
        var query = _dbSet.AsNoTracking()
            .Where(t => t.Statut == StatutTerrain.Publie);

        if (!string.IsNullOrWhiteSpace(commune)) query = query.Where(t => t.Commune.Contains(commune));
        if (usage.HasValue) query = query.Where(t => t.Usage == usage.Value);
        if (surfaceMin.HasValue) query = query.Where(t => t.Surface >= surfaceMin.Value);
        if (prixMax.HasValue) query = query.Where(t => t.Prix <= prixMax.Value);

        return await query.OrderBy(t => t.Prix).ToListAsync(ct);
    }
}
