using FluentAssertions;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;

namespace MaMaison.Domain.Tests;

public class UtilisateurTests
{
    [Fact]
    public void Creer_AvecNomVide_DoitLancerException()
    {
        var action = () => Utilisateur.Creer("", "+2250700000000", "hash", RoleUtilisateur.Visiteur);
        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Creer_Valide_DoitEtreActif()
    {
        var u = Utilisateur.Creer("Jean Koné", "+2250700000000", "hash", RoleUtilisateur.Acheteur);
        u.EstActif.Should().BeTrue();
        u.TelephoneVerifie.Should().BeFalse();
    }

    [Fact]
    public void VerifierTelephone_DoitSetterTrue()
    {
        var u = Utilisateur.Creer("Jean Koné", "+2250700000000", "hash", RoleUtilisateur.Acheteur);
        u.VerifierTelephone();
        u.TelephoneVerifie.Should().BeTrue();
    }

    [Fact]
    public void Desactiver_DoitSetterFalse()
    {
        var u = Utilisateur.Creer("Jean Koné", "+2250700000000", "hash", RoleUtilisateur.Acheteur);
        u.Desactiver();
        u.EstActif.Should().BeFalse();
    }
}
