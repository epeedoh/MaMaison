using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Interfaces;

public interface ITerrainRepository : IRepository<Terrain>
{
    Task<IEnumerable<Terrain>> RechercherAsync(string? commune, UsageTerrain? usage,
        decimal? surfaceMin, decimal? prixMax, CancellationToken ct = default);
}
