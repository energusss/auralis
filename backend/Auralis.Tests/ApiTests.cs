using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Auralis.Api;
using Auralis.Domain;
using Auralis.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;
namespace Auralis.Tests;
public sealed class ApiFactory:WebApplicationFactory<Program> {
 private readonly SqliteConnection connection=new("Data Source=:memory:");
 protected override void ConfigureWebHost(IWebHostBuilder builder){
  connection.Open();builder.UseEnvironment("Testing");builder.ConfigureAppConfiguration((_,c)=>c.AddInMemoryCollection(new Dictionary<string,string?>{{"JWT_KEY","test-only-auralis-secret-long-enough-for-hmac-sha256"},{"SKIP_MIGRATIONS","true"}}));
  builder.ConfigureServices(services=>{foreach(var s in services.Where(s=>s.ServiceType==typeof(DbContextOptions<AuralisDb>)||s.ServiceType.FullName?.Contains("IDbContextOptionsConfiguration")==true).ToArray())services.Remove(s);services.AddDbContext<AuralisDb>(o=>o.UseSqlite(connection));services.AddScoped<AuralisDb>(sp=>new TestDatabase(sp.GetRequiredService<DbContextOptions<AuralisDb>>()));});
 }
 public HttpClient Ready(){var c=CreateClient();using var scope=Services.CreateScope();scope.ServiceProvider.GetRequiredService<AuralisDb>().Database.EnsureCreated();return c;}
 protected override void Dispose(bool disposing){base.Dispose(disposing);if(disposing)connection.Dispose();}
}
// SQLite lacks native DateTimeOffset ordering; this conversion is confined to tests.
public class TestDatabase(DbContextOptions<AuralisDb> options):AuralisDb(options){
 protected override void OnModelCreating(ModelBuilder builder){base.OnModelCreating(builder);foreach(var entity in builder.Model.GetEntityTypes())foreach(var property in entity.GetProperties())if(property.ClrType==typeof(DateTimeOffset))property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.DateTimeOffsetToBinaryConverter());}
}
public class ApiTests {
 static async Task<SessionDto> Register(HttpClient c,string name){var response=await c.PostAsJsonAsync("/api/auth/register",new{email=name+"@example.com",password="valid-password-123",displayName=name});response.EnsureSuccessStatusCode();return (await response.Content.ReadFromJsonAsync<SessionDto>())!;}
 static void Login(HttpClient c,SessionDto s)=>c.DefaultRequestHeaders.Authorization=new AuthenticationHeaderValue("Bearer",s.AccessToken);
 [Fact] public async Task Anonymous_library_access_is_denied(){using var app=new ApiFactory();using var c=app.Ready();Assert.Equal(HttpStatusCode.Unauthorized,(await c.GetAsync("/api/library")).StatusCode);Assert.Equal(HttpStatusCode.OK,(await c.GetAsync("/api/music/home")).StatusCode);}
 [Fact] public async Task Refresh_rotates_and_reuse_revokes_family(){using var app=new ApiFactory();using var c=app.Ready();var session=await Register(c,"rotation");var response=await c.PostAsJsonAsync("/api/auth/refresh",new{refreshToken=session.RefreshToken});response.EnsureSuccessStatusCode();var renewed=(await response.Content.ReadFromJsonAsync<SessionDto>())!;Assert.NotEqual(session.RefreshToken,renewed.RefreshToken);Assert.Equal(HttpStatusCode.Unauthorized,(await c.PostAsJsonAsync("/api/auth/refresh",new{refreshToken=session.RefreshToken})).StatusCode);Assert.Equal(HttpStatusCode.Unauthorized,(await c.PostAsJsonAsync("/api/auth/refresh",new{refreshToken=renewed.RefreshToken})).StatusCode);}
 [Fact] public async Task Playlist_ownership_and_reorder_validation_are_enforced(){using var app=new ApiFactory();using var c=app.Ready();var alice=await Register(c,"alice");var bob=await Register(c,"bob");Login(c,alice);var created=await c.PostAsJsonAsync("/api/playlists",new{name="My mix"});created.EnsureSuccessStatusCode();var playlist=await created.Content.ReadFromJsonAsync<JsonElement>();var id=playlist.GetProperty("id").GetString();var provider=new DemoMusicProvider();var tracks=(await provider.GetHomeAsync(default)).Featured;
 foreach(var t in tracks.Take(2))(await c.PostAsJsonAsync($"/api/playlists/{id}/tracks",t)).EnsureSuccessStatusCode();
 Assert.Equal(HttpStatusCode.BadRequest,(await c.PutAsJsonAsync($"/api/playlists/{id}/order",new{trackIds=new[]{tracks[0].Id,tracks[0].Id}})).StatusCode);
 (await c.PutAsJsonAsync($"/api/playlists/{id}/order",new{trackIds=new[]{tracks[1].Id,tracks[0].Id}})).EnsureSuccessStatusCode();
 var saved=await c.GetFromJsonAsync<JsonElement>($"/api/playlists/{id}");Assert.Equal(tracks[1].Id,saved.GetProperty("tracks")[0].GetProperty("id").GetString());
 Login(c,bob);Assert.Equal(HttpStatusCode.NotFound,(await c.GetAsync($"/api/playlists/{id}")).StatusCode);Assert.Equal(HttpStatusCode.NotFound,(await c.DeleteAsync($"/api/playlists/{id}")).StatusCode);
 Login(c,alice);(await c.DeleteAsync($"/api/playlists/{id}")).EnsureSuccessStatusCode();Assert.Equal(HttpStatusCode.NotFound,(await c.GetAsync($"/api/playlists/{id}")).StatusCode);
 }
 [Fact] public async Task Favorites_persist_and_history_events_are_idempotent(){using var app=new ApiFactory();using var c=app.Ready();Login(c,await Register(c,"listener"));var track=(await new DemoMusicProvider().GetHomeAsync(default)).Featured[0];(await c.PutAsJsonAsync("/api/library/favorites/"+track.Id,track)).EnsureSuccessStatusCode();var eventId=Guid.NewGuid();for(var i=0;i<2;i++)(await c.PostAsJsonAsync("/api/history",new{track,seconds=30,eventId})).EnsureSuccessStatusCode();using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<AuralisDb>();Assert.Single(await db.LibraryItems.ToListAsync());Assert.Single(await db.History.ToListAsync());var stats=await c.GetFromJsonAsync<JsonElement>("/api/statistics");Assert.Equal(30,stats.GetProperty("totalSeconds").GetInt32());}
 [Fact] public async Task Invalid_registration_and_wrong_password_are_rejected(){using var app=new ApiFactory();using var c=app.Ready();Assert.Equal(HttpStatusCode.BadRequest,(await c.PostAsJsonAsync("/api/auth/register",new{email="no",password="weak",displayName=""})).StatusCode);await Register(c,"secure");Assert.Equal(HttpStatusCode.Unauthorized,(await c.PostAsJsonAsync("/api/auth/login",new{email="secure@example.com",password="incorrect"})).StatusCode);}
 [Fact] public async Task Account_library_settings_history_and_logout_roundtrip(){using var app=new ApiFactory();using var c=app.Ready();var session=await Register(c,"roundtrip");Login(c,session);
 var track=(await new DemoMusicProvider().GetHomeAsync(default)).Featured[0];(await c.PutAsJsonAsync("/api/library/favorites/"+track.Id,track)).EnsureSuccessStatusCode();
 (await c.PostAsJsonAsync("/api/history",new{track,seconds=15,eventId=Guid.NewGuid()})).EnsureSuccessStatusCode();
 var lib=await c.GetFromJsonAsync<JsonElement>("/api/library");Assert.Equal(1,lib.GetProperty("favorites").GetArrayLength());Assert.Equal(1,lib.GetProperty("history").GetArrayLength());
 Assert.Single((await c.GetFromJsonAsync<JsonElement[]>("/api/history"))!);
 (await c.PutAsJsonAsync("/api/settings",new{language="en",theme="light",accent="#123456"})).EnsureSuccessStatusCode();
 var settings=await c.GetFromJsonAsync<JsonElement>("/api/settings");Assert.Equal("en",settings.GetProperty("language").GetString());
 (await c.PutAsJsonAsync("/api/auth/me",new{displayName="New name"})).EnsureSuccessStatusCode();Assert.Equal("New name",(await c.GetFromJsonAsync<UserDto>("/api/auth/me"))!.DisplayName);
 (await c.PostAsJsonAsync("/api/auth/logout",new{refreshToken=session.RefreshToken})).EnsureSuccessStatusCode();
 Assert.Equal(HttpStatusCode.Unauthorized,(await c.PostAsJsonAsync("/api/auth/refresh",new{refreshToken=session.RefreshToken})).StatusCode);
 var login=await c.PostAsJsonAsync("/api/auth/login",new{email="roundtrip@example.com",password="valid-password-123"});login.EnsureSuccessStatusCode();Login(c,(await login.Content.ReadFromJsonAsync<SessionDto>())!);
 Assert.Equal(1,(await c.GetFromJsonAsync<JsonElement>("/api/library")).GetProperty("favorites").GetArrayLength());
 }
}
