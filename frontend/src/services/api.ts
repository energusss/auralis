import { uuid } from "../utils/id";
import type {
  Track,
  ArtistSummary,
  AlbumSummary,
  Playlist,
  History,
  Home,
  SearchResult,
  Artist,
  Album,
} from "../types/music";
export type Library = {
  favorites: Track[];
  savedArtists: ArtistSummary[];
  savedAlbums: AlbumSummary[];
  playlists: Playlist[];
  history: History[];
};
export type Session = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string };
};
const BASE = import.meta.env.VITE_API_URL || "/api";
let session: Session | null = JSON.parse(
  localStorage.getItem("auralis-session") || "null",
);
export const getSession = () => session;
export function setSession(value: Session | null) {
  session = value;
  value
    ? localStorage.setItem("auralis-session", JSON.stringify(value))
    : localStorage.removeItem("auralis-session");
  window.dispatchEvent(new Event("session"));
}
let refreshing: Promise<void> | null = null;
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(BASE + path, {
    signal: AbortSignal.timeout(10000),
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && session && retry) {
    refreshing ??= fetch(BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (r) => {
        if (!r.ok) {
          setSession(null);
          throw Error("Session expired");
        }
        setSession(await r.json());
      })
      .finally(() => {
        refreshing = null;
      });
    await refreshing;
    return api<T>(path, options, false);
  }
  if (!response.ok) {
    const e = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw Error(e.detail || e.title || "Request failed");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const send = <T>(path: string, body: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(body) });
const empty: Library = {
  favorites: [],
  savedArtists: [],
  savedAlbums: [],
  playlists: [],
  history: [],
};
const guest = (): Library =>
  JSON.parse(localStorage.getItem("auralis-library") || JSON.stringify(empty));
function save(lib: Library) {
  localStorage.setItem("auralis-library", JSON.stringify(lib));
  return lib;
}
export const library = () =>
  getSession() ? api<Library>("/library") : Promise.resolve(guest());
export async function favorite(track: Track, liked: boolean) {
  if (getSession())
    return api(`/library/favorites/${encodeURIComponent(track.id)}`, {
      method: liked ? "DELETE" : "PUT",
      body: liked ? undefined : JSON.stringify(track),
    });
  const l = guest();
  l.favorites = liked
    ? l.favorites.filter((t) => t.id !== track.id)
    : [track, ...l.favorites];
  save(l);
}
export async function saved(
  kind: "artists" | "albums",
  item: ArtistSummary | AlbumSummary,
  remove: boolean,
) {
  if (getSession())
    return api(`/library/${kind}/${encodeURIComponent(item.id)}`, {
      method: remove ? "DELETE" : "PUT",
      body: remove ? undefined : JSON.stringify(item),
    });
  const l = guest();
  if (kind === "artists")
    l.savedArtists = remove
      ? l.savedArtists.filter((x) => x.id !== item.id)
      : [item as ArtistSummary, ...l.savedArtists];
  else
    l.savedAlbums = remove
      ? l.savedAlbums.filter((x) => x.id !== item.id)
      : [item as AlbumSummary, ...l.savedAlbums];
  save(l);
}
export async function createPlaylist(
  name: string,
  description = "",
  artwork = "",
) {
  if (getSession())
    return send<Playlist>("/playlists", { name, description, artwork });
  const p: Playlist = {
    id: uuid(),
    name,
    description,
    artwork,
    tracks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const l = guest();
  l.playlists.push(p);
  save(l);
  return p;
}
export async function updatePlaylist(p: Playlist) {
  if (getSession())
    return send<Playlist>(
      "/playlists/" + p.id,
      { name: p.name, description: p.description, artwork: p.artwork },
      "PUT",
    );
  const l = guest();
  l.playlists = l.playlists.map((x) => (x.id === p.id ? p : x));
  save(l);
  return p;
}
export async function deletePlaylist(id: string) {
  if (getSession()) return api("/playlists/" + id, { method: "DELETE" });
  const l = guest();
  l.playlists = l.playlists.filter((p) => p.id !== id);
  save(l);
}
export async function playlistTrack(id: string, t: Track, remove = false) {
  if (getSession())
    return api(
      `/playlists/${id}/tracks${remove ? "/" + encodeURIComponent(t.id) : ""}`,
      {
        method: remove ? "DELETE" : "POST",
        body: remove ? undefined : JSON.stringify(t),
      },
    );
  const l = guest();
  const p = l.playlists.find((p) => p.id === id)!;
  p.tracks = remove
    ? p.tracks.filter((x) => x.id !== t.id)
    : p.tracks.some((x) => x.id === t.id)
      ? p.tracks
      : [...p.tracks, t];
  save(l);
}
export async function orderPlaylist(id: string, tracks: Track[]) {
  if (getSession())
    return send(
      "/playlists/" + id + "/order",
      { trackIds: tracks.map((t) => t.id) },
      "PUT",
    );
  const l = guest();
  l.playlists.find((p) => p.id === id)!.tracks = tracks;
  save(l);
}
export async function duplicatePlaylist(p: Playlist) {
  if (getSession())
    return send<Playlist>("/playlists/" + p.id + "/duplicate", {});
  const l = guest();
  const copy = {
    ...p,
    id: uuid(),
    name: p.name + " · copy",
    tracks: [...p.tracks],
  };
  l.playlists.push(copy);
  save(l);
  return copy;
}
export async function listen(track: Track, seconds: number, eventId: string) {
  if (getSession()) return send("/history", { track, seconds, eventId });
  const l = guest();
  if (!l.history.some((x) => x.id === eventId))
    l.history.unshift({
      id: eventId,
      track,
      seconds,
      playedAt: new Date().toISOString(),
    });
  l.history = l.history.slice(0, 2000);
  save(l);
}
export async function clearHistory() {
  if (getSession()) return api("/history", { method: "DELETE" });
  const l = guest();
  l.history = [];
  save(l);
}
let demoPromise: Promise<Home> | undefined;
export const demo = () =>
  (demoPromise ??= fetch("/demo-catalog.json")
    .then((r) => r.json())
    .then((tracks: Track[]) => ({
      featured: tracks,
      trending: tracks,
      recommendations: tracks,
      newReleases: [
        {
          id: tracks[0].albumId,
          title: tracks[0].album,
          artist: tracks[0].artist,
          artistId: tracks[0].artistId,
          artwork: tracks[0].artwork,
          year: 0,
        },
      ],
      artists: [
        {
          id: tracks[0].artistId,
          name: tracks[0].artist,
          artwork: tracks[0].artwork,
        },
      ],
      providerStatus: "demo",
    })));
export async function home(): Promise<Home> {
  try {
    return await api<Home>("/music/home");
  } catch {
    return demo();
  }
}
export async function search(
  q: string,
  type: string,
  cursor = "",
): Promise<SearchResult> {
  try {
    return await api<SearchResult>(
      `/music/search?q=${encodeURIComponent(q)}&type=${type}&cursor=${encodeURIComponent(cursor)}`,
    );
  } catch {
    const h = await demo();
    const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
    return {
      tracks:
        type === "all" || type === "songs"
          ? h.featured.filter((t) =>
              match(t.title + " " + t.artist + " " + t.genre),
            )
          : [],
      artists:
        type === "all" || type === "artists"
          ? h.artists.filter((a) => match(a.name))
          : [],
      albums:
        type === "all" || type === "albums"
          ? h.newReleases.filter((a) => match(a.title + " " + a.artist))
          : [],
      playlists: [],
      nextCursor: null,
    };
  }
}
export async function artist(id: string): Promise<Artist> {
  try {
    return await api<Artist>("/music/artists/" + encodeURIComponent(id));
  } catch (e) {
    const h = await demo();
    const a = h.artists.find((a) => a.id === id);
    if (!a) throw e;
    return {
      ...a,
      description: "Creative Commons · Kevin MacLeod / Incompetech",
      tracks: h.featured.filter((t) => t.artistId === id),
      albums: h.newReleases
        .filter((a) => a.artistId === id)
        .map((a) => ({
          ...a,
          tracks: h.featured.filter((t) => t.albumId === a.id),
        })),
      related: [],
    };
  }
}
export async function album(id: string): Promise<Album> {
  try {
    return await api<Album>("/music/albums/" + encodeURIComponent(id));
  } catch (e) {
    const h = await demo();
    const a = h.newReleases.find((a) => a.id === id);
    if (!a) throw e;
    return { ...a, tracks: h.featured.filter((t) => t.albumId === id) };
  }
}
