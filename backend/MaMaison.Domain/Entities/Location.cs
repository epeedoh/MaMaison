using MaMaison.Domain.Common;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Entities;

public class Location : BaseEntity
{
    public Guid ProprietaireId { get; private set; }
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
        decimal loyer, decimal caution, decimal avance, decimal fraisAgence = 0)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(titre);
        if (loyer <= 0) throw new ArgumentException("Le loyer doit être positif.");

        return new Location
        {
            ProprietaireId = proprietaireId,
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
    public void Rejeter() { Statut = StatutLocation.Rejete; MarquerModifie(); }
    public void ConfirmerDisponibilite()
    {
        DateConfirmationDisponibilite = DateTime.UtcNow;
        EstDisponible = true;
        MarquerModifie();
    }

    public void MettreAJourScore(int score) { ScoreMaMaison = Math.Clamp(score, 0, 100); MarquerModifie(); }
}
