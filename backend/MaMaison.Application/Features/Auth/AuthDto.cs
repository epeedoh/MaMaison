using MaMaison.Domain.Enums;

namespace MaMaison.Application.Features.Auth;

public record RegisterCommand(
    string Nom,
    string Telephone,
    string MotDePasse,
    string? Email = null,
    RoleUtilisateur Role = RoleUtilisateur.Visiteur
);

public record LoginCommand(
    string Telephone,
    string MotDePasse
);

public record AuthResultDto(
    string Token,
    DateTime Expiration,
    string Nom,
    string Telephone,
    RoleUtilisateur Role,
    Guid UtilisateurId
);
