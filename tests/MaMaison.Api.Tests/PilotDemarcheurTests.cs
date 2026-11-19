using MaMaison.Api.Controllers;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Tests;

public class PilotDemarcheurTests
{
    private static OpportuniteCommand Opportunity(decimal rent = 100000) =>
        new("Maison fixture", TypeLocationBien.Maison, "Zone", "Abidjan", 3, rent, 0, 0);

    [Theory]
    [InlineData(null, false)]
    [InlineData("Locataire", false)]
    [InlineData("Proprietaire", false)]
    [InlineData("Demarcheur", true)]
    [InlineData("Admin", true)]
    [InlineData("SuperAdmin", true)]
    public async Task RegistrationAndSubmission_RequireBrokerOrAdministrator(string? role, bool expected)
    {
        var user = PilotApiFixture.Principal(Guid.NewGuid().ToString(), role, authenticated: role is not null);
        Assert.Equal(expected, await PilotApiFixture.Authorized(
            typeof(DemarcheursController), nameof(DemarcheursController.Inscrire), user));
        Assert.Equal(expected, await PilotApiFixture.Authorized(
            typeof(DemarcheursController), nameof(DemarcheursController.SoumettreOpportunite), user));
    }

    [Fact]
    public async Task RegistrationAndSubmission_KeepTheAuthenticatedOwner()
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account(RoleUtilisateur.Demarcheur);
        context.Utilisateurs.Add(user);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(user.Id.ToString(), "Demarcheur"));

        Assert.IsType<CreatedResult>(await controller.Inscrire(new("Fixture", "0000000000", "Zone"), default));
        var broker = await context.Demarcheurs.SingleAsync();
        Assert.Equal(user.Id, broker.UtilisateurId);
        Assert.IsType<OkObjectResult>(await controller.SoumettreOpportunite(broker.Id, Opportunity(), default));
        var location = await context.Locations.SingleAsync();
        Assert.Equal(user.Id, location.DeposantId);
        Assert.Null(location.ProprietaireId);
        Assert.Equal(StatutLocation.EnVerification, location.Statut);
        Assert.Equal(1, broker.NombreSoumissions);
    }

    [Fact]
    public async Task Registration_RejectsSecondProfileForSameAccount()
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account(RoleUtilisateur.Demarcheur);
        context.Utilisateurs.Add(user);
        var broker = Demarcheur.Creer(user.Id, "Fixture", "0000000000", "Zone");
        broker.Suspendre();
        context.Demarcheurs.Add(broker);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(user.Id.ToString(), "Demarcheur"));

        Assert.IsType<ConflictObjectResult>(await controller.Inscrire(new("Autre", "1111111111", "Zone"), default));
        Assert.Single(await context.Demarcheurs.ToListAsync());
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData(null, true)]
    [InlineData("not-a-guid", true)]
    [InlineData("00000000-0000-0000-0000-000000000000", true)]
    public async Task RegistrationAndSubmission_RejectInvalidIdentityWithoutWriting(string? subject, bool authenticated)
    {
        await using var context = PilotApiFixture.Context();
        var broker = Demarcheur.Creer(Guid.NewGuid(), "Fixture", "0000000000", "Zone");
        context.Demarcheurs.Add(broker);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(subject, "Demarcheur", authenticated));

        Assert.IsType<UnauthorizedResult>(await controller.Inscrire(new("Fixture", "1111111111", "Zone"), default));
        Assert.IsType<UnauthorizedResult>(await controller.SoumettreOpportunite(broker.Id, Opportunity(), default));
        Assert.Single(await context.Demarcheurs.ToListAsync());
        Assert.Empty(await context.Locations.ToListAsync());
        Assert.Equal(0, broker.NombreSoumissions);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Registration_RejectsMissingOrInactiveAccount(bool inactive)
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account(RoleUtilisateur.Demarcheur);
        if (inactive)
        {
            user.Desactiver();
            context.Utilisateurs.Add(user);
            await context.SaveChangesAsync();
        }
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(user.Id.ToString(), "Demarcheur"));

        Assert.IsType<UnauthorizedResult>(await controller.Inscrire(new("Fixture", "0000000000", "Zone"), default));
        Assert.Empty(await context.Demarcheurs.ToListAsync());
    }

    [Fact]
    public async Task Submission_RejectsAnotherBrokersIdWithoutChangingCounters()
    {
        await using var context = PilotApiFixture.Context();
        var owner = Guid.NewGuid();
        var ownBroker = Demarcheur.Creer(owner, "Suspendu", "0000000000", "Zone");
        ownBroker.Suspendre();
        var otherBroker = Demarcheur.Creer(Guid.NewGuid(), "Autre", "1111111111", "Zone");
        context.Demarcheurs.AddRange(ownBroker, otherBroker);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(owner.ToString(), "Demarcheur"));

        Assert.IsType<ForbidResult>(await controller.SoumettreOpportunite(otherBroker.Id, Opportunity(), default));
        context.ChangeTracker.Clear();
        Assert.All(await context.Demarcheurs.ToListAsync(), d => Assert.Equal(0, d.NombreSoumissions));
        Assert.Empty(await context.Locations.ToListAsync());
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("SuperAdmin")]
    public async Task Submission_AdministratorsMayActForOwnerWithoutTakingOwnership(string role)
    {
        await using var context = PilotApiFixture.Context();
        var broker = Demarcheur.Creer(Guid.NewGuid(), "Fixture", "0000000000", "Zone");
        context.Demarcheurs.Add(broker);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(Guid.NewGuid().ToString(), role));

        Assert.IsType<OkObjectResult>(await controller.SoumettreOpportunite(broker.Id, Opportunity(), default));
        var location = await context.Locations.SingleAsync();
        Assert.Equal(broker.UtilisateurId, location.DeposantId);
        Assert.Null(location.ProprietaireId);
        Assert.Equal(StatutLocation.EnVerification, location.Statut);
        Assert.Equal(1, broker.NombreSoumissions);
    }

    [Theory]
    [InlineData("Demarcheur")]
    [InlineData("Admin")]
    [InlineData("SuperAdmin")]
    public async Task Submission_SuspendedProfileIsStillRejected(string role)
    {
        await using var context = PilotApiFixture.Context();
        var broker = Demarcheur.Creer(Guid.NewGuid(), "Fixture", "0000000000", "Zone");
        broker.Suspendre();
        context.Demarcheurs.Add(broker);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(broker.UtilisateurId.ToString(), role));

        Assert.IsType<ForbidResult>(await controller.SoumettreOpportunite(broker.Id, Opportunity(), default));
        Assert.Equal(0, broker.NombreSoumissions);
        Assert.Empty(await context.Locations.ToListAsync());
    }

    [Fact]
    public async Task Submission_InvalidOpportunityDoesNotIncrementCounter()
    {
        await using var context = PilotApiFixture.Context();
        var broker = Demarcheur.Creer(Guid.NewGuid(), "Fixture", "0000000000", "Zone");
        context.Demarcheurs.Add(broker);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemarcheursController(context),
            PilotApiFixture.Principal(broker.UtilisateurId.ToString(), "Demarcheur"));

        Assert.IsType<BadRequestObjectResult>(await controller.SoumettreOpportunite(broker.Id, Opportunity(0), default));
        context.ChangeTracker.Clear();
        Assert.Equal(0, (await context.Demarcheurs.SingleAsync()).NombreSoumissions);
        Assert.Empty(await context.Locations.ToListAsync());
    }
}
