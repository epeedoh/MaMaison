using MaMaison.Domain.Enums;

namespace MaMaison.Application.Features.Statistiques;

public record StatistiquesPrixDto(
    string Zone,                    // ex: "Cocody Riviera"
    decimal PrixMoyenM2,            // FCFA/m² moyen du marché
    decimal PrixMinM2,
    decimal PrixMaxM2,
    int NombreBiens,                // nb de biens dans l'analyse
    string? TypeBienLabel           // "Villas" / "Appartements" / "Tous"
);

public record AnalysePrixBienDto(
    decimal PrixM2Bien,             // FCFA/m² du bien
    decimal PrixM2Marche,           // FCFA/m² moyen du marché
    decimal EcartPourcentage,       // +12.5 ou -8.3
    string Badge,                   // "dans_moyenne" | "au_dessus" | "bonne_affaire"
    string BadgeLabel,              // "Dans la moyenne du marché"
    string BadgeEmoji               // 🟢 🟡 🔴
);
