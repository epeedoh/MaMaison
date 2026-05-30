using MaMaison.Domain.Common;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace MaMaison.Infrastructure.Repositories;

public class Repository<T>(MaMaisonDbContext context) : IRepository<T> where T : BaseEntity
{
    protected readonly DbSet<T> _dbSet = context.Set<T>();
    private readonly MaMaisonDbContext _context = context;

    public async Task<T?> ObtenirParIdAsync(Guid id, CancellationToken ct = default)
        => await _dbSet.FindAsync([id], ct);

    public async Task<IEnumerable<T>> ObtenirTousAsync(CancellationToken ct = default)
        => await _dbSet.AsNoTracking().ToListAsync(ct);

    public async Task<IEnumerable<T>> RechercherAsync(Expression<Func<T, bool>> predicat, CancellationToken ct = default)
        => await _dbSet.AsNoTracking().Where(predicat).ToListAsync(ct);

    public async Task AjouterAsync(T entite, CancellationToken ct = default)
        => await _dbSet.AddAsync(entite, ct);

    public void Modifier(T entite) => _dbSet.Update(entite);

    public void Supprimer(T entite) => _dbSet.Remove(entite);

    public async Task<int> SauvegarderAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
