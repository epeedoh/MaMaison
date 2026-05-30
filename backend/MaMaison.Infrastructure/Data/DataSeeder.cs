using MaMaison.Domain.Entities;
using MaMaison.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MaMaison.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(MaMaisonDbContext context, ILogger logger)
    {
        if (await context.Promoteurs.AnyAsync()) return;

        logger.LogInformation("Seeding demo data...");

        // Promoteur pilote
        var promoteur = Promoteur.Creer(
            nom: "SICOGI Prestige",
            telephone: "+225 27 20 30 40 50",
            email: "contact@sicogi-prestige.ci",
            adresse: "Plateau, Abidjan, Côte d'Ivoire");
        promoteur.Verifier();
        await context.Promoteurs.AddAsync(promoteur);
        await context.SaveChangesAsync();

        // Villa démo MVP1
        var villa = Villa.Creer(
            promoteurId: promoteur.Id,
            titre: "Villa Palm Beach — Cocody",
            type: TypeVilla.VillaBasse,
            quartier: "Cocody Riviera",
            ville: "Abidjan",
            prix: 45_000_000m,
            surfaceHabitable: 180m,
            nombrePieces: 5);

        villa.AssignerModele3D("/assets/models/villa-demo.glb");
        villa.MettreAJourScore(82);

        // On publie directement pour la démo
        villa.MettreEnValidation();
        villa.Publier();

        await context.Villas.AddAsync(villa);
        await context.SaveChangesAsync();

        // Points de visite 3D
        var salon = PointVisite3D.Creer(
            villaId: villa.Id,
            nomPiece: "Salon",
            ordre: 0,
            posX: 0f, posY: 1.6f, posZ: 0f,
            description: "Salon principal — 35 m²");

        var cuisine = PointVisite3D.Creer(
            villaId: villa.Id,
            nomPiece: "Cuisine",
            ordre: 1,
            posX: 5f, posY: 1.6f, posZ: 0f,
            rotY: (float)(-Math.PI / 4),
            description: "Cuisine équipée — 18 m²");

        var chambre = PointVisite3D.Creer(
            villaId: villa.Id,
            nomPiece: "Chambre principale",
            ordre: 2,
            posX: -4f, posY: 1.6f, posZ: 3f,
            rotY: (float)(Math.PI / 6),
            description: "Suite parentale — 22 m²");

        await context.PointsVisite3D.AddRangeAsync(salon, cuisine, chambre);
        await context.SaveChangesAsync();

        // Hotspots salon
        await context.HotspotsVisite.AddRangeAsync(
            HotspotVisite.Creer(salon.Id, "Surface", 2f, 1.2f, -1f, "35 m² — Carrelage marbre blanc"),
            HotspotVisite.Creer(salon.Id, "Hauteur sous plafond", -1f, 2.5f, 1f, "3,2 m — Double vitrage"),
            HotspotVisite.Creer(salon.Id, "Terrasse attenante", 3f, 1.2f, 2f, "Accès direct terrasse 20 m²")
        );

        // Hotspots cuisine
        await context.HotspotsVisite.AddRangeAsync(
            HotspotVisite.Creer(cuisine.Id, "Équipements", 5f, 1.2f, -2f, "Cuisine équipée — Électroménager Samsung inclus"),
            HotspotVisite.Creer(cuisine.Id, "Plan de travail", 6f, 0.9f, 0f, "Granit noir — 4 mètres linéaires")
        );

        // Hotspots chambre
        await context.HotspotsVisite.AddRangeAsync(
            HotspotVisite.Creer(chambre.Id, "Surface", -4f, 1.2f, 1f, "22 m² — Dressing 6 m² intégré"),
            HotspotVisite.Creer(chambre.Id, "Salle de bain privative", -6f, 1.2f, 3f, "Baignoire + douche italienne")
        );

        await context.SaveChangesAsync();

        // Locations démo
        var proprietaireId = Guid.NewGuid();
        var loc1 = Location.Creer(proprietaireId, "Appartement F3 — Cocody 2 Plateaux",
            TypeLocationBien.F3, "2 Plateaux", "Cocody", 3, 250_000m, 500_000m, 250_000m, 50_000m);
        loc1.ConfirmerDisponibilite();
        loc1.Publier();

        var loc2 = Location.Creer(proprietaireId, "Villa 4 pièces — Bingerville bord de mer",
            TypeLocationBien.Villa, "Bingerville centre", "Bingerville", 4, 400_000m, 800_000m, 400_000m, 0m);
        loc2.ConfirmerDisponibilite();
        loc2.Publier();

        await context.Locations.AddRangeAsync(loc1, loc2);

        // Terrain démo
        var terrain = Terrain.Creer(
            "Terrain résidentiel — Songon Agban",
            "Songon Agban, derrière l'église catholique",
            "Songon", 600m, 18_000_000m, UsageTerrain.Residentiel);
        terrain.DefinirCoordonnees(5.3826, -4.0523);
        terrain.EleveNiveauVerification(NiveauVerificationTerrain.Niveau3);
        terrain.Publier();

        await context.Terrains.AddAsync(terrain);
        await context.SaveChangesAsync();

        logger.LogInformation("Demo data seeded: 1 promoteur, 1 villa (3 points + 7 hotspots), 2 locations, 1 terrain.");
    }
}
