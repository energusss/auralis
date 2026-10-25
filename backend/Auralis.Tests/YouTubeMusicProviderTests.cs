using System.Net;
using Auralis.Infrastructure;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Auralis.Tests;

public sealed class YouTubeMusicProviderTests
{
    [Fact]
    public async Task All_search_classifies_video_channel_and_playlist_by_stable_provider_id()
    {
        var handler = new FixtureHandler(request =>
        {
            if (request.RequestUri!.AbsolutePath.EndsWith("/videos"))
                return """{"items":[{"id":"abcdefghijk","contentDetails":{"duration":"PT3M20S"}}]}""";
            return """
            {"nextPageToken":"next","items":[
              {"id":{"kind":"youtube#video","videoId":"abcdefghijk"},"snippet":{"title":"A song","channelTitle":"Adele","channelId":"UC-adele","thumbnails":{"medium":{"url":"https://img.example/song.jpg"}}}},
              {"id":{"kind":"youtube#channel","channelId":"UC-adele"},"snippet":{"title":"Adele","channelTitle":"Adele","channelId":"UC-adele"}},
              {"id":{"kind":"youtube#playlist","playlistId":"PL-adele"},"snippet":{"title":"Adele collection"}},
              {"id":{"kind":"youtube#channel","channelId":"UC-channel-only"},"snippet":{"title":"Channel that is not a song"}}
            ]}
            """;
        });
        using var client = new HttpClient(handler);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var provider = new YouTubeMusicProvider(client, cache, new DemoMusicProvider(), "test-key");

        var result = await provider.SearchAsync("Adele", "all", null, default);

        var track = Assert.Single(result.Tracks);
        Assert.Equal("yt:abcdefghijk", track.Id);
        Assert.Equal("yt:UC-adele", track.ArtistId);
        Assert.Equal(200, track.Duration);
        Assert.Equal("abcdefghijk", track.Playback.VideoId);
        Assert.Equal("https://img.example/song.jpg", track.Artwork);
        Assert.Equal("next", result.NextCursor);
        Assert.Equal(new[] { "yt:UC-adele", "yt:UC-channel-only" }, result.Artists.Select(x => x.Id));
        Assert.Equal("yt:PL-adele", Assert.Single(result.Playlists).Id);
    }

    [Fact]
    public async Task Dedicated_artist_search_never_maps_channel_to_track()
    {
        var handler = new FixtureHandler(_ => """{"items":[{"id":{"kind":"youtube#channel","channelId":"UC-artist"},"snippet":{"title":"Artist"}}]}""");
        using var client = new HttpClient(handler);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var provider = new YouTubeMusicProvider(client, cache, new DemoMusicProvider(), "test-key");

        var result = await provider.SearchAsync("Artist", "artists", null, default);

        Assert.Empty(result.Tracks);
        Assert.Equal("yt:UC-artist", Assert.Single(result.Artists).Id);
    }

    private sealed class FixtureHandler(Func<HttpRequestMessage, string> response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(response(request)) });
    }
}
