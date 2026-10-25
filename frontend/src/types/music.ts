export interface Playback {
  kind: "audio" | "youtube";
  url?: string;
  videoId?: string;
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
