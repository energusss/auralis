using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Net.Mail;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Auralis.Api;

public sealed record GoogleIdentity(string Subject, string Email, string Name);

public sealed class GoogleTokenVerifier(IConfiguration configuration)
{
    private static readonly ConfigurationManager<OpenIdConnectConfiguration> Metadata = new(
        "https://accounts.google.com/.well-known/openid-configuration",
        new OpenIdConnectConfigurationRetriever(),
        new HttpDocumentRetriever { RequireHttps = true });

    public async Task<GoogleIdentity?> Verify(string? token, CancellationToken cancellationToken)
    {
        var clientId = configuration["GOOGLE_CLIENT_ID"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(token)) return null;
        try
        {
            var metadata = await Metadata.GetConfigurationAsync(cancellationToken);
            var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuers = ["https://accounts.google.com", "accounts.google.com"],
                ValidateAudience = true,
                ValidAudience = clientId,
                ValidateLifetime = true,
                RequireExpirationTime = true,
                RequireSignedTokens = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = metadata.SigningKeys,
                ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);
            var subject = principal.FindFirstValue("sub");
            var email = principal.FindFirstValue("email");
            var verified = principal.FindFirstValue("email_verified");
            if (string.IsNullOrWhiteSpace(subject) || subject.Length > 255 ||
                string.IsNullOrWhiteSpace(email) || email.Length > 254 || !MailAddress.TryCreate(email, out _) ||
                !string.Equals(verified, "true", StringComparison.OrdinalIgnoreCase)) return null;
            return new(subject, email.Trim().ToLowerInvariant(), principal.FindFirstValue("name") ?? email);
        }
        catch (Exception e) when (e is SecurityTokenException or ArgumentException or InvalidOperationException or HttpRequestException or TaskCanceledException)
        {
            return null;
        }
    }
}
