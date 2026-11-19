using System.Text.Json;
using MaMaison.Api.Controllers;
using MaMaison.Application.Features.Visites;
using MaMaison.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Tests;

public class PilotIdentityTests
{
    private static SoumettreDemandeVisiteCommand Visit(Guid? bienId = null) =>
        new(bienId ?? Guid.Empty, "Contact fourni non fiable", "1111111111", null, null, "Commentaire fixture","contact");

    [Theory]
    [InlineData(null, false)]
    [InlineData("Locataire", false)]
    [InlineData("Proprietaire", false)]
    [InlineData("Demarcheur", false)]
    [InlineData("Admin", true)]
    [InlineData("SuperAdmin", true)]
    public async Task VisitList_OnlyAllowsAdministrators(string? role, bool expected)
    {
        var user = PilotApiFixture.Principal(Guid.NewGuid().ToString(), role, authenticated: role is not null);
        Assert.Equal(expected, await PilotApiFixture.Authorized(
            typeof(DemandesVisiteController), nameof(DemandesVisiteController.Lister), user));
        Assert.Equal(expected, await PilotApiFixture.Authorized(
            typeof(AdminController), nameof(AdminController.GetDemandes), user));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task VisitSubmission_RequiresAuthentication(bool authenticated)
    {
        Assert.Equal(authenticated, await PilotApiFixture.Authorized(
            typeof(DemandesVisiteController), nameof(DemandesVisiteController.Soumettre),
            PilotApiFixture.Principal(Guid.NewGuid().ToString(), "Locataire", authenticated)));
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData(null, true)]
    [InlineData("not-a-guid", true)]
    [InlineData("00000000-0000-0000-0000-000000000000", true)]
    public async Task VisitSubmission_RejectsInvalidIdentityWithoutWriting(string? subject, bool authenticated)
    {
        await using var context = PilotApiFixture.Context();
        var controller = PilotApiFixture.WithUser(new DemandesVisiteController(context),
            PilotApiFixture.Principal(subject, authenticated: authenticated));
        Assert.IsType<UnauthorizedResult>(await controller.Soumettre(Visit(), default));
        Assert.Empty(await context.DemandesVisite.ToListAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task VisitSubmission_RejectsMissingOrInactiveAccount(bool inactive)
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account();
        if (inactive)
        {
            user.Desactiver();
            context.Utilisateurs.Add(user);
            await context.SaveChangesAsync();
        }
        var controller = PilotApiFixture.WithUser(new DemandesVisiteController(context),
            PilotApiFixture.Principal(user.Id.ToString()));
        Assert.IsType<UnauthorizedResult>(await controller.Soumettre(Visit(), default));
        Assert.Empty(await context.DemandesVisite.ToListAsync());
    }

    [Fact]
    public async Task VisitSubmission_AppearsOnlyInAuthenticatedAccountsProfile()
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account();
        context.Utilisateurs.Add(user);
        await context.SaveChangesAsync();
        var identity = PilotApiFixture.Principal(user.Id.ToString());
        var controller = PilotApiFixture.WithUser(new DemandesVisiteController(context), identity);

        Assert.IsType<CreatedResult>(await controller.Soumettre(Visit(), default));
        var saved = await context.DemandesVisite.SingleAsync();
        Assert.Equal(user.Id, saved.UtilisateurId);
        var profile = PilotApiFixture.WithUser(new ProfilController(context), identity);
        var own = Assert.IsType<OkObjectResult>(await profile.MesDemandes(default));
        Assert.Equal(saved.Id, JsonSerializer.SerializeToElement(own.Value)[0].GetProperty("Id").GetGuid());
        var stats = Assert.IsType<OkObjectResult>(await profile.MesStats(default));
        Assert.Equal(1, JsonSerializer.SerializeToElement(stats.Value).GetProperty("NbDemandes").GetInt32());
        PilotApiFixture.WithUser(profile, PilotApiFixture.Principal(Guid.NewGuid().ToString()));
        var other = Assert.IsType<OkObjectResult>(await profile.MesDemandes(default));
        Assert.Equal(0, JsonSerializer.SerializeToElement(other.Value).GetArrayLength());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task VisitList_UsesAccountContactsAndKeepsLegacyOrphans(bool existingAdminEndpoint)
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account();
        context.Utilisateurs.Add(user);
        var legacy = DemandeVisite.Creer(Guid.NewGuid(), Guid.NewGuid());
        context.DemandesVisite.Add(legacy);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemandesVisiteController(context),
            PilotApiFixture.Principal(user.Id.ToString()));
        Assert.IsType<CreatedResult>(await controller.Soumettre(Visit(), default));

        PilotApiFixture.WithUser(controller, PilotApiFixture.Principal(Guid.NewGuid().ToString(), "Admin"));
        var result = Assert.IsType<OkObjectResult>(existingAdminEndpoint
            ? await new AdminController(context).GetDemandes(default)
            : await controller.Lister(default));
        var rows = JsonSerializer.SerializeToElement(result.Value).EnumerateArray().ToArray();
        Assert.Equal(2, rows.Length);
        var current = rows.Single(r => r.GetProperty("Id").GetGuid() != legacy.Id);
        Assert.Equal(user.Nom, current.GetProperty("Nom").GetString());
        Assert.Equal(user.Telephone, current.GetProperty("Telephone").GetString());
        var orphan = rows.Single(r => r.GetProperty("Id").GetGuid() == legacy.Id);
        Assert.Equal(JsonValueKind.Null, orphan.GetProperty("Nom").ValueKind);
        Assert.Equal(JsonValueKind.Null, orphan.GetProperty("Telephone").ValueKind);
    }

