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
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? ["http://localhost:4200"])
              .AllowAnyHeader()
              .AllowAnyMethod();
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

app.UseHttpsRedirection();
app.UseCors("MaMaisonCors");
app.UseAuthorization();
app.MapControllers();

app.Run();
