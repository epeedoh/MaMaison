using MaMaison.Domain.Enums;

namespace MaMaison.Application.Features.Locations;

public record LocationListeDto(
    Guid Id,
    string Titre,
    TypeLocationBien TypeBien,
    string Quartier,
    string Commune,
    int NombrePieces,
    decimal Loyer,
    decimal TotalAPrevoir,
    bool EstDisponible,
    int ScoreMaMaison,
    string? ImagePrincipaleUrl
);

public record LocationDetailDto(
    Guid Id,
    string Titre,
    TypeLocationBien TypeBien,
    string Quartier,
    string Commune,
    int NombrePieces,
    decimal Loyer,
    decimal Caution,
    decimal Avance,
    decimal FraisAgence,
    decimal? FraisVisite,
    decimal TotalAPrevoir,
    bool EstDisponible,
    DateTime? DateConfirmationDisponibilite,
    int ScoreMaMaison
);

public record RechercheLocationQuery(
    string? Quartier,
    string? Commune,
    TypeLocationBien? Type,
    decimal? LoyerMax,
    int? NombrePiecesMin
);

public record SoumettreLocationCommand(
    string Titre,
    TypeLocationBien TypeBien,
    string Quartier,
    string Commune,
    int NombrePieces,
    decimal Loyer,
    decimal Caution,
    decimal Avance,
    decimal FraisAgence = 0
);
