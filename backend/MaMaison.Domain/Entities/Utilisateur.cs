using MaMaison.Domain.Common;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Entities;

public class Utilisateur : BaseEntity
{
    public string Nom { get; private set; } = string.Empty;
    public string Telephone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string MotDePasseHash { get; private set; } = string.Empty;
    public RoleUtilisateur Role { get; private set; }
    public bool EstActif { get; private set; } = true;
    public bool TelephoneVerifie { get; private set; }

    private Utilisateur() { }

    public static Utilisateur Creer(string nom, string telephone, string motDePasseHash,
        RoleUtilisateur role, string? email = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nom);
        ArgumentException.ThrowIfNullOrWhiteSpace(telephone);
        ArgumentException.ThrowIfNullOrWhiteSpace(motDePasseHash);

        return new Utilisateur
        {
            Nom = nom,
            Telephone = telephone,
            MotDePasseHash = motDePasseHash,
            Role = role,
            Email = email
        };
    }

    public void VerifierTelephone() => TelephoneVerifie = true;
    public void Desactiver() { EstActif = false; MarquerModifie(); }
}
