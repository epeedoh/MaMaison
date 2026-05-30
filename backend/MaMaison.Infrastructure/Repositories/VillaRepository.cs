using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Infrastructure.Repositories;

public class VillaRepository(MaMaisonDbContext context) : Repository<Villa>(context), IVillaRepository
{
    public async Task<IEnumerable<Villa>> RechercherAsync(TypeVilla? type, string? quartier,
        decimal? prixMax, Guid? promoteurId, CancellationToken ct = default)
    {
        var query = _dbSet.AsNoTracking()
            .Where(v => v.Statut == StatutVilla.Publie);

        if (type.HasValue) query = query.Where(v => v.TypeVilla == type.Value);
        if (!string.IsNullOrWhiteSpace(quartier)) query = query.Where(v => v.Quartier.Contains(quartier));
        if (prixMax.HasValue) query = query.Where(v => v.Prix <= prixMax.Value);
        if (promoteurId.HasValue) query = query.Where(v => v.PromoteurId == promoteurId.Value);

        return await query.OrderBy(v => v.Prix).ToListAsync(ct);
    }

    public async Task<Villa?> ObtenirAvecPointsVisiteAsync(Guid id, CancellationToken ct = default)
        => await _dbSet
            .Include(v => v.PointsVisite)
                .ThenInclude(p => p.Hotspots)
            .Include(v => v.Medias)
            .FirstOrDefaultAsync(v => v.Id == id, ct);
}
