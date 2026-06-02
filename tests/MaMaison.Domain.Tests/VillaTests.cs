using FluentAssertions;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Tests;

public class VillaTests
{
    private static Villa CréerVillaValide() => Villa.Creer(
        Guid.NewGuid(), "Villa Test", TypeVilla.VillaBasse,
        "Cocody", "Abidjan", 45_000_000m, 180m, 5);

    [Fact]
    public void Creer_VillaValide_DoitAvoirStatutBrouillon()
    {
        var villa = CréerVillaValide();
        villa.Statut.Should().Be(StatutVilla.Brouillon);
    }

    [Fact]
    public void Creer_AvecPrixNegatif_DoitLancerException()
    {
        var action = () => Villa.Creer(Guid.NewGuid(), "Test", TypeVilla.Duplex,
            "Cocody", "Abidjan", -1m, 100m, 3);
        action.Should().Throw<ArgumentException>()
              .WithMessage("*prix*");
    }

    [Fact]
    public void Creer_AvecSurfaceNulle_DoitLancerException()
    {
        var action = () => Villa.Creer(Guid.NewGuid(), "Test", TypeVilla.Duplex,
            "Cocody", "Abidjan", 10_000_000m, 0m, 3);
        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Publier_DepuisBrouillon_DoitChangerStatut()
    {
        var villa = CréerVillaValide();
        villa.MettreEnValidation();
        villa.Publier();
        villa.Statut.Should().Be(StatutVilla.Publie);
    }

    [Fact]
    public void MettreAJourScore_AvecValeurValide_DoitClamp()
    {
        var villa = CréerVillaValide();
        villa.MettreAJourScore(150);
        villa.ScoreMaMaison.Should().Be(100);

        villa.MettreAJourScore(-10);
        villa.ScoreMaMaison.Should().Be(0);
    }

    [Fact]
    public void AssignerModele3D_DoitStocker_Url()
    {
        var villa = CréerVillaValide();
        villa.AssignerModele3D("/assets/villa.glb");
        villa.Modele3DUrl.Should().Be("/assets/villa.glb");
    }

    [Fact]
    public void Suspendre_DoitChangerStatut()
    {
        var villa = CréerVillaValide();
        villa.MettreEnValidation();
        villa.Publier();
        villa.Suspendre();
        villa.Statut.Should().Be(StatutVilla.Suspendu);
    }
}
