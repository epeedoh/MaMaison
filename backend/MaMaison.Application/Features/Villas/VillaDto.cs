using MaMaison.Domain.Enums;

namespace MaMaison.Application.Features.Villas;

public record VillaListeDto(
    Guid Id,
    string Titre,
    TypeVilla TypeVilla,
    string Quartier,
    string Ville,
    decimal Prix,
    decimal SurfaceHabitable,
    int NombrePieces,
    string? ImagePrincipaleUrl,
    bool A3DVisite,
    int ScoreMaMaison
);

public record VillaDetailDto(
    Guid Id,
    Guid PromoteurId,
    string NomPromoteur,
    string Titre,
    TypeVilla TypeVilla,
    string Quartier,
    string Ville,
    decimal Prix,
    decimal? SurfaceTerrain,
    decimal SurfaceHabitable,
    int NombrePieces,
    string? Description,
    string? ImagePrincipaleUrl,
    string? Modele3DUrl,
    int ScoreMaMaison,
    IEnumerable<MediaBienDto> Medias,
    IEnumerable<PointVisite3DDto> PointsVisite
);

public record MediaBienDto(Guid Id, string TypeMedia, string Url, int Ordre);

public record PointVisite3DDto(
    Guid Id,
    string NomPiece,
    string? Description,
    float PositionX, float PositionY, float PositionZ,
    float RotationX, float RotationY, float RotationZ,
    int Ordre,
    IEnumerable<HotspotVisiteDto> Hotspots
);

public record HotspotVisiteDto(
    Guid Id,
    string Libelle,
    string? Contenu,
    float PositionX, float PositionY, float PositionZ
);

public record RechercheVillaQuery(
    TypeVilla? Type,
    string? Quartier,
    decimal? PrixMax,
    Guid? PromoteurId
);
