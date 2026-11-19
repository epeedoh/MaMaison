using MaMaison.Api.Controllers;
using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaMaison.Api.Tests;

public class DossierRolesTests
{
    [Theory]
    [InlineData("Visiteur", false)][InlineData("Acheteur", false)][InlineData("Locataire", false)]
    [InlineData("Proprietaire", true)][InlineData("Promoteur", true)][InlineData("Demarcheur", true)]
    [InlineData("AgentImmobilier", true)][InlineData("VerificateurTerrain", false)]
    [InlineData("Admin", true)][InlineData("SuperAdmin", true)][InlineData("Support", false)][InlineData("Partenaire", false)]
    public async Task PoliciesSeparateDepositFromOwnerAssignment(string role, bool deposant)
    {
        var user=PilotApiFixture.Principal(Guid.NewGuid().ToString(),role);
        Assert.Equal(deposant,await PilotApiFixture.Authorized(typeof(LocationsController),"Soumettre",user));
        Assert.Equal(role is "Admin" or "SuperAdmin",await PilotApiFixture.Authorized(typeof(DossiersLocationController),"Identifier",user));
    }

    [Fact]
    public async Task DelegateReceivesOnlyVisitsForAssignedPropertyAndLosesAccessImmediatelyOnRevocation()
    {
        await using var db=PilotApiFixture.Context();
        var owner=Utilisateur.Creer("Titulaire","01","fixture",RoleUtilisateur.Proprietaire);
        var agent=Utilisateur.Creer("Agence","02","fixture",RoleUtilisateur.AgentImmobilier);
        var broker=Utilisateur.Creer("Déposant","03","fixture",RoleUtilisateur.Demarcheur);
        var loc=Location.Creer(broker.Id,"Maison",default,"Quartier","Commune",2,100000,0,0,pourSonCompte:false);
        loc.Soumettre(); db.AddRange(owner,agent,broker,loc); await db.SaveChangesAsync();
        DossiersLocationController As(Utilisateur u)=>PilotApiFixture.WithUser(new DossiersLocationController(db),
            PilotApiFixture.Principal(u.Id.ToString(),u.Role.ToString()));
        var admin=new DossiersLocationController(db);
        Assert.IsType<BadRequestObjectResult>(await admin.Identifier(loc.Id,new(owner.Telephone),default));
        db.JustificatifsBien.AddRange(new(){BienId=loc.Id,Categorie="Propriete",Valide=true},new(){BienId=loc.Id,Categorie="IdentiteProprietaire",Valide=true});
        await db.SaveChangesAsync();
        Assert.IsType<NoContentResult>(await admin.Identifier(loc.Id,new(owner.Telephone),default));
        Assert.IsType<NotFoundResult>(await As(broker).Deleguer(loc.Id,new(broker.Telephone),default));
        Assert.IsType<NoContentResult>(await As(owner).Deleguer(loc.Id,new(agent.Telephone),default));
        Assert.IsType<OkObjectResult>(await new AdminController(db).ValiderLocation(loc.Id,default));
        var visit=DemandeVisite.Creer(loc.Id,Guid.NewGuid(),nature:"visite");
        var callback=DemandeVisite.Creer(loc.Id,Guid.NewGuid(),nature:"rappel");
        db.AddRange(visit,callback);await db.SaveChangesAsync();
        var list=Assert.IsType<OkObjectResult>(await As(agent).Visites(loc.Id,default));
        Assert.Single(System.Text.Json.JsonSerializer.SerializeToElement(list.Value).EnumerateArray());
        Assert.IsType<NotFoundResult>(await As(broker).Visites(loc.Id,default));
        Assert.IsType<NotFoundResult>(await As(agent).Confirmer(loc.Id,callback.Id,new(DateTimeOffset.UtcNow.AddDays(1)),default));
        Assert.IsType<NoContentResult>(await As(agent).Confirmer(loc.Id,visit.Id,new(DateTimeOffset.UtcNow.AddDays(1)),default));
        Assert.IsType<ConflictResult>(await new AdminController(db).Repondre(visit.Id,"Message",default));
        Assert.IsType<NoContentResult>(await new AdminController(db).Repondre(callback.Id,"Nous vous rappelons.",default));
        Assert.IsType<NoContentResult>(await As(owner).Deleguer(loc.Id,new(null),default));
        Assert.IsType<NotFoundResult>(await As(agent).Visites(loc.Id,default));
        Assert.Equal(broker.Id,loc.DeposantId);
        Assert.Equal(owner.Id,loc.ProprietaireId);
    }
}
