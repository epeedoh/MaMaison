using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Application.Features.Terrains;

public record TerrainListeDto(
    Guid Id,
    string Titre,
    string Commune,
    string? Quartier,
    decimal Surface,
    decimal Prix,
    UsageTerrain Usage,
    NiveauVerificationTerrain NiveauVerification,
    int ScoreMaMaison,
    string? ImagePrincipaleUrl
);

public record TerrainDetailDto(
    Guid Id,
    string Titre,
    string Localisation,
    string Commune,
    string? Quartier,
    decimal Surface,
    decimal Prix,
    UsageTerrain Usage,
    string? TypeDocument,
    double? Latitude,
    double? Longitude,
    NiveauVerificationTerrain NiveauVerification,
    int ScoreMaMaison,
    string AvertissementJuridique
);

public record RechercheTerrainQuery(
    string? Commune,
    UsageTerrain? Usage,
    decimal? SurfaceMin,
    decimal? PrixMax
);
