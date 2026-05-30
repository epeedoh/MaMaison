namespace MaMaison.Application.Configuration;

public class FeatureFlags
{
    public TerrainFlags Terrains { get; init; } = new();
    public LocationFlags Locations { get; init; } = new();
    public DemarcheurFlags Demarcheurs { get; init; } = new();
    public Visite3DFlags Visite3D { get; init; } = new();
}

public class TerrainFlags
{
    public bool AllowInternalLandPublishing { get; init; } = true;
    public bool AllowOwnerLandPublishing { get; init; } = false;
    public bool AllowBrokerLandPublishing { get; init; } = false;
    public bool AllowAgencyLandPublishing { get; init; } = false;
    public bool AllowPublicLandPublishing { get; init; } = false;
}

public class LocationFlags
{
    public bool AllowOwnerRentalPublishing { get; init; } = true;
    public bool RequireAdminValidationBeforePublishing { get; init; } = true;
}

public class DemarcheurFlags
{
    public bool AllowBrokerRegistration { get; init; } = true;
    public bool AllowBrokerDirectPublishing { get; init; } = false;
    public bool RequireBrokerMandate { get; init; } = true;
}

public class Visite3DFlags
{
    public bool Enable3DVisit { get; init; } = true;
    public bool EnableAICustomization { get; init; } = false;
    public bool EnableMaterialCustomization { get; init; } = false;
}
