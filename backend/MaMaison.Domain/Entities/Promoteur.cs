using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public class Promoteur : BaseEntity
{
    public string Nom { get; private set; } = string.Empty;
    public string? LogoUrl { get; private set; }
    public string? Description { get; private set; }
    public string Telephone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Adresse { get; private set; }
    public bool EstVerifie { get; private set; }

    private readonly List<Villa> _villas = [];
    public IReadOnlyCollection<Villa> Villas => _villas.AsReadOnly();

    private Promoteur() { }

    public static Promoteur Creer(string nom, string telephone, string? email = null, string? adresse = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nom);
        ArgumentException.ThrowIfNullOrWhiteSpace(telephone);

        return new Promoteur
        {
            Nom = nom,
            Telephone = telephone,
            Email = email,
            Adresse = adresse
        };
    }

    public void Verifier() { EstVerifie = true; MarquerModifie(); }
    public void MettreAJourInfos(string? description, string? logoUrl, string? adresse)
    {
        Description = description;
        LogoUrl = logoUrl;
        Adresse = adresse;
        MarquerModifie();
    }
}
