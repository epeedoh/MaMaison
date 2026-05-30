namespace MaMaison.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime DateCreation { get; protected set; } = DateTime.UtcNow;
    public DateTime? DateModification { get; protected set; }

    protected void MarquerModifie() => DateModification = DateTime.UtcNow;
}
