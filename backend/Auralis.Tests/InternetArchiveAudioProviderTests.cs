using System.Net;
using Auralis.Infrastructure;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Auralis.Tests;

public class InternetArchiveAudioProviderTests
{
    private const string Metadata = """
        {"metadata":{"identifier":"DirectionlessEP","title":"Directionless EP","creator":"Broke For Free","licenseurl":"http://creativecommons.org/licenses/by/3.0/"},"files":[{"name":"Broke For Free - Directionless EP - 01 Night Owl.mp3","format":"VBR MP3","source":"derivative","length":"03:14"}]}
        """;

    [Fact]
    public async Task Search_returns_real_catalog_metadata_as_resolvable_not_playable()
    {
        var provider = CreateProvider(Metadata);
        var tracks = await provider.SearchAsync("Directionless EP", CancellationToken.None);
        var track = Assert.Single(tracks);
        Assert.Equal("Night Owl", track.Title);
        Assert.Equal("Broke For Free", track.Artist);
        Assert.Equal(194, track.Duration);
        Assert.Null(track.Playback.Url);
        Assert.Equal("resolvable", track.Playback.Availability);
    }

    [Fact]
    public async Task Resolve_returns_mp3_url_only_for_allowlisted_declared_license()
    {
        var provider = CreateProvider(Metadata);
        var track = Assert.Single(await provider.SearchAsync("Directionless EP", CancellationToken.None));
        var resolution = await provider.ResolveAsync(track.Id, CancellationToken.None);
        Assert.Equal("playable", resolution.Availability);
        Assert.Equal("audio/mpeg", resolution.MediaType);
        Assert.Contains("archive.org/download/DirectionlessEP/", resolution.Url);
        Assert.Null(resolution.ExpiresAt);
        Assert.Equal("http://creativecommons.org/licenses/by/3.0/", resolution.LicenseUrl);
    }

    [Fact]
    public async Task Resolve_rejects_noncommercial_or_unrecognized_license()
    {
        var provider = CreateProvider(Metadata.Replace(
            "http://creativecommons.org/licenses/by/3.0/",
            "http://creativecommons.org/licenses/by-nc/3.0/"));
        Assert.Empty(await provider.SearchAsync("Directionless EP", CancellationToken.None));
        var resolution = await provider.ResolveAsync("ia:DirectionlessEP:b35aec4f8033cb9d", CancellationToken.None);
        Assert.Equal("unavailable", resolution.Availability);
        Assert.Equal("not-found-or-unlicensed", resolution.ErrorCategory);
        Assert.Null(resolution.Url);
    }

    [Fact]
    public async Task Unknown_provider_id_never_resolves_to_a_url()
    {
        var provider = CreateProvider(_ => throw new InvalidOperationException("No request expected"));
        var result = await provider.ResolveAsync("yt:abcdefghijk", CancellationToken.None);
        Assert.Equal("unavailable", result.Availability);
        Assert.Equal("invalid-track-id", result.ErrorCategory);
        Assert.Null(result.Url);
    }

    private static InternetArchiveAudioProvider CreateProvider(string metadata)
    {
        const string search = """{"response":{"docs":[{"identifier":"DirectionlessEP"}]}}""";
        return CreateProvider(request => Json(request.RequestUri!.AbsolutePath.EndsWith("/advancedsearch.php", StringComparison.Ordinal) ? search : metadata));
    }

    private static InternetArchiveAudioProvider CreateProvider(Func<HttpRequestMessage, HttpResponseMessage> response)
    {
        var client = new HttpClient(new Handler(response)) { BaseAddress = new Uri("https://archive.org/") };
        return new InternetArchiveAudioProvider(client, new MemoryCache(new MemoryCacheOptions()));
    }

    private static HttpResponseMessage Json(string value) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(value, System.Text.Encoding.UTF8, "application/json")
    };

    private sealed class Handler(Func<HttpRequestMessage, HttpResponseMessage> response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(response(request));
    }
}