    [Theory]
    [InlineData("Contact")]
    [InlineData("Diaspora")]
    public async Task GeneralRequest_AcceptsEmptyPropertyIdAndUsesAccountContacts(string purpose)
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account();
        context.Utilisateurs.Add(user);
        await context.SaveChangesAsync();
        var controller = PilotApiFixture.WithUser(new DemandesVisiteController(context),
            PilotApiFixture.Principal(user.Id.ToString()));
        var command = Visit(Guid.Empty) with { Commentaire = purpose + " fixture" };

        Assert.IsType<CreatedResult>(await controller.Soumettre(command, default));
        var saved = await context.DemandesVisite.SingleAsync();
        Assert.Equal(Guid.Empty, saved.BienId);
        Assert.Equal(user.Id, saved.UtilisateurId);
        Assert.Equal(command.Commentaire, saved.Commentaire);
        var admin = PilotApiFixture.WithUser(new AdminController(context),
            PilotApiFixture.Principal(Guid.NewGuid().ToString(), "Admin"));
        var result = Assert.IsType<OkObjectResult>(await admin.GetDemandes(default));
        var row = Assert.Single(JsonSerializer.SerializeToElement(result.Value).EnumerateArray());
        Assert.Equal(user.Nom, row.GetProperty("Nom").GetString());
        Assert.Equal(user.Telephone, row.GetProperty("Telephone").GetString());
        Assert.Equal(command.Commentaire, row.GetProperty("Commentaire").GetString());
    }

    [Fact]
    public async Task Report_AppearsOnlyInAuthenticatedAccountsProfile()
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account();
        context.Utilisateurs.Add(user);
        await context.SaveChangesAsync();
        var identity = PilotApiFixture.Principal(user.Id.ToString());
        var controller = PilotApiFixture.WithUser(new SignalementsController(context), identity);
        Assert.IsType<CreatedResult>(await controller.Signaler(new(Guid.NewGuid(), "Motif fixture", null), default));
        var saved = await context.Signalements.SingleAsync();
        Assert.Equal(user.Id, saved.UtilisateurId);

        var profile = PilotApiFixture.WithUser(new ProfilController(context), identity);
        var own = Assert.IsType<OkObjectResult>(await profile.MesSignalements(default));
        Assert.Equal(saved.Id, JsonSerializer.SerializeToElement(own.Value)[0].GetProperty("Id").GetGuid());
        var stats = Assert.IsType<OkObjectResult>(await profile.MesStats(default));
        Assert.Equal(1, JsonSerializer.SerializeToElement(stats.Value).GetProperty("NbSignalements").GetInt32());
        PilotApiFixture.WithUser(profile, PilotApiFixture.Principal(Guid.NewGuid().ToString()));
        var other = Assert.IsType<OkObjectResult>(await profile.MesSignalements(default));
        Assert.Equal(0, JsonSerializer.SerializeToElement(other.Value).GetArrayLength());
    }

    [Fact]
    public async Task Report_PreservesAnonymousSubmissionWithoutTrustingUnauthenticatedClaims()
    {
        await using var context = PilotApiFixture.Context();
        var claimedId = Guid.NewGuid();
        var anonymous = PilotApiFixture.Principal(claimedId.ToString(), authenticated: false);
        Assert.True(await PilotApiFixture.Authorized(
            typeof(SignalementsController), nameof(SignalementsController.Signaler), anonymous));
        var controller = PilotApiFixture.WithUser(new SignalementsController(context), anonymous);
        Assert.IsType<CreatedResult>(await controller.Signaler(new(Guid.NewGuid(), "Motif fixture", null), default));
        var saved = await context.Signalements.SingleAsync();
        Assert.NotEqual(claimedId, saved.UtilisateurId);
        Assert.NotEqual(Guid.Empty, saved.UtilisateurId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-a-guid")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public async Task Report_RejectsMalformedAuthenticatedIdentity(string? subject)
    {
        await using var context = PilotApiFixture.Context();
        var controller = PilotApiFixture.WithUser(new SignalementsController(context), PilotApiFixture.Principal(subject));
        Assert.IsType<UnauthorizedResult>(await controller.Signaler(new(Guid.NewGuid(), "Motif fixture", null), default));
        Assert.Empty(await context.Signalements.ToListAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Report_RejectsMissingOrInactiveAuthenticatedAccount(bool inactive)
    {
        await using var context = PilotApiFixture.Context();
        var user = PilotApiFixture.Account();
        if (inactive)
        {
            user.Desactiver();
            context.Utilisateurs.Add(user);
            await context.SaveChangesAsync();
        }
        var controller = PilotApiFixture.WithUser(new SignalementsController(context),
            PilotApiFixture.Principal(user.Id.ToString()));
        Assert.IsType<UnauthorizedResult>(await controller.Signaler(new(Guid.NewGuid(), "Motif fixture", null), default));
        Assert.Empty(await context.Signalements.ToListAsync());
    }
}
