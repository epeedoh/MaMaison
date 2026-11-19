using MaMaison.Application.Features.Auth;
using MaMaison.Api.Security;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using MaMaison.Infrastructure.Data;
using MaMaison.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        if (string.IsNullOrWhiteSpace(cmd.Nom))
            return BadRequest(new { message = "Nom requis." });
        if (cmd.MotDePasse.EnumerateRunes().Count() is < 15 or > 256)
            return BadRequest(new { message = "Choisissez un mot de passe de 15 à 256 caractères." });

        if (await context.Utilisateurs.AnyAsync(u => u.Telephone == cmd.Telephone, ct))
            return Conflict(new { message = "Ce numéro est déjà utilisé." });

        var hash = passwords.Hash(cmd.MotDePasse);
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

        if (match == PasswordVerificationResult.SuccessRehashNeeded)
        {
            var upgraded = passwords.Hash(cmd.MotDePasse);
            // Do not overwrite a concurrent reset or reactivate a disabled account.
            var changed = await context.Utilisateurs
                .Where(u => u.Id == utilisateur.Id && u.EstActif && u.MotDePasseHash == utilisateur.MotDePasseHash)
                .ExecuteUpdateAsync(update => update.SetProperty(u => u.MotDePasseHash, upgraded), ct);
            if (changed == 0)
            {
                var id = utilisateur.Id;
                utilisateur = await context.Utilisateurs.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id && u.EstActif, ct);
                if (utilisateur is null || passwords.Verify(utilisateur.MotDePasseHash, cmd.MotDePasse) == PasswordVerificationResult.Failed)
                    return Unauthorized(new { message = "Téléphone ou mot de passe incorrect." });
            }
        }

        var (token, expiration) = tokenService.GenererToken(utilisateur);
        return Ok(BuildResult(utilisateur, token, expiration));
    }

    private static AuthResultDto BuildResult(Utilisateur u, string token, DateTime exp) =>
        new(token, exp, u.Nom, u.Telephone, u.Role, u.Id);

}
