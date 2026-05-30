using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Infrastructure.Repositories;

public class LocationRepository(MaMaisonDbContext context) : Repository<Location>(context), ILocationRepository
{
    public async Task<IEnumerable<Location>> RechercherAsync(string? quartier, string? commune,
        TypeLocationBien? type, decimal? loyerMax, int? nombrePiecesMin, CancellationToken ct = default)
    {
        var query = _dbSet.AsNoTracking()
            .Where(l => l.Statut == StatutLocation.Publie && l.EstDisponible);

        if (!string.IsNullOrWhiteSpace(quartier)) query = query.Where(l => l.Quartier.Contains(quartier));
        if (!string.IsNullOrWhiteSpace(commune)) query = query.Where(l => l.Commune.Contains(commune));
        if (type.HasValue) query = query.Where(l => l.TypeBien == type.Value);
        if (loyerMax.HasValue) query = query.Where(l => l.Loyer <= loyerMax.Value);
        if (nombrePiecesMin.HasValue) query = query.Where(l => l.NombrePieces >= nombrePiecesMin.Value);

        return await query.OrderByDescending(l => l.ScoreMaMaison).ToListAsync(ct);
    }
}
