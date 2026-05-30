using MaMaison.Domain.Common;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Entities;

public class Demarcheur : BaseEntity
{
    public Guid UtilisateurId { get; private set; }
    public string Nom { get; private set; } = string.Empty;
    public string Telephone { get; private set; } = string.Empty;
    public string ZoneActivite { get; private set; } = string.Empty;
    public StatutDemarcheur Statut { get; private set; } = StatutDemarcheur.Candidat;
    public int ScoreFiabilite { get; private set; } = 50;
    public int NombreSoumissions { get; private set; }
    public int NombreSignalements { get; private set; }
    public string? CniUrl { get; private set; }
    public string? PhotoUrl { get; private set; }
    public bool TelephoneVerifie { get; private set; }

    private Demarcheur() { }

    public static Demarcheur Creer(Guid utilisateurId, string nom, string telephone, string zoneActivite)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nom);
        ArgumentException.ThrowIfNullOrWhiteSpace(telephone);

        return new Demarcheur
        {
            UtilisateurId = utilisateurId,
            Nom = nom,
            Telephone = telephone,
            ZoneActivite = zoneActivite
        };
    }

    public void Verifier(string cniUrl) { CniUrl = cniUrl; Statut = StatutDemarcheur.Verifie; MarquerModifie(); }
    public void Certifier() { Statut = StatutDemarcheur.Certifie; MarquerModifie(); }
    public void Suspendre() { Statut = StatutDemarcheur.Suspendu; MarquerModifie(); }
    public void EnregistrerSoumission() { NombreSoumissions++; MarquerModifie(); }
    public void EnregistrerSignalement() { NombreSignalements++; MarquerModifie(); }
}
