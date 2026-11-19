using MaMaison.Application.Features.Auth;
using MaMaison.Api.Security;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using MaMaison.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(MaMaisonDbContext context, TokenService tokenService, AccountPasswords passwords) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Telephone) || string.IsNullOrWhiteSpace(cmd.MotDePasse))
            return BadRequest(new { message = "Téléphone et mot de passe requis." });

        if (await context.Utilisateurs.AnyAsync(u => u.Telephone == cmd.Telephone, ct))
            return Conflict(new { message = "Ce numéro est déjà utilisé." });

        var hash = HashMotDePasse(cmd.MotDePasse);
        var utilisateur = Utilisateur.Creer(
            cmd.Nom, cmd.Telephone, hash,
            cmd.Role is RoleUtilisateur.Visiteur or RoleUtilisateur.Acheteur or RoleUtilisateur.Locataire
                or RoleUtilisateur.Proprietaire or RoleUtilisateur.Promoteur or RoleUtilisateur.Demarcheur
                ? cmd.Role : RoleUtilisateur.Visiteur,
            cmd.Email);

        await context.Utilisateurs.AddAsync(utilisateur, ct);
        await context.SaveChangesAsync(ct);

        var (token, expiration) = tokenService.GenererToken(utilisateur);
        return Created("/api/auth/me", BuildResult(utilisateur, token, expiration));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginCommand cmd, CancellationToken ct)
    {
        var utilisateur = await context.Utilisateurs.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Telephone == cmd.Telephone && u.EstActif, ct);
        var match = passwords.Verify(utilisateur?.MotDePasseHash, cmd.MotDePasse);

        if (utilisateur is null || match == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Téléphone ou mot de passe incorrect." });

        var (token, expiration) = tokenService.GenererToken(utilisateur);
        return Ok(BuildResult(utilisateur, token, expiration));
    }

    private static AuthResultDto BuildResult(Utilisateur u, string token, DateTime exp) =>
        new(token, exp, u.Nom, u.Telephone, u.Role, u.Id);

    private static string HashMotDePasse(string mdp) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(mdp)));
}
