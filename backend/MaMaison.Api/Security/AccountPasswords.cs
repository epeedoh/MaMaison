using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace MaMaison.Api.Security;

public sealed class AccountPasswords
{
    private readonly PasswordHasher<string> hasher = new(Options.Create(new PasswordHasherOptions
    {
        CompatibilityMode = PasswordHasherCompatibilityMode.IdentityV3,
        IterationCount = 210_000
    }));
    private readonly string dummy;

    public AccountPasswords() => dummy = Hash(Convert.ToHexString(RandomNumberGenerator.GetBytes(32)));

    public string Hash(string password) => hasher.HashPassword(string.Empty, password);

    public PasswordVerificationResult Verify(string? stored, string password)
    {
        if (stored is { Length: 64 } && stored.All(Uri.IsHexDigit))
        {
            var actual = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            if (CryptographicOperations.FixedTimeEquals(actual, Convert.FromHexString(stored)))
                return PasswordVerificationResult.SuccessRehashNeeded;
            stored = null;
        }
        try
        {
            var result = hasher.VerifyHashedPassword(string.Empty, stored ?? dummy, password);
            return stored is null ? PasswordVerificationResult.Failed : result;
        }
        catch (FormatException) { return PasswordVerificationResult.Failed; }
    }
}
