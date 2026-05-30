using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public enum StatutDemandeVisite { EnAttente, Confirmee, Annulee, Effectuee }

public class DemandeVisite : BaseEntity
{
    public Guid BienId { get; private set; }
    public Guid UtilisateurId { get; private set; }
    public DateTime? DateSouhaitee { get; private set; }
    public StatutDemandeVisite Statut { get; private set; } = StatutDemandeVisite.EnAttente;
    public string? Commentaire { get; private set; }

    private DemandeVisite() { }

    public static DemandeVisite Creer(Guid bienId, Guid utilisateurId,
        DateTime? dateSouhaitee = null, string? commentaire = null)
    {
        return new DemandeVisite
        {
            BienId = bienId,
            UtilisateurId = utilisateurId,
            DateSouhaitee = dateSouhaitee,
            Commentaire = commentaire
        };
    }

    public void Confirmer() { Statut = StatutDemandeVisite.Confirmee; MarquerModifie(); }
    public void Annuler() { Statut = StatutDemandeVisite.Annulee; MarquerModifie(); }
    public void MarquerEffectuee() { Statut = StatutDemandeVisite.Effectuee; MarquerModifie(); }
}
