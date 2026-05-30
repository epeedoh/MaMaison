using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public enum StatutSignalement { EnAttente, EnCours, Resolu, Rejete }

public class Signalement : BaseEntity
{
    public Guid BienId { get; private set; }
    public Guid UtilisateurId { get; private set; }
    public string Motif { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public StatutSignalement Statut { get; private set; } = StatutSignalement.EnAttente;

    private Signalement() { }

    public static Signalement Creer(Guid bienId, Guid utilisateurId, string motif, string? description = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(motif);
        return new Signalement
        {
            BienId = bienId,
            UtilisateurId = utilisateurId,
            Motif = motif,
            Description = description
        };
    }

    public void PrendreEnCharge() { Statut = StatutSignalement.EnCours; MarquerModifie(); }
    public void Resoudre() { Statut = StatutSignalement.Resolu; MarquerModifie(); }
    public void Rejeter() { Statut = StatutSignalement.Rejete; MarquerModifie(); }
}
