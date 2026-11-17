using System.Text.Json;

namespace MaMaison.Api.Controllers;

public record SiteSettings(bool Demo3dEnabled, Guid Version, DateTimeOffset? UpdatedAt, string? UpdatedBy);

/// <summary>Single API instance; persist outside wwwroot on a dedicated backed-up volume.</summary>
public sealed class SiteSettingsStore
{
    private readonly string path;
    private readonly SemaphoreSlim gate = new(1, 1);
    public SiteSettingsStore(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var directory = Path.GetFullPath(configuration["SiteSettings:Directory"]
            ?? Path.Combine(environment.ContentRootPath, "data", "site-settings"));
        var webRoot = Path.GetFullPath(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"));
        var relative = Path.GetRelativePath(webRoot, directory);
        if (relative == "." || (!relative.StartsWith(".." + Path.DirectorySeparatorChar)
            && relative != ".." && !Path.IsPathRooted(relative)))
            throw new InvalidOperationException("Les réglages doivent rester hors de wwwroot.");
        Directory.CreateDirectory(directory);
        path = Path.Combine(directory, "site-settings.json");
    }

    public async Task<SiteSettings> ReadAsync(CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try { return await ReadCore(ct); }
        finally { gate.Release(); }
    }

    private async Task<SiteSettings> ReadCore(CancellationToken ct)
    {
        if (!File.Exists(path)) return new(false, Guid.Empty, null, null);
        return JsonSerializer.Deserialize<SiteSettings>(await File.ReadAllTextAsync(path, ct))
            ?? throw new InvalidDataException("Réglages illisibles.");
    }

    public async Task<SiteSettings?> SaveAsync(bool enabled, Guid version, string actor, CancellationToken ct)
    {
        await gate.WaitAsync(ct);
        try
        {
            var current = await ReadCore(ct);
            if (current.Version != version) return null;
            var next = new SiteSettings(enabled, Guid.NewGuid(), DateTimeOffset.UtcNow, actor);
            var temporary = path + ".pending";
            await File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(next), ct);
            File.Move(temporary, path, overwrite: true);
            return next;
        }
        finally { gate.Release(); }
    }
}
