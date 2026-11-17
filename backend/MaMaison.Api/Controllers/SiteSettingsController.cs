using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MaMaison.Api.Controllers;

[ApiController]
public class SiteSettingsController(SiteSettingsStore store, IConfiguration configuration) : ControllerBase
{
    [HttpGet("api/site-config")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Public(CancellationToken ct)
    {
        try
        {
            var value = await store.ReadAsync(ct);
            return Ok(new { value.Demo3dEnabled, WhatsappNumber = configuration["SiteSettings:WhatsappNumber"] ?? "" });
        }
        catch (Exception ex) when (ex is IOException or System.Text.Json.JsonException)
        {
            // Fail closed; catalogue/contact remain usable if settings cannot be read.
            return StatusCode(503, new { demo3dEnabled = false, whatsappNumber = "" });
        }
    }

    [HttpGet("api/admin/site-config")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Read(CancellationToken ct) => Ok(await store.ReadAsync(ct));

    public record UpdateCommand([Required] bool? Demo3dEnabled, [Required] Guid? Version);

    [HttpPut("api/admin/site-config")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    [RequestSizeLimit(2048)]
    public async Task<IActionResult> Update(UpdateCommand command, CancellationToken ct)
    {
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actor, out _)) return Unauthorized();
        if (command.Demo3dEnabled is null || command.Version is null) return BadRequest();
        var saved = await store.SaveAsync(command.Demo3dEnabled.Value, command.Version.Value, actor!, ct);
        return saved is null
            ? Conflict(new { message = "Réglages modifiés dans une autre session. Rechargez avant de réessayer." })
            : Ok(saved);
    }
}
