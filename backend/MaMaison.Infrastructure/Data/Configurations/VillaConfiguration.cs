using MaMaison.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MaMaison.Infrastructure.Data.Configurations;

public class VillaConfiguration : IEntityTypeConfiguration<Villa>
{
    public void Configure(EntityTypeBuilder<Villa> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Titre).IsRequired().HasMaxLength(200);
        builder.Property(v => v.Quartier).IsRequired().HasMaxLength(100);
        builder.Property(v => v.Ville).IsRequired().HasMaxLength(100);
        builder.Property(v => v.Prix).HasPrecision(18, 0);
        builder.Property(v => v.SurfaceTerrain).HasPrecision(10, 2);
        builder.Property(v => v.SurfaceHabitable).HasPrecision(10, 2);
        builder.Property(v => v.Modele3DUrl).HasMaxLength(500);
        builder.Property(v => v.ImagePrincipaleUrl).HasMaxLength(500);

        builder.HasMany(v => v.PointsVisite)
               .WithOne()
               .HasForeignKey(p => p.VillaId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(v => v.Medias)
               .WithOne()
               .HasForeignKey(m => m.BienId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
