using MaMaison.Application.Configuration;
using MaMaison.Infrastructure;
using MaMaison.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.Configure<FeatureFlags>(
    builder.Configuration.GetSection("FeatureFlags"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("MaMaisonCors", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Dev : accepte localhost (tout port) + tunnels VS Code devtunnels.ms
            policy.SetIsOriginAllowed(origin =>
                {
                    var host = new Uri(origin).Host;
                    return host is "localhost" or "127.0.0.1"
                        || host.EndsWith(".devtunnels.ms")
                        || host.EndsWith(".githubpreview.dev");
                })
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(
                    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                    ?? ["https://mamaison.ci"])
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Seed demo data on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MaMaisonDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<MaMaisonDbContext>>();
    await DataSeeder.SeedAsync(db, logger);
}

// En dev, pas de redirection HTTPS (évite le 307 qui bloque Angular)
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("MaMaisonCors");
app.UseAuthorization();
app.MapControllers();

app.Run();
