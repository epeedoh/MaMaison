using System.Text;
using System.Text.Json;
using MaMaison.Api.Controllers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

namespace MaMaison.Api.Tests;

public sealed class PilotUploadTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"mamaison-pilot-upload-{Guid.NewGuid():N}");

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ImageUpload_RequiresAuthentication(bool authenticated)
    {
        Assert.Equal(authenticated, await PilotApiFixture.Authorized(
            typeof(UploadController), nameof(UploadController.UploadImage),
            PilotApiFixture.Principal(Guid.NewGuid().ToString(), authenticated: authenticated)));
    }

    [Theory]
    [InlineData("image/jpeg", "<html><script>alert(1)</script></html>")]
    [InlineData("image/png", "<svg onload='alert(1)'/>")]
    [InlineData("image/webp", "RIFFnot-a-webp")]
    public async Task ImageUpload_RejectsActiveContentWithSpoofedMime(string mime, string content)
    {
        var controller = Controller();
        var file = FileFixture("untrusted.html", mime, Encoding.UTF8.GetBytes(content));

        Assert.IsType<BadRequestObjectResult>(await controller.UploadImage(file, default));
        Assert.Empty(UploadedFiles());
    }

    [Theory]
    [InlineData("image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF, 0 }, ".jpg")]
    [InlineData("image/png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, ".png")]
    [InlineData("IMAGE/PNG; charset=binary", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, ".png")]
    [InlineData("image/webp", new byte[] { 82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80 }, ".webp")]
    public async Task ImageUpload_ValidatesSignatureAndIgnoresClientFilename(string mime, byte[] bytes, string extension)
    {
        var controller = Controller();
        var file = FileFixture("../../untrusted.html", mime, bytes);

        var result = Assert.IsType<OkObjectResult>(await controller.UploadImage(file, default));
        var response = JsonSerializer.SerializeToElement(result.Value);
        var stored = Assert.Single(UploadedFiles());
        Assert.Equal(extension, Path.GetExtension(stored));
        Assert.True(Guid.TryParseExact(Path.GetFileNameWithoutExtension(stored), "N", out _));
        Assert.Equal(Path.GetFileName(stored), response.GetProperty("fileName").GetString());
        Assert.Equal("/uploads/" + Path.GetFileName(stored), response.GetProperty("url").GetString());
        Assert.Equal(bytes.Length, response.GetProperty("size").GetInt64());
        Assert.Equal(bytes, await File.ReadAllBytesAsync(stored));
    }

    [Theory]
    [InlineData("text/html")]
    [InlineData("image/svg+xml")]
    [InlineData("application/octet-stream")]
    [InlineData("")]
    public async Task ImageUpload_RejectsUnsupportedMime(string mime)
    {
        var controller = Controller();
        var file = FileFixture("photo.jpg", mime, [0xFF, 0xD8, 0xFF]);
        Assert.IsType<BadRequestObjectResult>(await controller.UploadImage(file, default));
        Assert.Empty(UploadedFiles());
    }

    [Fact]
    public async Task ImageUpload_RejectsMissingEmptyOrTruncatedFile()
    {
        var controller = Controller();
        Assert.IsType<BadRequestObjectResult>(await controller.UploadImage(null!, default));
        Assert.IsType<BadRequestObjectResult>(await controller.UploadImage(FileFixture("photo.jpg", "image/jpeg", []), default));
        Assert.IsType<BadRequestObjectResult>(await controller.UploadImage(FileFixture("photo.jpg", "image/jpeg", [0xFF, 0xD8]), default));
        Assert.Empty(UploadedFiles());
    }

    [Theory]
    [InlineData(5 * 1024 * 1024, true)]
    [InlineData(5 * 1024 * 1024 + 1, false)]
    public async Task ImageUpload_EnforcesFileSizeBoundary(int length, bool accepted)
    {
        var controller = Controller();
        var bytes = new byte[length];
        bytes[0] = 0xFF;
        bytes[1] = 0xD8;
        bytes[2] = 0xFF;

        var result = await controller.UploadImage(FileFixture("photo.jpg", "image/jpeg", bytes), default);
        if (accepted)
        {
            Assert.IsType<OkObjectResult>(result);
            Assert.Equal(length, new FileInfo(Assert.Single(UploadedFiles())).Length);
        }
        else
        {
            Assert.IsType<BadRequestObjectResult>(result);
            Assert.Empty(UploadedFiles());
        }
    }

    private UploadController Controller() => new(new FixtureEnvironment
    {
        WebRootPath = Path.Combine(_root, "wwwroot"),
        ContentRootPath = _root
    });

    private static FormFile FileFixture(string name, string contentType, byte[] bytes) =>
        new(new MemoryStream(bytes), 0, bytes.Length, "file", name)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };

    private string[] UploadedFiles()
    {
        var path = Path.Combine(_root, "wwwroot", "uploads");
        return Directory.Exists(path) ? Directory.GetFiles(path) : [];
    }

    public void Dispose()
    {
        var root = Path.GetFullPath(_root);
        var parent = Path.TrimEndingDirectorySeparator(Path.GetFullPath(Path.GetTempPath()));
        if (!string.Equals(Path.GetDirectoryName(root), parent, StringComparison.OrdinalIgnoreCase)
            || !Path.GetFileName(root).StartsWith("mamaison-pilot-upload-", StringComparison.Ordinal))
            throw new InvalidOperationException("Unexpected upload fixture directory.");
        if (Directory.Exists(root)) Directory.Delete(root, true);
    }

    private sealed class FixtureEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "MaMaison.Api.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
