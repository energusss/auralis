using Auralis.Domain;
namespace Auralis.Application;
public interface IMusicProvider {
 string Status {get;}
 Task<SearchResult> SearchAsync(string query, string type, string? cursor, CancellationToken ct);
 Task<Track?> GetTrackAsync(string id, CancellationToken ct);
 Task<Artist?> GetArtistAsync(string id, CancellationToken ct);
 Task<Album?> GetAlbumAsync(string id, CancellationToken ct);
 Task<MusicPlaylist?> GetPlaylistAsync(string id, CancellationToken ct);
 Task<IReadOnlyList<Track>> GetRecommendationsAsync(IEnumerable<Track> seeds, CancellationToken ct);
 Task<HomeResult> GetHomeAsync(CancellationToken ct);
}
