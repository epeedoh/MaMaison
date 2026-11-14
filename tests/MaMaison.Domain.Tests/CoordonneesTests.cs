using MaMaison.Domain.Entities;
namespace MaMaison.Domain.Tests;
public class CoordonneesTests
{
    [Theory]
    [InlineData(91, 0)]
    [InlineData(0, 181)]
    [InlineData(double.NaN, 0)]
    [InlineData(0, double.PositiveInfinity)]
    public void RefuseCoordonneesInvalides(double latitude, double longitude)
        => Assert.Throws<ArgumentException>(() => Coordonnees.Valider(latitude, longitude));
    [Theory]
    [InlineData(0, 0)]
    [InlineData(5.3599, -4.0083)]
    [InlineData(-90, 180)]
    public void AccepteCoordonneesValides(double latitude, double longitude)
        => Coordonnees.Valider(latitude, longitude);
}
