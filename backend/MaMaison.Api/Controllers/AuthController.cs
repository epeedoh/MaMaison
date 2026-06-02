using MaMaison.Application.Features.Auth;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using MaMaison.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(MaMaisonDbContext context, TokenService tokenService) : ControllerBase
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
            cmd.Role == RoleUtilisateur.Admin ? RoleUtilisateur.Visiteur : cmd.Role, // sécurité
            cmd.Email);

        await context.Utilisateurs.AddAsync(utilisateur, ct);
        await context.SaveChangesAsync(ct);

        var (token, expiration) = tokenService.GenererToken(utilisateur);
        return Created("/api/auth/me", BuildResult(utilisateur, token, expiration));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginCommand cmd, CancellationToken ct)
    {
        var hash = HashMotDePasse(cmd.MotDePasse);
        var utilisateur = await context.Utilisateurs
            .FirstOrDefaultAsync(u => u.Telephone == cmd.Telephone
                                   && u.MotDePasseHash == hash
                                   && u.EstActif, ct);

        if (utilisateur is null)
            return Unauthorized(new { message = "Téléphone ou mot de passe incorrect." });

        var (token, expiration) = tokenService.GenererToken(utilisateur);
        return Ok(BuildResult(utilisateur, token, expiration));
    }

    private static AuthResultDto BuildResult(Utilisateur u, string token, DateTime exp) =>
        new(token, exp, u.Nom, u.Telephone, u.Role, u.Id);

    private static string HashMotDePasse(string mdp) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(mdp)));
}
