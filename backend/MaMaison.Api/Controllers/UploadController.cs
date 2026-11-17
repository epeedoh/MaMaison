using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MaMaison.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private const long MaxImageBytes = 5 * 1024 * 1024;
    private readonly string _uploadPath;

    public UploadController(IWebHostEnvironment env)
    {
        _uploadPath = Path.Combine(env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        Directory.CreateDirectory(_uploadPath);
    }

    /// <summary>Upload une image (max 5MB, JPEG/PNG/WebP)</summary>
    [HttpPost("image")]
    [RequestSizeLimit(MaxImageBytes + 64 * 1024)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Aucun fichier fourni." });

        var contentType = file.ContentType.Split(';', 2)[0].Trim().ToLowerInvariant();
        var extension = contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => null
        };
        if (extension is null)
            return BadRequest(new { message = "Format non supporté. Utilisez JPEG, PNG ou WebP." });

        if (file.Length > MaxImageBytes)
            return BadRequest(new { message = "Fichier trop volumineux (max 5 MB)." });

        if (!await HasExpectedSignature(file, contentType, ct))
            return BadRequest(new { message = "Le contenu du fichier ne correspond pas au format annoncé." });

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(_uploadPath, fileName);

        await using (var stream = new FileStream(
            filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920,
            FileOptions.Asynchronous | FileOptions.SequentialScan))
        {
            await file.CopyToAsync(stream, ct);
        }

        var url = $"/uploads/{fileName}";
        return Ok(new { url, fileName, size = file.Length });
    }

    private static async Task<bool> HasExpectedSignature(
        IFormFile file, string contentType, CancellationToken ct)
    {
        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken: ct);

        return contentType switch
        {
            "image/jpeg" => read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => read >= 8 && header.AsSpan(0, 8).SequenceEqual(
                new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/webp" => read >= 12
                && header.AsSpan(0, 4).SequenceEqual("RIFF"u8)
                && header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
    }
}
