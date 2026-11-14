using MaMaison.Domain.Common;
namespace MaMaison.Domain.Entities;
public class JustificatifBien : BaseEntity
{
    public Guid BienId { get; set; }
    public string Categorie { get; set; } = string.Empty;
    public string Fichier { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public bool Valide { get; set; }
}
