using MaMaison.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Infrastructure.Data;

public class MaMaisonDbContext(DbContextOptions<MaMaisonDbContext> options) : DbContext(options)
{
    public DbSet<Utilisateur> Utilisateurs => Set<Utilisateur>();
    public DbSet<Promoteur> Promoteurs => Set<Promoteur>();
    public DbSet<Villa> Villas => Set<Villa>();
    public DbSet<PointVisite3D> PointsVisite3D => Set<PointVisite3D>();
    public DbSet<HotspotVisite> HotspotsVisite => Set<HotspotVisite>();
    public DbSet<MediaBien> MediasBien => Set<MediaBien>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Terrain> Terrains => Set<Terrain>();
    public DbSet<Demarcheur> Demarcheurs => Set<Demarcheur>();
    public DbSet<DocumentVerification> DocumentsVerification => Set<DocumentVerification>();
    public DbSet<DemandeVisite> DemandesVisite => Set<DemandeVisite>();
    public DbSet<Signalement> Signalements => Set<Signalement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MaMaisonDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
