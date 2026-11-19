using MaMaison.Domain.Common;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Entities;

public class Location : BaseEntity
{
    public double? Latitude { get; private set; }
    public double? Longitude { get; private set; }
    public void DefinirCoordonnees(double latitude, double longitude)
    {
        Coordonnees.Valider(latitude, longitude);
        Latitude = latitude; Longitude = longitude; MarquerModifie();
    }
    public Guid DeposantId { get; private set; }
    public Guid? ProprietaireId { get; private set; }
    public Guid? ResponsableVisitesId { get; private set; }
    public string? MotifRejet { get; private set; }
    public string Titre { get; private set; } = string.Empty;
    public TypeLocationBien TypeBien { get; private set; }
    public string Quartier { get; private set; } = string.Empty;
    public string Commune { get; private set; } = string.Empty;
    public int NombrePieces { get; private set; }
    public decimal Loyer { get; private set; }
    public decimal Caution { get; private set; }
    public decimal Avance { get; private set; }
    public decimal FraisAgence { get; private set; }
    public decimal? FraisVisite { get; private set; }
    public bool EstDisponible { get; private set; } = true;
    public DateTime? DateDisponibilite { get; private set; }
    public StatutLocation Statut { get; private set; } = StatutLocation.Brouillon;
    public int ScoreMaMaison { get; private set; }
    public DateTime? DateConfirmationDisponibilite { get; private set; }

    public decimal TotalAPrevoir => Loyer + Caution + Avance + FraisAgence + (FraisVisite ?? 0);

    private readonly List<MediaBien> _medias = [];
    public IReadOnlyCollection<MediaBien> Medias => _medias.AsReadOnly();

    private Location() { }

    public static Location Creer(Guid proprietaireId, string titre, TypeLocationBien type,
        string quartier, string commune, int nombrePieces,
        decimal loyer, decimal caution, decimal avance, decimal fraisAgence = 0, bool pourSonCompte = true)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(titre);
        if (loyer <= 0) throw new ArgumentException("Le loyer doit être positif.");

        return new Location
        {
            DeposantId = proprietaireId,
            ProprietaireId = pourSonCompte ? proprietaireId : null,
            ResponsableVisitesId = pourSonCompte ? proprietaireId : null,
            Titre = titre,
            TypeBien = type,
            Quartier = quartier,
            Commune = commune,
            NombrePieces = nombrePieces,
            Loyer = loyer,
            Caution = caution,
            Avance = avance,
            FraisAgence = fraisAgence
        };
    }

    public void Publier() { Statut = StatutLocation.Publie; MarquerModifie(); }
    public void MarquerLoue() { Statut = StatutLocation.Loue; EstDisponible = false; MarquerModifie(); }
    public void Suspendre() { Statut = StatutLocation.Suspendu; MarquerModifie(); }
    public void Rejeter(string motif) { MotifRejet = motif; Statut = StatutLocation.Rejete; MarquerModifie(); }
    public void Soumettre() { Statut = StatutLocation.EnVerification; MarquerModifie(); }
    public void IdentifierProprietaire(Guid titulaire) { ProprietaireId = titulaire; ResponsableVisitesId = titulaire; MarquerModifie(); }
    public void DeleguerVisites(Guid responsable) { ResponsableVisitesId = responsable; MarquerModifie(); }
    public void Corriger(string titre, string quartier, string commune, int pieces, decimal loyer, decimal caution, decimal avance, decimal frais)
    {
        Titre = titre.Trim(); Quartier = quartier.Trim(); Commune = commune.Trim(); NombrePieces = pieces;
        Loyer = loyer; Caution = caution; Avance = avance; FraisAgence = frais;
        Soumettre();
    }
    public void ConfirmerDisponibilite()
    {
        DateConfirmationDisponibilite = DateTime.UtcNow;
        EstDisponible = true;
        MarquerModifie();
    }

    public void MettreAJourScore(int score) { ScoreMaMaison = Math.Clamp(score, 0, 100); MarquerModifie(); }
}
