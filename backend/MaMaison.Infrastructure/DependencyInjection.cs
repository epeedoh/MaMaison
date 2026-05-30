using MaMaison.Domain.Interfaces;
using MaMaison.Infrastructure.Data;
using MaMaison.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MaMaison.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<MaMaisonDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("MaMaison"),
                sql => sql.MigrationsAssembly(typeof(MaMaisonDbContext).Assembly.FullName)));

        services.AddScoped<IVillaRepository, VillaRepository>();
        services.AddScoped<ILocationRepository, LocationRepository>();
        services.AddScoped<ITerrainRepository, TerrainRepository>();

        return services;
    }
}
