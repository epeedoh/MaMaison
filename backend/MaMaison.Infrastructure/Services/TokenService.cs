using MaMaison.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MaMaison.Infrastructure.Services;

public class TokenService(IConfiguration configuration)
{
    public (string Token, DateTime Expiration) GenererToken(Utilisateur utilisateur)
    {
        var cle = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(configuration["Jwt:Secret"]!));
        var credentials = new SigningCredentials(cle, SecurityAlgorithms.HmacSha256);
        var expiration   = DateTime.UtcNow.AddDays(7);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, utilisateur.Id.ToString()),
            new Claim(ClaimTypes.Name,           utilisateur.Nom),
            new Claim(ClaimTypes.MobilePhone,    utilisateur.Telephone),
            new Claim(ClaimTypes.Role,           utilisateur.Role.ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             configuration["Jwt:Issuer"],
            audience:           configuration["Jwt:Audience"],
            claims:             claims,
            expires:            expiration,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiration);
    }
}
