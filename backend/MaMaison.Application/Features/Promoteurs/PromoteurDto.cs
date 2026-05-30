namespace MaMaison.Application.Features.Promoteurs;

public record PromoteurDto(
    Guid Id,
    string Nom,
    string? LogoUrl,
    string? Description,
    string Telephone,
    bool EstVerifie,
    int NombreVillas
);
