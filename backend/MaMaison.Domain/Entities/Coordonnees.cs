namespace MaMaison.Domain.Entities;
public static class Coordonnees
{
    public static void Valider(double latitude, double longitude)
    {
        if (!double.IsFinite(latitude) || !double.IsFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
            throw new ArgumentException("Coordonnées GPS invalides.");
    }
}
