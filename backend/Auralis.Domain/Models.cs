namespace Auralis.Domain;

public record Playback(string Kind, string? Url = null, string? VideoId = null);
public record Track(string Id, string Title, string Artist, string ArtistId, string Album, string AlbumId, string Artwork, int Duration, string Genre, string Provider, Playback Playback);
public record ArtistSummary(string Id, string Name, string Artwork);
public record AlbumSummary(string Id, string Title, string Artist, string ArtistId, string Artwork, int Year);
public record Artist(string Id, string Name, string Artwork, string Description, IReadOnlyList<Track> Tracks, IReadOnlyList<AlbumSummary> Albums, IReadOnlyList<ArtistSummary> Related);
public record Album(string Id, string Title, string Artist, string ArtistId, string Artwork, int Year, IReadOnlyList<Track> Tracks);
public record MusicPlaylist(string Id, string Name, string Artwork, IReadOnlyList<Track> Tracks);
public record SearchResult(IReadOnlyList<Track> Tracks, IReadOnlyList<ArtistSummary> Artists, IReadOnlyList<AlbumSummary> Albums, IReadOnlyList<MusicPlaylist> Playlists, string? NextCursor = null);
public record HomeResult(IReadOnlyList<Track> Featured, IReadOnlyList<Track> Trending, IReadOnlyList<AlbumSummary> NewReleases, IReadOnlyList<ArtistSummary> Artists, IReadOnlyList<Track> Recommendations, string ProviderStatus);
public class User {
 public Guid Id {get;set;} = Guid.NewGuid(); public string Email {get;set;} = ""; public string DisplayName {get;set;} = ""; public string PasswordHash {get;set;} = ""; public string? GoogleSubject {get;set;} public DateTimeOffset CreatedAt {get;set;} = DateTimeOffset.UtcNow;
 public string Language {get;set;} = "pl"; public string Theme {get;set;} = "dark"; public string Accent {get;set;} = "#8b5cf6";
}
public class RefreshToken { public Guid Id {get;set;} = Guid.NewGuid(); public Guid UserId {get;set;} public string Hash {get;set;} = ""; public DateTimeOffset ExpiresAt {get;set;} public bool Revoked {get;set;} public Guid FamilyId {get;set;} = Guid.NewGuid(); }
public class Playlist { public Guid Id {get;set;} = Guid.NewGuid(); public Guid UserId {get;set;} public string Name {get;set;} = ""; public string Description {get;set;} = ""; public string Artwork {get;set;} = ""; public DateTimeOffset CreatedAt {get;set;} = DateTimeOffset.UtcNow; public DateTimeOffset UpdatedAt {get;set;} = DateTimeOffset.UtcNow; public List<PlaylistTrack> Tracks {get;set;} = []; }
public class PlaylistTrack { public Guid PlaylistId {get;set;} public string TrackId {get;set;} = ""; public int Position {get;set;} public string Json {get;set;} = ""; }
public class LibraryItem { public Guid UserId {get;set;} public string Kind {get;set;} = ""; public string ItemId {get;set;} = ""; public string Json {get;set;} = ""; public DateTimeOffset SavedAt {get;set;} = DateTimeOffset.UtcNow; }
public class PlaybackHistory { public Guid Id {get;set;} = Guid.NewGuid(); public Guid UserId {get;set;} public Guid EventId {get;set;} public string TrackId {get;set;} = ""; public string Json {get;set;} = ""; public int Seconds {get;set;} public DateTimeOffset PlayedAt {get;set;} = DateTimeOffset.UtcNow; }
public class SearchHistory { public Guid Id {get;set;} = Guid.NewGuid(); public Guid UserId {get;set;} public string Query {get;set;} = ""; public DateTimeOffset SearchedAt {get;set;} = DateTimeOffset.UtcNow; }
