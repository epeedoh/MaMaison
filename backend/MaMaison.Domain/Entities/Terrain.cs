using MaMaison.Domain.Common;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Entities;

public enum NiveauVerificationTerrain { Niveau1 = 1, Niveau2, Niveau3, Niveau4, Niveau5 }
public enum SourcePublicationTerrain { Interne, Proprietaire, Demarcheur, Agence }

public class Terrain : BaseEntity
{
    public string Titre { get; private set; } = string.Empty;
    public string Localisation { get; private set; } = string.Empty;
    public string Commune { get; private set; } = string.Empty;
    public string? Quartier { get; private set; }
    public decimal Surface { get; private set; }
    public decimal Prix { get; private set; }
    public UsageTerrain Usage { get; private set; }
    public string? TypeDocument { get; private set; }
    public double? Latitude { get; private set; }
    public double? Longitude { get; private set; }
    public StatutTerrain Statut { get; private set; } = StatutTerrain.Brouillon;
    public NiveauVerificationTerrain NiveauVerification { get; private set; } = NiveauVerificationTerrain.Niveau1;
    public SourcePublicationTerrain Source { get; private set; } = SourcePublicationTerrain.Interne;
    public int ScoreMaMaison { get; private set; }
    public string? Description { get; private set; }

    private readonly List<MediaBien> _medias = [];
    public IReadOnlyCollection<MediaBien> Medias => _medias.AsReadOnly();

    private readonly List<DocumentVerification> _documents = [];
    public IReadOnlyCollection<DocumentVerification> Documents => _documents.AsReadOnly();

    private Terrain() { }

    public static Terrain Creer(string titre, string localisation, string commune,
        decimal surface, decimal prix, UsageTerrain usage)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(titre);
        if (surface <= 0) throw new ArgumentException("La surface doit être positive.");
        if (prix <= 0) throw new ArgumentException("Le prix doit être positif.");

        return new Terrain
        {
            Titre = titre,
            Localisation = localisation,
            Commune = commune,
            Surface = surface,
            Prix = prix,
            Usage = usage
        };
    }

    public void DefinirCoordonnees(double latitude, double longitude)
    {
        Latitude = latitude;
        Longitude = longitude;
        if (NiveauVerification < NiveauVerificationTerrain.Niveau2)
            NiveauVerification = NiveauVerificationTerrain.Niveau2;
        MarquerModifie();
    }

    public void EleveNiveauVerification(NiveauVerificationTerrain niveau)
    {
        if (niveau > NiveauVerification) NiveauVerification = niveau;
        MarquerModifie();
    }

    public void Publier() { Statut = StatutTerrain.Publie; MarquerModifie(); }
    public void Suspendre() { Statut = StatutTerrain.Suspendu; MarquerModifie(); }
}
