using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Interfaces;

public interface IVillaRepository : IRepository<Villa>
{
    Task<IEnumerable<Villa>> RechercherAsync(TypeVilla? type, string? quartier,
        decimal? prixMax, Guid? promoteurId, CancellationToken ct = default);
    Task<Villa?> ObtenirAvecPointsVisiteAsync(Guid id, CancellationToken ct = default);
}
