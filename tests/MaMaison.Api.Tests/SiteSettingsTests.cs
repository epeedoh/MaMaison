using MaMaison.Api.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using System.Security.Claims;
using System.Text.Json;

namespace MaMaison.Api.Tests;

public sealed class SiteSettingsTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), "mamaison-settings-" + Guid.NewGuid().ToString("N"));
    private readonly IConfiguration config = new ConfigurationBuilder().Build();
    private SiteSettingsStore Store() => new(config, new TestEnvironment(root));

    [Fact]
    public async Task MissingSettingsAreDisabledAndChangesSurviveRecreation()
    {
        var store = Store();
        var initial = await store.ReadAsync(default);
        Assert.False(initial.Demo3dEnabled);
        var saved = await store.SaveAsync(true, initial.Version, "test-actor", default);
        Assert.NotNull(saved);
        Assert.True((await Store().ReadAsync(default)).Demo3dEnabled);
        var disabled = await store.SaveAsync(false, saved.Version, "test-actor", default);
        Assert.False(disabled!.Demo3dEnabled);
        Assert.False((await Store().ReadAsync(default)).Demo3dEnabled);
    }

    [Fact]
    public async Task ConcurrentUpdatesWithTheSameVersionHaveOneWinner()
    {
        var store = Store();
        var results = await Task.WhenAll(store.SaveAsync(true, Guid.Empty, "A", default),
            store.SaveAsync(false, Guid.Empty, "B", default));
        Assert.Single(results, r => r is not null);
    }

    [Fact]
    public async Task PublicResponseDoesNotDiscloseActorOrVersion()
    {
        var store = Store();
        await store.SaveAsync(true, Guid.Empty, "PRIVATE-ACTOR", default);
        var response = Assert.IsType<OkObjectResult>(await new SiteSettingsController(store, config).Public(default));
        var json = JsonSerializer.Serialize(response.Value);
        Assert.DoesNotContain("PRIVATE-ACTOR", json);
        Assert.DoesNotContain("Version", json);
    }

    [Fact]
    public async Task CorruptSettingsFailClosed()
    {
        var store = Store();
        await File.WriteAllTextAsync(Path.Combine(root, "data", "site-settings", "site-settings.json"), "not json");
        var response = Assert.IsType<ObjectResult>(await new SiteSettingsController(store, config).Public(default));
        Assert.Equal(503, response.StatusCode);
    }

    [Fact]
    public async Task UpdateRequiresAnIdentifiedActorAndDetectsStaleVersion()
    {
        var controller = new SiteSettingsController(Store(), config)
        { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() } };
        var command = new SiteSettingsController.UpdateCommand(true, Guid.Empty);
        Assert.IsType<UnauthorizedResult>(await controller.Update(command, default));
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "test"));
        Assert.IsType<OkObjectResult>(await controller.Update(command, default));
        Assert.IsType<ConflictObjectResult>(await controller.Update(command, default));
        Assert.IsType<BadRequestResult>(await controller.Update(new(null, null), default));
    }

    [Theory]
    [InlineData(nameof(SiteSettingsController.Read))]
    [InlineData(nameof(SiteSettingsController.Update))]
    public void AdminRoutesRequireAdminRole(string name)
    {
        var auth = Assert.Single(typeof(SiteSettingsController).GetMethod(name)!
            .GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>());
        Assert.Equal("Admin,SuperAdmin", auth.Roles);
    }

    [Fact]
    public void RecordValidationIsOnConstructorParametersAsRequiredByMvc()
    {
        var type = typeof(SiteSettingsController.UpdateCommand);
        foreach (var property in type.GetProperties())
            Assert.Empty(property.GetCustomAttributes(typeof(System.ComponentModel.DataAnnotations.RequiredAttribute), true));
        foreach (var parameter in type.GetConstructors().Single().GetParameters())
            Assert.Single(parameter.GetCustomAttributes(typeof(System.ComponentModel.DataAnnotations.RequiredAttribute), true));
    }

    [Fact]
    public void PublicDirectoryCannotStoreSettings()
    {
        var invalid = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            { ["SiteSettings:Directory"] = Path.Combine(root, "wwwroot", "settings") }).Build();
        Assert.Throws<InvalidOperationException>(() => new SiteSettingsStore(invalid, new TestEnvironment(root)));
    }

    public void Dispose() { if (Directory.Exists(root)) Directory.Delete(root, true); }
    private sealed class TestEnvironment(string path) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = path;
        public string WebRootPath { get; set; } = Path.Combine(path, "wwwroot");
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}
