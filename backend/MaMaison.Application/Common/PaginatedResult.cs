namespace MaMaison.Application.Common;

public record PaginatedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
)
{
    public bool HasNext => Page < TotalPages;
    public bool HasPrev => Page > 1;

    public static async Task<PaginatedResult<T>> CreateAsync(
        IQueryable<T> query, int page, int pageSize,
        CancellationToken ct = default)
    {
        var total = query.Count();
        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return new PaginatedResult<T>(items, total, page, pageSize, totalPages);
    }
}
