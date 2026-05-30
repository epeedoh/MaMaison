using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public class HotspotVisite : BaseEntity
{
    public Guid PointVisiteId { get; private set; }
    public string Libelle { get; private set; } = string.Empty;
    public string? Contenu { get; private set; }
    public float PositionX { get; private set; }
    public float PositionY { get; private set; }
    public float PositionZ { get; private set; }

    private HotspotVisite() { }

    public static HotspotVisite Creer(Guid pointVisiteId, string libelle,
        float posX, float posY, float posZ, string? contenu = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(libelle);
        return new HotspotVisite
        {
            PointVisiteId = pointVisiteId,
            Libelle = libelle,
            Contenu = contenu,
            PositionX = posX, PositionY = posY, PositionZ = posZ
        };
    }
}
