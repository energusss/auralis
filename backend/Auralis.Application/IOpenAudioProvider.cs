using Auralis.Domain;

namespace Auralis.Application;

/// <summary>A separately discoverable catalog of openly licensed audio.</summary>
public interface IOpenAudioProvider
{
    Task<IReadOnlyList<Track>> SearchAsync(string query, CancellationToken ct);
    Task<Artist?> GetArtistAsync(string id, CancellationToken ct);
    Task<PlaybackResolution> ResolveAsync(string trackId, CancellationToken ct);
}
