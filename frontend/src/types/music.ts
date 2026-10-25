export interface Playback {
  kind: "audio" | "youtube";
  url?: string;
  videoId?: string;
  mediaType?: string;
  expiresAt?: string;
  codec?: string;
  licenseUrl?: string;
  sourcePage?: string;
  availability?:
    | "playable"
    | "resolvable"
    | "metadata-only"
    | "official-player"
    | "unavailable";
}
export interface PlaybackResolution {
  trackId: string;
  provider: string;
  availability: "playable" | "unavailable";
  url?: string;
  mediaType?: string;
  codec?: string;
  expiresAt?: string;
  errorCategory?: string;
  retryEligible: boolean;
  licenseUrl?: string;
  sourcePage?: string;
}
export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  artwork: string;
  duration: number;
  genre: string;
  provider: string;
  playback: Playback;
}
export function isPlayableTrack(value: unknown): value is Track {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<Track>;
  if (
    typeof track.id !== "string" ||
    track.id.length === 0 ||
    typeof track.title !== "string" ||
    typeof track.artist !== "string" ||
    !track.playback
  )
    return false;
  const playback = track.playback;
  if (playback.kind === "youtube")
    return (
      playback.availability === "official-player" &&
      typeof playback.videoId === "string" &&
      /^[A-Za-z0-9_-]{11}$/.test(playback.videoId)
    );
  return (
    playback.kind === "audio" &&
    typeof playback.url === "string" &&
    playback.url.startsWith("https://") &&
    (playback.availability === undefined ||
      playback.availability === "playable")
  );
}
export function isResolvableTrack(value: unknown): value is Track {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<Track>;
  return (
    typeof track.id === "string" &&
    track.id.startsWith("ia:") &&
    !!track.playback &&
    track.playback.kind === "audio" &&
    track.playback.availability === "resolvable" &&
    typeof track.playback.licenseUrl === "string" &&
    typeof track.playback.sourcePage === "string"
  );
}
export interface ArtistSummary {
  id: string;
  name: string;
  artwork: string;
}
export interface AlbumSummary {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  artwork: string;
  year: number;
}
export interface Artist extends ArtistSummary {
  description: string;
  tracks: Track[];
  albums: AlbumSummary[];
  related: ArtistSummary[];
}
export interface Album extends AlbumSummary {
  tracks: Track[];
}
export interface Playlist {
  id: string;
  name: string;
  description: string;
  artwork: string;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
}
export interface History {
  id: string;
  track: Track;
  seconds: number;
  playedAt: string;
}
export interface Home {
  featured: Track[];
  trending: Track[];
  newReleases: AlbumSummary[];
  artists: ArtistSummary[];
  recommendations: Track[];
  providerStatus: string;
}
export interface SearchResult {
  tracks: Track[];
  artists: ArtistSummary[];
  albums: AlbumSummary[];
  playlists: Playlist[];
  nextCursor?: string | null;
}
