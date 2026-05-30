using MaMaison.Domain.Common;
using System.Linq.Expressions;

namespace MaMaison.Domain.Interfaces;

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> ObtenirParIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<T>> ObtenirTousAsync(CancellationToken ct = default);
    Task<IEnumerable<T>> RechercherAsync(Expression<Func<T, bool>> predicat, CancellationToken ct = default);
    Task AjouterAsync(T entite, CancellationToken ct = default);
    void Modifier(T entite);
    void Supprimer(T entite);
    Task<int> SauvegarderAsync(CancellationToken ct = default);
}
