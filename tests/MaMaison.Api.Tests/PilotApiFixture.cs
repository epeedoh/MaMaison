using System.Security.Claims;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MaMaison.Api.Tests;

internal static class PilotApiFixture
{
    public static MaMaisonDbContext Context() => new(new DbContextOptionsBuilder<MaMaisonDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public static Utilisateur Account(RoleUtilisateur role = RoleUtilisateur.Locataire) =>
        Utilisateur.Creer("Compte fixture", "0000000000", "fixture-not-a-password", role);

    public static ClaimsPrincipal Principal(string? subject, string? role = null, bool authenticated = true)
    {
        var claims = new List<Claim>();
        if (subject is not null) claims.Add(new(ClaimTypes.NameIdentifier, subject));
        if (role is not null) claims.Add(new(ClaimTypes.Role, role));
        return new(new ClaimsIdentity(claims, authenticated ? "fixture" : null));
    }

    public static T WithUser<T>(T controller, ClaimsPrincipal user) where T : ControllerBase
    {
        controller.ControllerContext = new() { HttpContext = new DefaultHttpContext { User = user } };
        return controller;
    }

    // Evaluate the actual controller/action policies without starting Program or an HTTP host.
    public static async Task<bool> Authorized(Type controller, string action, ClaimsPrincipal user)
    {
        using var services = new ServiceCollection().AddLogging().AddAuthorization().BuildServiceProvider();
        var metadata = controller.GetCustomAttributes(true).OfType<IAuthorizeData>()
            .Concat(controller.GetMethod(action)!.GetCustomAttributes(true).OfType<IAuthorizeData>());
        var policy = await AuthorizationPolicy.CombineAsync(
            services.GetRequiredService<IAuthorizationPolicyProvider>(), metadata);
        return policy is null || (await services.GetRequiredService<IAuthorizationService>()
            .AuthorizeAsync(user, null, policy)).Succeeded;
    }
}
