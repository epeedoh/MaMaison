using AspNetCoreRateLimit;
using MaMaison.Application.Configuration;
using MaMaison.Infrastructure;
using MaMaison.Infrastructure.Data;
using MaMaison.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(builder.Configuration);

// ── Rate Limiting ───────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.EnableEndpointRateLimiting = true;
    options.StackBlockedRequests       = false;
    options.HttpStatusCode             = 429;
    options.GeneralRules = [
        // Règle globale: 200 req/min par IP
        new() { Endpoint = "*", Period = "1m", Limit = 200 },
        // Auth: limiter les tentatives de login (sécurité)
        new() { Endpoint = "POST:/api/auth/login",    Period = "5m",  Limit = 10 },
        new() { Endpoint = "POST:/api/auth/register", Period = "10m", Limit = 5  },
        // Upload: 20 uploads/heure
        new() { Endpoint = "POST:/api/upload/image",  Period = "1h",  Limit = 20 },
        // Recherche: 100 req/min
        new() { Endpoint = "GET:/api/recherche",      Period = "1m",  Limit = 100 },
    ];
});
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddInMemoryRateLimiting();

// ── JWT Authentication ──────────────────────────────────────────
builder.Services.AddScoped<TokenService>();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? "MaMaison-Secret-Key-2025-At-Least-32-Characters!";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"] ?? "mamaison-api",
            ValidAudience            = builder.Configuration["Jwt:Audience"] ?? "mamaison-app",
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();

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

app.UseIpRateLimiting();
app.UseStaticFiles();
app.UseCors("MaMaisonCors");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
