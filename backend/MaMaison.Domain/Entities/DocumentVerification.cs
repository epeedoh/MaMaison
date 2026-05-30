using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public enum StatutValidationDocument { EnAttente, Valide, Rejete }

public class DocumentVerification : BaseEntity
{
    public Guid BienId { get; private set; }
    public string TypeDocument { get; private set; } = string.Empty;
    public string Url { get; private set; } = string.Empty;
    public StatutValidationDocument StatutValidation { get; private set; } = StatutValidationDocument.EnAttente;
    public string? Commentaire { get; private set; }
    public DateTime DateUpload { get; private set; } = DateTime.UtcNow;

    private DocumentVerification() { }

    public static DocumentVerification Creer(Guid bienId, string typeDocument, string url)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(typeDocument);
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        return new DocumentVerification { BienId = bienId, TypeDocument = typeDocument, Url = url };
    }

    public void Valider(string? commentaire = null)
    {
        StatutValidation = StatutValidationDocument.Valide;
        Commentaire = commentaire;
        MarquerModifie();
    }

    public void Rejeter(string commentaire)
    {
        StatutValidation = StatutValidationDocument.Rejete;
        Commentaire = commentaire;
        MarquerModifie();
    }
}
