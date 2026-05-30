using MaMaison.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MaMaison.Infrastructure.Data.Configurations;

public class TerrainConfiguration : IEntityTypeConfiguration<Terrain>
{
    public void Configure(EntityTypeBuilder<Terrain> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Titre).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Localisation).IsRequired().HasMaxLength(300);
        builder.Property(t => t.Commune).IsRequired().HasMaxLength(100);
        builder.Property(t => t.Surface).HasPrecision(10, 2);
        builder.Property(t => t.Prix).HasPrecision(18, 0);
        builder.Property(t => t.TypeDocument).HasMaxLength(200);

        builder.HasMany(t => t.Documents)
               .WithOne()
               .HasForeignKey(d => d.BienId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
