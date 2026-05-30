using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Interfaces;

public interface ILocationRepository : IRepository<Location>
{
    Task<IEnumerable<Location>> RechercherAsync(string? quartier, string? commune,
        TypeLocationBien? type, decimal? loyerMax, int? nombrePiecesMin,
        CancellationToken ct = default);
}
