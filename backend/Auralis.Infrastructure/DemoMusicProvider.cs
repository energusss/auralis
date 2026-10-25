using System.Reflection;
using System.Text.Json;
using Auralis.Domain;
using Auralis.Application;
namespace Auralis.Infrastructure;
public class DemoMusicProvider : IMusicProvider {
 public string Status=>"Creative Commons audio catalog · optional YouTube metadata discovery when YOUTUBE_API_KEY is configured";
 private readonly Track[] tracks;
 public DemoMusicProvider() { using var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("Auralis.Infrastructure.demo-catalog.json")!; tracks=JsonSerializer.Deserialize<Track[]>(stream,new JsonSerializerOptions(JsonSerializerDefaults.Web))!; }
 private ArtistSummary ArtistSummary=>new("demo:kevin-macleod","Kevin MacLeod",tracks[0].Artwork);
 private AlbumSummary Collection=>new("demo:incompetech-selection","Incompetech — Creative Commons selection","Kevin MacLeod","demo:kevin-macleod",tracks[0].Artwork,0);
 public Task<SearchResult> SearchAsync(string q,string type,string? cursor,CancellationToken ct) {
 var found=tracks.Where(t=>$"{t.Title} {t.Artist} {t.Genre}".Contains(q,StringComparison.OrdinalIgnoreCase)).ToArray();
 return Task.FromResult(new SearchResult(type is "all" or "songs"?found:[],type is "all" or "artists" && "Kevin MacLeod".Contains(q,StringComparison.OrdinalIgnoreCase)?[ArtistSummary]:[],type is "all" or "albums" && (Collection.Title.Contains(q,StringComparison.OrdinalIgnoreCase)||found.Length>0)?[Collection]:[],[]));
 }
 public Task<Track?> GetTrackAsync(string id,CancellationToken ct)=>Task.FromResult(tracks.FirstOrDefault(x=>x.Id==id));
 public Task<Artist?> GetArtistAsync(string id,CancellationToken ct)=>Task.FromResult<Artist?>(id==ArtistSummary.Id?new(id,ArtistSummary.Name,ArtistSummary.Artwork,"Kevin MacLeod publishes royalty-free music at incompetech.com. This selection is licensed under Creative Commons Attribution 4.0; credit the composer when reusing the music.",tracks,[Collection],[]):null);
 public Task<Album?> GetAlbumAsync(string id,CancellationToken ct)=>Task.FromResult<Album?>(id==Collection.Id?new(id,Collection.Title,Collection.Artist,Collection.ArtistId,Collection.Artwork,0,tracks):null);
 public Task<MusicPlaylist?> GetPlaylistAsync(string id,CancellationToken ct)=>Task.FromResult<MusicPlaylist?>(id=="demo:selection"?new(id,Collection.Title,Collection.Artwork,tracks):null);
 public Task<IReadOnlyList<Track>> GetRecommendationsAsync(IEnumerable<Track> seeds,CancellationToken ct) {var s=seeds.ToArray(); var genres=s.Select(t=>t.Genre).ToHashSet();return Task.FromResult<IReadOnlyList<Track>>(tracks.OrderByDescending(t=>genres.Contains(t.Genre)).ThenBy(t=>s.Any(x=>x.Id==t.Id)).ToArray());}
 public Task<HomeResult> GetHomeAsync(CancellationToken ct)=>Task.FromResult(new HomeResult(tracks.Take(3).ToArray(),[],[],[ArtistSummary],tracks,Status));
}
