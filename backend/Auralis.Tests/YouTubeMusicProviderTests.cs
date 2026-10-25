using System.Net;
using System.Net.Http;
using Auralis.Infrastructure;
using Microsoft.Extensions.Caching.Memory;
using Xunit;

namespace Auralis.Tests;

public class YouTubeMusicProviderTests
{
    [Fact]
    public async Task All_search_keeps_channels_and_playlists_out_of_playable_tracks()
    {
        var handler = new FixtureHandler(request =>
        {
            var type = System.Web.HttpUtility.ParseQueryString(request.RequestUri!.Query)["type"];
            return type switch
            {
                "channel" => """{"items":[{"id":{"kind":"youtube#channel","channelId":"UCchannel"},"snippet":{"title":"Artist Channel","channelTitle":"Artist Channel","channelId":"UCchannel"}}]}""",
                "playlist" => """{"items":[{"id":{"kind":"youtube#playlist","playlistId":"PL123"},"snippet":{"title":"Artist Collection","channelTitle":"Artist Channel"}}]}""",
                _ => """{"items":[{"id":{"kind":"youtube#video","videoId":"abcdefghijk"},"snippet":{"title":"A song","channelTitle":"Artist Channel","channelId":"UCchannel"}}]}"""
            };
        });
        using var client = new HttpClient(handler);
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var provider = new YouTubeMusicProvider(client, cache, new DemoMusicProvider(), "test-key");

        var results = await provider.SearchAsync("Artist Channel", "all", null, default);

        Assert.Single(results.Tracks);
        Assert.Equal("yt:abcdefghijk", results.Tracks[0].Id);
        Assert.Single(results.Artists);
        Assert.Equal("yt:UCchannel", results.Artists[0].Id);
        Assert.Single(results.Playlists);
        Assert.Equal("yt:PL123", results.Playlists[0].Id);
    }

    private sealed class FixtureHandler(Func<HttpRequestMessage, string> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(respond(request)) });
    }
}
