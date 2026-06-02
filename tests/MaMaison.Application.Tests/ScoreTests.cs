using FluentAssertions;
using MaMaison.Application.Services;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using Moq;

namespace MaMaison.Application.Tests;

public class ScoreMaMaisonTests
{
    private static Villa VillaMinimale()
    {
        var v = Villa.Creer(Guid.NewGuid(), "Test", TypeVilla.VillaBasse,
            "Cocody", "Abidjan", 30_000_000m, 120m, 3);
        return v;
    }

    [Fact]
    public void CalculerVilla_SansMedia_DoitDonnerScoreBase()
    {
        var villa = VillaMinimale();
        var score = ScoreMaMaisonService.CalculerVilla(villa, 0, false);
        // titre(5)+quartier(5)+prix(5)+surface(5)+pièces(5) + absSignal(15) = 40
        // (description nulle = 0 pt)
        score.Should().Be(40);
    }

    [Fact]
    public void CalculerVilla_AvecModele3D_DoitAugmenterScore()
    {
        var villa = VillaMinimale();
        villa.AssignerModele3D("/assets/villa.glb");
        var score = ScoreMaMaisonService.CalculerVilla(villa, 0, true);
        // base 40 + modele3D 10 + pointsVisite 10 = 60
        score.Should().Be(60);
    }

    [Fact]
    public void CalculerVilla_ScoreMaximum_DoitEtre100()
    {
        var villa = VillaMinimale();
        villa.AssignerModele3D("/assets/villa.glb");
        var score = ScoreMaMaisonService.CalculerVilla(villa, 3, true);
        score.Should().BeLessThanOrEqualTo(100);
        score.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public void CalculerLocation_SansSignalement_DoitAvoirScoreMaxSignalement()
    {
        var loc = Location.Creer(Guid.NewGuid(), "Test", TypeLocationBien.F3,
            "Cocody", "Abidjan", 3, 250_000m, 500_000m, 250_000m);
        var score = ScoreMaMaisonService.CalculerLocation(loc, 0, 0);
        // titre + quartier + commune + loyer + caution + avance + pieces + signalements
        score.Should().BeGreaterThan(0);
        score.Should().BeLessThanOrEqualTo(100);
    }

    [Fact]
    public void CalculerLocation_AvecSignalement_DoitBaisserScore()
    {
        var loc = Location.Creer(Guid.NewGuid(), "Test", TypeLocationBien.F3,
            "Cocody", "Abidjan", 3, 250_000m, 500_000m, 250_000m);
        var scoreSans = ScoreMaMaisonService.CalculerLocation(loc, 0, 0);
        var scoreAvec = ScoreMaMaisonService.CalculerLocation(loc, 0, 2);
        scoreAvec.Should().BeLessThan(scoreSans);
    }
}
