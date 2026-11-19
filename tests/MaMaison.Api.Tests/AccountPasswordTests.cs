using MaMaison.Api.Security;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;
using System.Text;

namespace MaMaison.Api.Tests;

public class AccountPasswordTests
{
    [Fact]
    public void SecureAndLegacyFormatsAreReadWithoutAcceptingInvalidCredentials()
    {
        var service = new AccountPasswords();
        const string password = "synthetic testing phrase";
        var legacy = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
        var encoded = service.Hash(password);
        Assert.NotEqual(encoded, service.Hash(password));
        Assert.Equal(PasswordVerificationResult.Success, service.Verify(encoded, password));
        Assert.Equal(PasswordVerificationResult.SuccessRehashNeeded, service.Verify(legacy, password));
        foreach (var stored in new[] { null, "not-a-hash", legacy, encoded })
            Assert.Equal(PasswordVerificationResult.Failed, service.Verify(stored, "incorrect"));
    }
}
