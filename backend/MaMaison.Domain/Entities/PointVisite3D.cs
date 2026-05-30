using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public class PointVisite3D : BaseEntity
{
    public Guid VillaId { get; private set; }
    public string NomPiece { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public float PositionX { get; private set; }
    public float PositionY { get; private set; }
    public float PositionZ { get; private set; }
    public float RotationX { get; private set; }
    public float RotationY { get; private set; }
    public float RotationZ { get; private set; }
    public int Ordre { get; private set; }

    private readonly List<HotspotVisite> _hotspots = [];
    public IReadOnlyCollection<HotspotVisite> Hotspots => _hotspots.AsReadOnly();

    private PointVisite3D() { }

    public static PointVisite3D Creer(Guid villaId, string nomPiece, int ordre,
        float posX, float posY, float posZ, float rotX = 0, float rotY = 0, float rotZ = 0,
        string? description = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nomPiece);
        return new PointVisite3D
        {
            VillaId = villaId,
            NomPiece = nomPiece,
            Description = description,
            PositionX = posX, PositionY = posY, PositionZ = posZ,
            RotationX = rotX, RotationY = rotY, RotationZ = rotZ,
            Ordre = ordre
        };
    }
}
