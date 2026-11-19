using MaMaison.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MaMaison.Infrastructure.Data.Configurations;

public class LocationConfiguration : IEntityTypeConfiguration<Location>
{
    public void Configure(EntityTypeBuilder<Location> builder)
    {
        builder.HasKey(l => l.Id);
        // The historical column records the submitting account, not proof of ownership.
        builder.Property(l => l.DeposantId).HasColumnName("ProprietaireId");
        builder.Property(l => l.ProprietaireId).HasColumnName("TitulaireId");
        builder.Property(l => l.MotifRejet).HasMaxLength(1000);
        builder.Property(l => l.Statut).IsConcurrencyToken();
        builder.Property(l => l.ResponsableVisitesId).IsConcurrencyToken();
        builder.Property(l => l.Titre).IsRequired().HasMaxLength(200);
        builder.Property(l => l.Quartier).IsRequired().HasMaxLength(100);
        builder.Property(l => l.Commune).IsRequired().HasMaxLength(100);
        builder.Property(l => l.Loyer).HasPrecision(18, 0);
        builder.Property(l => l.Caution).HasPrecision(18, 0);
        builder.Property(l => l.Avance).HasPrecision(18, 0);
        builder.Property(l => l.FraisAgence).HasPrecision(18, 0);
        builder.Property(l => l.FraisVisite).HasPrecision(18, 0);

        builder.Ignore(l => l.TotalAPrevoir);
    }
}
