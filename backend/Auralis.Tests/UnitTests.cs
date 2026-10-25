using Auralis.Application;
using Auralis.Infrastructure;
using Xunit;
namespace Auralis.Tests;
public class UnitTests {
 [Fact] public void Password_hash_uses_independent_salts_and_verifies(){var a=Passwords.Hash("correct horse battery staple");var b=Passwords.Hash("correct horse battery staple");Assert.NotEqual(a,b);Assert.True(Passwords.Verify("correct horse battery staple",a));Assert.False(Passwords.Verify("incorrect",a));Assert.False(Passwords.Verify("x","broken"));}
 [Fact] public void Reordering_requires_exact_permutation(){Assert.True(PlaylistOrder.IsValid(["a","b"],["b","a"]));Assert.False(PlaylistOrder.IsValid(["a","b"],["a","a"]));Assert.False(PlaylistOrder.IsValid(["a","b"],["a"]));Assert.False(PlaylistOrder.IsValid(["a","b"],["a","c"]));}
 [Fact] public async Task Demo_search_has_real_metadata_and_licensed_sources(){var p=new DemoMusicProvider();var result=await p.SearchAsync("Carefree","songs",null,default);var t=Assert.Single(result.Tracks);Assert.Equal("Kevin MacLeod",t.Artist);Assert.Equal("audio",t.Playback.Kind);Assert.StartsWith("https://incompetech.com/",t.Playback.Url);Assert.Contains("CC BY",t.Provider);}
 [Fact] public async Task Recommendations_use_seed_genre(){var p=new DemoMusicProvider();var seed=(await p.SearchAsync("Dream Culture","songs",null,default)).Tracks[0];var r=await p.GetRecommendationsAsync([seed],default);Assert.Equal(seed.Genre,r[0].Genre);}
 [Fact] public async Task Demo_home_does_not_fabricate_trending_or_releases(){var p=new DemoMusicProvider();var home=await p.GetHomeAsync(default);Assert.Empty(home.Trending);Assert.Empty(home.NewReleases);Assert.NotEmpty(home.Featured);}
 [Fact] public void Refresh_tokens_are_stored_as_hashes(){Assert.Equal(64,Passwords.TokenHash("secret").Length);Assert.NotEqual(Passwords.TokenHash("secret"),Passwords.TokenHash("other"));}
}
