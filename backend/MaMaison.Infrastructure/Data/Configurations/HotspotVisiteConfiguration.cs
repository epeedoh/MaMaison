using MaMaison.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MaMaison.Infrastructure.Data.Configurations;

public class HotspotVisiteConfiguration : IEntityTypeConfiguration<HotspotVisite>
{
    public void Configure(EntityTypeBuilder<HotspotVisite> builder)
    {
        builder.HasKey(h => h.Id);
        builder.Property(h => h.Libelle).IsRequired().HasMaxLength(200);

        builder.HasOne<PointVisite3D>()
               .WithMany(p => p.Hotspots)
               .HasForeignKey(h => h.PointVisiteId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
