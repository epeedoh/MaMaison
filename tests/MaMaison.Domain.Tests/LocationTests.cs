using FluentAssertions;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Tests;

public class LocationTests
{
    private static Location CréerLocationValide() => Location.Creer(
        Guid.NewGuid(), "Appartement F3 Cocody",
        TypeLocationBien.F3, "2 Plateaux", "Cocody",
        3, 250_000m, 500_000m, 250_000m, 0m);

    [Fact]
    public void TotalAPrevoir_DoitSommerTousLesFrais()
    {
        var loc = CréerLocationValide();
        loc.TotalAPrevoir.Should().Be(1_000_000m); // loyer + caution + avance
    }

    [Fact]
    public void Creer_AvecLoyerNul_DoitLancerException()
    {
        var action = () => Location.Creer(
            Guid.NewGuid(), "Test", TypeLocationBien.F2,
            "Cocody", "Abidjan", 2, 0m, 0m, 0m);
        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Publier_DoitEtreDisponible()
    {
        var loc = CréerLocationValide();
        loc.Publier();
        loc.Statut.Should().Be(StatutLocation.Publie);
    }

    [Fact]
    public void MarquerLoue_DoitDesactiverDisponibilite()
    {
        var loc = CréerLocationValide();
        loc.Publier();
        loc.MarquerLoue();
        loc.EstDisponible.Should().BeFalse();
        loc.Statut.Should().Be(StatutLocation.Loue);
    }

    [Fact]
    public void ConfirmerDisponibilite_DoitHorodater()
    {
        var loc = CréerLocationValide();
        loc.ConfirmerDisponibilite();
        loc.DateConfirmationDisponibilite.Should().NotBeNull();
        loc.EstDisponible.Should().BeTrue();
    }
}
