using MaMaison.Domain.Entities;

namespace MaMaison.Application.Services;

/// <summary>
/// Calcule le Score MaMaison (0-100) d'une villa en fonction des critères de confiance.
/// Anonyme : jamais basé sur le promoteur nommément.
/// </summary>
public static class ScoreMaMaisonService
{
    public static int CalculerVilla(Villa villa, int nbDocuments, bool aPointsVisite)
    {
        int score = 0;

        // ── Informations de base (30 pts) ──────────────────────────
        if (!string.IsNullOrWhiteSpace(villa.Titre))       score += 5;
        if (!string.IsNullOrWhiteSpace(villa.Description)) score += 5;
        if (!string.IsNullOrWhiteSpace(villa.Quartier))    score += 5;
        if (villa.Prix > 0)                                score += 5;
        if (villa.SurfaceHabitable > 0)                    score += 5;
        if (villa.NombrePieces > 0)                        score += 5;

        // ── Médias (20 pts) ────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(villa.ImagePrincipaleUrl)) score += 10;
        if (villa.Medias.Count >= 3)  score += 5;
        if (villa.Medias.Count >= 6)  score += 5;

        // ── Visite 3D (20 pts) ─────────────────────────────────────
        if (aPointsVisite)                                 score += 10;
        if (!string.IsNullOrWhiteSpace(villa.Modele3DUrl)) score += 10;

        // ── Documents (15 pts) ─────────────────────────────────────
        if (nbDocuments >= 1) score += 5;
        if (nbDocuments >= 2) score += 5;
        if (nbDocuments >= 3) score += 5;

        // ── Absence de signalements (15 pts) ──────────────────────
        // Appelé avec nbSignalements = 0 par défaut
        score += 15;

        return Math.Clamp(score, 0, 100);
    }

    public static int CalculerLocation(Location location, int nbDocuments, int nbSignalements)
    {
        int score = 0;

        // Infos de base (35 pts)
        if (!string.IsNullOrWhiteSpace(location.Titre))    score += 5;
        if (!string.IsNullOrWhiteSpace(location.Quartier)) score += 5;
        if (location.Loyer > 0)   score += 5;
        if (location.Caution >= 0) score += 5;
        if (location.Avance >= 0)  score += 5;
        if (location.NombrePieces > 0) score += 5;
        if (location.DateConfirmationDisponibilite.HasValue) score += 5;

        // Médias (20 pts)
        if (location.Medias.Count >= 1) score += 10;
        if (location.Medias.Count >= 4) score += 10;

        // Documents (20 pts)
        if (nbDocuments >= 1) score += 10;
        if (nbDocuments >= 2) score += 10;

        // Pas de signalements (25 pts)
        score += nbSignalements == 0 ? 25
               : nbSignalements == 1 ? 10 : 0;

        return Math.Clamp(score, 0, 100);
    }
}
