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

    public DbSet<ParametrePlateforme> ParametresPlateforme => Set<ParametrePlateforme>();
    public DbSet<JustificatifBien> JustificatifsBien => Set<JustificatifBien>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ParametrePlateforme>().HasKey(p => p.Cle);
        modelBuilder.Entity<ParametrePlateforme>().Property(p => p.Cle).HasMaxLength(100);
        modelBuilder.Entity<JustificatifBien>().HasIndex(d => d.BienId);
        // SQL datetime2 does not preserve the UTC kind of the confirmed appointment.
        modelBuilder.Entity<DemandeVisite>().Property(d => d.DateConfirmee)
            .HasConversion(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : (DateTime?)null);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MaMaisonDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
