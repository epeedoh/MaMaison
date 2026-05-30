using MaMaison.Domain.Common;

namespace MaMaison.Domain.Entities;

public enum TypeMedia { Photo, Video, Document }

public class MediaBien : BaseEntity
{
    public Guid BienId { get; private set; }
    public TypeMedia TypeMedia { get; private set; }
    public string Url { get; private set; } = string.Empty;
    public int Ordre { get; private set; }

    private MediaBien() { }

    public static MediaBien Creer(Guid bienId, TypeMedia type, string url, int ordre = 0)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        return new MediaBien { BienId = bienId, TypeMedia = type, Url = url, Ordre = ordre };
    }
}
