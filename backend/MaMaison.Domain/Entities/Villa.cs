using MaMaison.Domain.Common;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Entities;

public class Villa : BaseEntity
{
    public Guid PromoteurId { get; private set; }
    public string Titre { get; private set; } = string.Empty;
    public TypeVilla TypeVilla { get; private set; }
    public string Quartier { get; private set; } = string.Empty;
    public string Ville { get; private set; } = string.Empty;
    public decimal Prix { get; private set; }
    public decimal? SurfaceTerrain { get; private set; }
    public decimal SurfaceHabitable { get; private set; }
    public int NombrePieces { get; private set; }
    public string? Description { get; private set; }
    public string? ImagePrincipaleUrl { get; private set; }
    public string? Modele3DUrl { get; private set; }
    public StatutVilla Statut { get; private set; } = StatutVilla.Brouillon;
    public int ScoreMaMaison { get; private set; }

    private readonly List<MediaBien> _medias = [];
    public IReadOnlyCollection<MediaBien> Medias => _medias.AsReadOnly();

    private readonly List<PointVisite3D> _pointsVisite = [];
    public IReadOnlyCollection<PointVisite3D> PointsVisite => _pointsVisite.AsReadOnly();

    private Villa() { }

    public static Villa Creer(Guid promoteurId, string titre, TypeVilla type,
        string quartier, string ville, decimal prix, decimal surfaceHabitable, int nombrePieces)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(titre);
        ArgumentException.ThrowIfNullOrWhiteSpace(quartier);
        if (prix <= 0) throw new ArgumentException("Le prix doit être positif.");
        if (surfaceHabitable <= 0) throw new ArgumentException("La surface doit être positive.");

        return new Villa
        {
            PromoteurId = promoteurId,
            Titre = titre,
            TypeVilla = type,
            Quartier = quartier,
            Ville = ville,
            Prix = prix,
            SurfaceHabitable = surfaceHabitable,
            NombrePieces = nombrePieces
        };
    }

    public void AssignerModele3D(string url) { Modele3DUrl = url; MarquerModifie(); }
    public void Publier() { Statut = StatutVilla.Publie; MarquerModifie(); }
    public void Suspendre() { Statut = StatutVilla.Suspendu; MarquerModifie(); }
    public void MarquerVendu() { Statut = StatutVilla.Vendu; MarquerModifie(); }
    public void MettreEnValidation() { Statut = StatutVilla.EnValidation; MarquerModifie(); }
    public void MettreAJourScore(int score) { ScoreMaMaison = Math.Clamp(score, 0, 100); MarquerModifie(); }
}
