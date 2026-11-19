using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public enum StatutDemandeVisite { EnAttente, Confirmee, Annulee, Effectuee }

public class DemandeVisite : BaseEntity
{
    public Guid BienId { get; private set; }
    public Guid UtilisateurId { get; private set; }
    public DateTime? DateSouhaitee { get; private set; }
    public DateTime? DateConfirmee { get; private set; }
    [System.ComponentModel.DataAnnotations.ConcurrencyCheck]
    public StatutDemandeVisite Statut { get; private set; } = StatutDemandeVisite.EnAttente;
    public string? Commentaire { get; private set; }
    [System.ComponentModel.DataAnnotations.MaxLength(16)]
    public string? Nature { get; private set; }
    [System.ComponentModel.DataAnnotations.MaxLength(1000)]
    public string? Reponse { get; private set; }

    private DemandeVisite() { }

    public static DemandeVisite Creer(Guid bienId, Guid utilisateurId,
        DateTime? dateSouhaitee = null, string? commentaire = null, string? nature = null)
    {
        return new DemandeVisite
        {
            BienId = bienId,
            UtilisateurId = utilisateurId,
            DateSouhaitee = dateSouhaitee,
            Commentaire = commentaire, Nature = nature
        };
    }

    public void Confirmer(DateTime? date = null) { DateConfirmee = date; Statut = StatutDemandeVisite.Confirmee; MarquerModifie(); }
    public void Repondre(string texte) { Reponse = texte; Statut = StatutDemandeVisite.Effectuee; MarquerModifie(); }
    public void Annuler() { Statut = StatutDemandeVisite.Annulee; MarquerModifie(); }
    public void MarquerEffectuee() { Statut = StatutDemandeVisite.Effectuee; MarquerModifie(); }
}
