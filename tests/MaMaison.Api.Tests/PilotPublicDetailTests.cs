using MaMaison.Api.Controllers;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace MaMaison.Api.Tests;

public class PilotPublicDetailTests
{
    [Theory]
    [InlineData(StatutLocation.Brouillon, true, false)]
    [InlineData(StatutLocation.EnVerification, true, false)]
    [InlineData(StatutLocation.Rejete, true, false)]
    [InlineData(StatutLocation.Suspendu, true, false)]
    [InlineData(StatutLocation.Expire, true, false)]
    [InlineData(StatutLocation.Loue, false, false)]
    [InlineData(StatutLocation.Publie, false, false)]
    [InlineData(StatutLocation.Publie, true, true)]
    public async Task LocationDetail_OnlyExposesPublishedAvailableProperty(StatutLocation status, bool available, bool visible)
    {
        await using var context = PilotApiFixture.Context();
        var location = Location.Creer(Guid.NewGuid(), "Fixture", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0);
        context.Locations.Add(location);
        context.Entry(location).Property(l => l.Statut).CurrentValue = status;
        context.Entry(location).Property(l => l.EstDisponible).CurrentValue = available;
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        var controller = new LocationsController(new LocationRepository(context), context);

        var result = await controller.ObtenirDetail(location.Id, default);
        if (visible) Assert.IsType<OkObjectResult>(result);
        else Assert.IsType<NotFoundResult>(result);
    }

    [Theory]
    [InlineData(StatutVilla.Brouillon, false)]
    [InlineData(StatutVilla.EnValidation, false)]
    [InlineData(StatutVilla.Suspendu, false)]
    [InlineData(StatutVilla.Reserve, false)]
    [InlineData(StatutVilla.Vendu, false)]
    [InlineData(StatutVilla.Publie, true)]
    public async Task VillaDetail_OnlyExposesPublishedProperty(StatutVilla status, bool visible)
    {
        await using var context = PilotApiFixture.Context();
        var villa = Villa.Creer(Guid.NewGuid(), "Fixture", default, "Zone", "Abidjan", 1000000, 100, 3);
        context.Villas.Add(villa);
        context.Entry(villa).Property(v => v.Statut).CurrentValue = status;
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();
        var controller = new VillasController(new VillaRepository(context), context);

        var result = await controller.ObtenirDetail(villa.Id, default);
        if (visible) Assert.IsType<OkObjectResult>(result);
        else Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Details_ReturnNotFoundForUnknownIds()
    {
        await using var context = PilotApiFixture.Context();
        Assert.IsType<NotFoundResult>(await new LocationsController(new LocationRepository(context), context)
            .ObtenirDetail(Guid.NewGuid(), default));
        Assert.IsType<NotFoundResult>(await new VillasController(new VillaRepository(context), context)
            .ObtenirDetail(Guid.NewGuid(), default));
    }

    [Fact]
    public async Task Moderation_RemovesPreviouslyAccessibleDetails()
    {
        await using var context = PilotApiFixture.Context();
        var location = Location.Creer(Guid.NewGuid(), "Fixture", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0);
        var villa = Villa.Creer(Guid.NewGuid(), "Fixture", default, "Zone", "Abidjan", 1000000, 100, 3);
        location.Publier();
        villa.Publier();
        context.AddRange(location, villa);
        await context.SaveChangesAsync();
        var locations = new LocationsController(new LocationRepository(context), context);
        var villas = new VillasController(new VillaRepository(context), context);
        Assert.IsType<OkObjectResult>(await locations.ObtenirDetail(location.Id, default));
        Assert.IsType<OkObjectResult>(await villas.ObtenirDetail(villa.Id, default));

        Assert.IsType<OkObjectResult>(await new AdminController(context).RejeterLocation(location.Id, "Dossier incomplet", default));
        Assert.IsType<OkObjectResult>(await new AdminController(context).SuspendreVilla(villa.Id, default));
        context.ChangeTracker.Clear();
        Assert.IsType<NotFoundResult>(await locations.ObtenirDetail(location.Id, default));
        Assert.IsType<NotFoundResult>(await villas.ObtenirDetail(villa.Id, default));
    }
}
