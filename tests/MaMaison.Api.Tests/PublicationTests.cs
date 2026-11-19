using System.Security.Claims;
using MaMaison.Api.Controllers;
using MaMaison.Application.Features.Locations;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Tests;

public class PublicationTests
{
    private static MaMaisonDbContext Context() => new(new DbContextOptionsBuilder<MaMaisonDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public void SoumissionReserveeAuxRolesDePublication()
    {
        var auth = typeof(LocationsController).GetMethod(nameof(LocationsController.Soumettre))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), false).Cast<AuthorizeAttribute>().Single();
        Assert.Equal(new[] { "Proprietaire", "Promoteur", "Demarcheur", "AgentImmobilier", "Admin", "SuperAdmin" }, auth.Roles!.Split(','));
    }

    [Fact]
    public void LocataireNePeutPasSoumettreUneOpportunite()
    {
        var auth = typeof(DemarcheursController).GetMethod(nameof(DemarcheursController.SoumettreOpportunite))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), false).Cast<AuthorizeAttribute>().Single();
        Assert.DoesNotContain("Locataire", auth.Roles!.Split(','));
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task PublicationExigeLesDeuxJustificatifsValides(bool propriete, bool identite)
    {
        await using var context = Context();
        var bien = Location.Creer(Guid.NewGuid(), "Maison", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0);
        bien.Soumettre();
        context.Locations.Add(bien);
        context.JustificatifsBien.AddRange(
            new() { BienId = bien.Id, Categorie = "Propriete", Valide = propriete },
            new() { BienId = bien.Id, Categorie = "IdentiteProprietaire", Valide = identite });
        await context.SaveChangesAsync();
        var result = await new AdminController(context).ValiderLocation(bien.Id, default);
        if (propriete && identite) Assert.IsType<OkObjectResult>(result);
        else { Assert.IsType<BadRequestObjectResult>(result); Assert.Equal(StatutLocation.EnVerification, bien.Statut); }
    }

    [Fact]
    public async Task JustificatifsDunAutreBienNePermettentPasDePublier()
    {
        await using var context = Context();
        var bien = Location.Creer(Guid.NewGuid(), "Maison", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0);
        context.Locations.Add(bien);
        context.JustificatifsBien.AddRange(
            new() { BienId = Guid.NewGuid(), Categorie = "Propriete", Valide = true },
            new() { BienId = Guid.NewGuid(), Categorie = "IdentiteProprietaire", Valide = true });
        await context.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>(await new AdminController(context).ValiderLocation(bien.Id, default));
    }

    [Fact]
    public async Task TerrainsDesactivesParDefautEtReglagePersistant()
    {
        await using var context = Context();
        var terrain = Terrain.Creer("Terrain", "Zone", "Abidjan", 500, 1000000, default);
        terrain.Publier(); context.Terrains.Add(terrain); await context.SaveChangesAsync();
        var controller = new TerrainsController(null!, context);
        Assert.IsType<NotFoundObjectResult>(await controller.Rechercher(null, null, null, null, null));
        await new FonctionnalitesController(context).Modifier(new(true), default);
        Assert.IsType<OkObjectResult>(await controller.Rechercher(null, null, null, null, null));
        await new FonctionnalitesController(context).Modifier(new(false), default);
        Assert.False((await context.ParametresPlateforme.SingleAsync()).Actif);
        Assert.IsType<NotFoundObjectResult>(await controller.Rechercher(null, null, null, null, null));
    }

    [Fact]
    public async Task SoumissionLieeAuProprietaireAuthentifie()
    {
        await using var context = Context();
        var userId = Guid.NewGuid();
        var controller = new LocationsController(new MaMaison.Infrastructure.Repositories.LocationRepository(context), context)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()), new Claim(ClaimTypes.Role, "Proprietaire") }, "test"))
            } }
        };
        Assert.IsType<CreatedResult>(await controller.Soumettre(new("Maison", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0, PourMonCompte:true), default));
        Assert.Equal(userId, (await context.Locations.SingleAsync()).ProprietaireId);
    }

    [Fact]
    public async Task JustificatifsInaccessiblesAuxAutresUtilisateurs()
    {
        await using var context = Context();
        var bien = Location.Creer(Guid.NewGuid(), "Maison", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0);
        context.Locations.Add(bien); await context.SaveChangesAsync();
        var controller = new JustificatifsController(context, null!)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) }, "test"))
            } }
        };
        Assert.IsType<NotFoundResult>(await controller.Lister(bien.Id, default));
        Assert.IsType<NotFoundResult>(await controller.Lire(bien.Id, Guid.NewGuid(), default));
    }

    [Fact]
    public async Task CoordonneesManquantesRefuseesEtZeroAccepte()
    {
        await using var context = Context();
        var bien = Location.Creer(Guid.NewGuid(), "Maison", TypeLocationBien.Maison, "Zone", "Abidjan", 3, 100000, 0, 0);
        context.Locations.Add(bien); await context.SaveChangesAsync();
        var controller = new AdminController(context);
        Assert.IsType<BadRequestObjectResult>(await controller.CoordonneesBien(bien.Id, new(null, 0), default));
        Assert.IsType<BadRequestObjectResult>(await controller.CoordonneesBien(bien.Id, new(91, 0), default));
        Assert.IsType<OkResult>(await controller.CoordonneesBien(bien.Id, new(0, 0), default));
        Assert.Equal(0, bien.Latitude); Assert.Equal(0, bien.Longitude);
    }
}
