import {
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  NavLink,
  Link,
  Routes,
  Route,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Home as HomeIcon,
  Search,
  Compass,
  Library,
  Heart,
  Clock,
  Plus,
  Settings,
  AudioLines,
  ArrowUpRight,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  ChevronDown,
  Check,
  MoreHorizontal,
  Trash2,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Headphones,
  Disc3,
} from "lucide-react";
import * as service from "./services/api";
import { usePlayer } from "./stores/player";
import { PlaybackEngine } from "./components/PlaybackEngine";
import {
  Artwork,
  IconButton,
  Modal,
  Empty,
  Skeleton,
  time,
} from "./components/ui";
import { SortableList } from "./components/SortableList";
import type {
  Track,
  Playlist,
  Artist,
  Album,
  ArtistSummary,
  AlbumSummary,
} from "./types/music";
const blank: service.Library = {
  favorites: [],
  savedArtists: [],
  savedAlbums: [],
  playlists: [],
  history: [],
};
type AppContextType = {
  lib: service.Library;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
  like: (t: Track) => void;
  choosePlaylist: (t: Track) => void;
  editPlaylist: (p?: Playlist) => void;
};
const Context = createContext<AppContextType>(null!);
const useApp = () => useContext(Context);
function TrackRow({
  track,
  index = 0,
  tracks = [track],
  remove,
  onPlay,
}: {
  track: Track;
  index?: number;
  tracks?: Track[];
  remove?: () => void;
  onPlay?: () => void;
}) {
  const { t } = useTranslation();
  const player = usePlayer();
  const { lib, like, choosePlaylist, notify } = useApp();
  const active = player.queue[player.index]?.id === track.id;
  return (
    <div className={`track-row ${active ? "selected" : ""}`}>
      <button
        className="track-main"
        onClick={onPlay || (() => player.play(tracks, index))}
      >
        <span className="track-number">
          {active && player.playing ? (
            <span className="equalizer">
              <i />
              <i />
              <i />
            </span>
          ) : (
            index + 1
          )}
        </span>
        <Artwork src={track.artwork} title={track.title} />
        <span>
          <strong>{track.title}</strong>
          <small>{track.artist}</small>
        </span>
      </button>
      <Link
        className="track-album"
        to={
          track.albumId
            ? "/album/" + encodeURIComponent(track.albumId)
            : "/artist/" + encodeURIComponent(track.artistId)
        }
      >
        {track.album}
      </Link>
      <span className="track-time">
        {track.duration ? time(track.duration) : "—"}
      </span>
      <IconButton
        label={t("favorites")}
        active={lib.favorites.some((x) => x.id === track.id)}
        onClick={() => like(track)}
      >
        <Heart size={17} />
      </IconButton>
      <IconButton
        label={t("addPlaylist")}
        onClick={() => choosePlaylist(track)}
      >
        <Plus size={18} />
      </IconButton>
      <IconButton
        label={t("addQueue")}
        onClick={() => {
          player.enqueue(track);
          notify(t("added"));
        }}
      >
        <ListMusic size={17} />
      </IconButton>
      {remove && (
        <IconButton label={t("delete")} onClick={remove}>
          <Trash2 size={16} />
        </IconButton>
      )}
    </div>
  );
}
function TrackList({ tracks }: { tracks: Track[] }) {
  return tracks.length ? (
    <div className="track-list">
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id + "-" + i}
          track={track}
          tracks={tracks}
          index={i}
        />
      ))}
    </div>
  ) : (
    <Empty />
  );
}
function MusicCards({ tracks }: { tracks: Track[] }) {
  const { t } = useTranslation();
  const player = usePlayer();
  const { like, lib } = useApp();
  return (
    <div className="cards">
      {tracks.map((track, i) => (
        <motion.article
          key={track.id}
          className="music-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.25) }}
        >
          <div className="cover-wrap">
            <Artwork src={track.artwork} title={track.title} />
            <button
              aria-label={`${t("play")} ${track.title}`}
              className="card-play"
              onClick={() => player.play(tracks, i)}
            >
              <Play size={23} fill="currentColor" />
            </button>
            <button
              className="card-heart"
              aria-label={t("favorites")}
              onClick={() => like(track)}
            >
              <Heart
                size={17}
                fill={
                  lib.favorites.some((x) => x.id === track.id)
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          </div>
          <Link
            to={
              track.albumId
                ? "/album/" + encodeURIComponent(track.albumId)
                : "/artist/" + encodeURIComponent(track.artistId)
            }
          >
            <h3>{track.title}</h3>
          </Link>
          <Link to={"/artist/" + encodeURIComponent(track.artistId)}>
            <p>
              {track.artist} <span>· {track.genre}</span>
            </p>
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
function Section({
  title,
  link,
  children,
}: {
  title: string;
  link?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
        {link && (
          <Link to={link}>
            {t("viewAll")} <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
function ArtistCards({ artists }: { artists: ArtistSummary[] }) {
  return (
    <div className="artist-cards">
      {artists.map((a) => (
        <Link
          className="artist-card"
          to={"/artist/" + encodeURIComponent(a.id)}
          key={a.id}
        >
          <Artwork src={a.artwork} title={a.name} />
          <strong>{a.name}</strong>
          <ArrowUpRight size={18} />
        </Link>
      ))}
    </div>
  );
}
function AlbumCards({ albums }: { albums: AlbumSummary[] }) {
  return (
    <div className="cards">
      {albums.map((a) => (
        <Link
          className="music-card"
          to={"/album/" + encodeURIComponent(a.id)}
          key={a.id}
        >
          <Artwork src={a.artwork} title={a.title} />
          <h3>{a.title}</h3>
          <p>
            {a.artist}
            {a.year > 0 ? " · " + a.year : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}
function HomePage({ discover = false }: { discover?: boolean }) {
  const { t } = useTranslation();
  const { lib } = useApp();
  const player = usePlayer();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["home", service.getSession()?.user.id],
    queryFn: service.home,
  });
  const recent = Array.from(
    new Map(lib.history.map((h) => [h.track.id, h.track])).values(),
  ).slice(0, 6);
  if (isPending) return <Skeleton />;
  if (!data) return <ErrorView error={error} retry={() => refetch()} />;
  const counts = new Map<string, number>();
  lib.history.forEach((h) =>
    counts.set(h.track.genre, (counts.get(h.track.genre) || 0) + h.seconds),
  );
  const recommended = [...data.recommendations].sort(
    (a, b) => (counts.get(b.genre) || 0) - (counts.get(a.genre) || 0),
  );
  return (
    <>
      <div className="greeting">
        <div>
          <p className="eyebrow">AURALIS / {t("subtitle")}</p>
          <h1>
            {discover ? t("discover") : t("hello")}
            {!discover && service.getSession()
              ? ", " + service.getSession()!.user.displayName
              : ""}
            <span className="accent">.</span>
          </h1>
        </div>
        <span className="edition">
          VOL. 01 <span> / </span> SOUND & SPACE
        </span>
      </div>
      <section className="hero glass">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-copy">
          <span className="chip">
            <span className="live-dot" /> {t("featured")}
          </span>
          <h2>{t("hero")}</h2>
          <p>{t("heroSub")}</p>
          <div className="hero-actions">
            <button
              className="primary"
              onClick={() => player.play(data.featured)}
            >
              <Play size={17} fill="currentColor" />
              {t("listen")}
            </button>
            <Link
              className="subtle-button"
              to={
                data.newReleases[0]
                  ? "/album/" + encodeURIComponent(data.newReleases[0].id)
                  : "/search?q=music"
              }
            >
              {t("explore")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-vinyl">
          <div className="vinyl-disc">
            <div className="vinyl-label">
              <AudioLines size={42} />
              <span>AURALIS</span>
              <small>ORIGINAL SELECTION</small>
            </div>
          </div>
          <div className="floating-label glass">
            <span className="equalizer">
              <i />
              <i />
              <i />
            </span>
            <div>
              {data.featured[0]?.provider === "YouTube" ? "YouTube" : t("demo")}
              <small>
                {data.featured[0]?.provider === "YouTube"
                  ? "Official player"
                  : "Kevin MacLeod · Incompetech"}
              </small>
            </div>
          </div>
        </div>
        <span className="hero-index">01 — 06</span>
      </section>
      {recent.length > 0 && (
        <Section title={t("continue")} link="/recent">
          <div className="quick-list">
            {recent.slice(0, 3).map((track) => (
              <button
                key={track.id}
                className="quick-track glass"
                onClick={() => player.play(recent, recent.indexOf(track))}
              >
                <Artwork src={track.artwork} title={track.title} />
                <span>
                  <strong>{track.title}</strong>
                  <small>{track.artist}</small>
                </span>
                <Play size={18} />
              </button>
            ))}
          </div>
        </Section>
      )}
      <Section title={t("recommended")} link="/discover">
        <MusicCards tracks={recommended} />
      </Section>
      <Section title={t("moods")}>
        <div className="mood-grid">
          {[
            {
              name: "Focus",
              q: "Ambient",
              sub: "DEEP IN THE FLOW",
              color: "#7582ed",
            },
            {
              name: "Feel good",
              q: "Acoustic",
              sub: "A LITTLE LIGHTER",
              color: "#d79362",
            },
            {
              name: "After hours",
              q: "Electronic",
              sub: "WHEN THE CITY SLEEPS",
              color: "#b07cdd",
            },
          ].map((m, i) => (
            <Link
              style={{ "--mood": m.color } as React.CSSProperties}
              to={"/search?q=" + m.q}
              className="mood-card"
              key={m.q}
            >
              <small>
                0{i + 1} / {m.sub}
              </small>
              <strong>{m.name}</strong>
              <ArrowUpRight size={23} />
              <div className="mood-orb" />
            </Link>
          ))}
        </div>
      </Section>
      <Section title={t("artists")}>
        <ArtistCards artists={data.artists} />
      </Section>
      {data.trending.length > 0 && <Section title={t("trending")}>
        <TrackList tracks={data.trending.slice(0, 5)} />
      </Section>}
      {data.newReleases.length > 0 && <Section title={t("newReleases")}>
        <AlbumCards albums={data.newReleases} />
      </Section>}
      <Section title={t("genres")}>
        <div className="chips">
          {[...new Set(data.featured.map((t) => t.genre))].map((g) => (
            <Link className="chip" key={g} to={"/search?q=" + g}>
              {g}
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </div>
      </Section>
      <p className="source-note">
        {data.providerStatus} · {t("demoNote")}
      </p>
    </>
  );
}
function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <h3>{t("error")}</h3>
      <p>{error instanceof Error ? error.message : ""}</p>
      <button className="primary" onClick={retry}>
        {t("retry")}
      </button>
    </div>
  );
}
function SearchPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [q, setQ] = useState(
    new URLSearchParams(location.search).get("q") || "",
  );
  const [term, setTerm] = useState(q);
  const [type, setType] = useState("all");
  const [recent, setRecent] = useState<string[]>(
    JSON.parse(localStorage.getItem("auralis-searches") || "[]"),
  );
  useEffect(() => {
    const timer = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    setQ(new URLSearchParams(location.search).get("q") || "");
  }, [location.search]);
  useEffect(() => {
    if (term) {
      const values = [term, ...recent.filter((x) => x !== term)].slice(0, 8);
      setRecent(values);
      localStorage.setItem("auralis-searches", JSON.stringify(values));
      if (service.getSession())
        service.send("/search-history", { query: term }).catch(() => {});
    }
  }, [term]);
  const query = useInfiniteQuery({
    queryKey: ["search", term, type],
    queryFn: ({ pageParam }) => service.search(term, type, pageParam),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: !!term,
  });
  const results = query.data?.pages;
  return (
    <>
      <p className="eyebrow">DISCOVERY / AURALIS</p>
      <h1>{t("searchTitle")}</h1>
      <div className="search-box glass">
        <Search size={24} />
        <input
          autoFocus
          aria-label={t("search")}
          placeholder={t("searchHint")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <IconButton label={t("clear")} onClick={() => setQ("")}>
            <X size={20} />
          </IconButton>
        )}
      </div>
      <div className="chips filters">
        {["all", "songs", "artists", "albums", "playlists", "videos"].map(
          (key) => (
            <button
              className={`chip ${type === key ? "chosen" : ""}`}
              key={key}
              onClick={() => setType(key)}
            >
              {t(key)}
            </button>
          ),
        )}
      </div>
      {recent.length > 0 && !term && (
        <Section title={t("searchRecent")}>
          <div className="chips">
            {recent.map((r) => (
              <button className="chip" key={r} onClick={() => setQ(r)}>
                <Clock size={13} />
                {r}
              </button>
            ))}
            <button
              className="text-button"
              onClick={() => {
                setRecent([]);
                localStorage.removeItem("auralis-searches");
                if (service.getSession())
                  service
                    .api("/search-history", { method: "DELETE" })
                    .catch(() => {});
              }}
            >
              {t("clear")}
            </button>
          </div>
        </Section>
      )}
      {query.isFetching && !results ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorView error={query.error} retry={() => query.refetch()} />
      ) : results ? (
        <>
          {results.map((r, i) => (
            <div key={i}>
              {r.tracks.length > 0 && (
                <Section title={t(type === "videos" ? "videos" : "songs")}>
                  <TrackList tracks={r.tracks} />
                </Section>
              )}
              {r.artists.length > 0 && (
                <Section title={t("artists")}>
                  <ArtistCards artists={r.artists} />
                </Section>
              )}
              {r.albums.length > 0 && (
                <Section title={t("albums")}>
                  <AlbumCards albums={r.albums} />
                </Section>
              )}
              {r.playlists.length > 0 && (
                <Section title={t("playlists")}>
                  {r.playlists.map((p) => (
                    <Link
                      className="chip"
                      key={p.id}
                      to={"/provider-playlist/" + encodeURIComponent(p.id)}
                    >
                      {p.name}
                    </Link>
                  ))}
                </Section>
              )}
              {!r.tracks.length &&
                !r.artists.length &&
                !r.albums.length &&
                !r.playlists.length && <Empty />}
            </div>
          ))}
          {query.hasNextPage && (
            <button
              className="primary"
              disabled={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              {t("loadMore")}
            </button>
          )}
        </>
      ) : (
        <Empty>{t("demoNote")}</Empty>
      )}
    </>
  );
}
function LibraryPage({ mode = "library" }: { mode?: string }) {
  const { t } = useTranslation();
  const { lib, editPlaylist } = useApp();
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const tracks =
    mode === "favorites"
      ? lib.favorites
      : mode === "recent"
        ? Array.from(
            new Map(lib.history.map((h) => [h.track.id, h.track])).values(),
          )
        : [];
  const filtered = tracks
    .filter((t) =>
      (t.title + " " + t.artist).toLowerCase().includes(filter.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "artist"
          ? a.artist.localeCompare(b.artist)
          : 0,
    );
  return (
    <>
      <p className="eyebrow">YOUR SOUND / YOUR COLLECTION</p>
      <div className="section-heading">
        <h1>{t(mode)}</h1>
        {mode === "library" && (
          <button className="primary" onClick={() => editPlaylist()}>
            <Plus size={17} />
            {t("create")}
          </button>
        )}
      </div>
      <div className="toolbar">
        <input
          placeholder={t("filter")}
          aria-label={t("filter")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          aria-label={t("sort")}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {["newest", "title", "artist"].map((x) => (
            <option key={x} value={x}>
              {t(x)}
            </option>
          ))}
        </select>
      </div>
      {mode !== "library" ? (
        <TrackList tracks={filtered} />
      ) : (
        <>
          <Section title={t("playlists")}>
            <div className="cards">
              {lib.playlists
                .filter((p) =>
                  p.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .sort((a, b) =>
                  sort === "title" ? a.name.localeCompare(b.name) : 0,
                )
                .map((p) => (
                  <Link
                    className="music-card"
                    to={"/playlist/" + p.id}
                    key={p.id}
                  >
                    <Artwork
                      src={p.artwork || p.tracks[0]?.artwork}
                      title={p.name}
                    />
                    <h3>{p.name}</h3>
                    <p>
                      {p.tracks.length} {t("listenCount")}
                    </p>
                  </Link>
                ))}
            </div>
            {!lib.playlists.length && <Empty />}
          </Section>
          <Section title={t("favorites")} link="/favorites">
            <MusicCards
              tracks={lib.favorites
                .filter((x) =>
                  x.title.toLowerCase().includes(filter.toLowerCase()),
                )
                .slice(0, 6)}
            />
          </Section>
          <Section title={t("savedArtists")}>
            <ArtistCards
              artists={lib.savedArtists.filter((x) =>
                x.name.toLowerCase().includes(filter.toLowerCase()),
              )}
            />
          </Section>
          <Section title={t("savedAlbums")}>
            <AlbumCards
              albums={lib.savedAlbums.filter((x) =>
                x.title.toLowerCase().includes(filter.toLowerCase()),
              )}
            />
          </Section>
        </>
      )}
    </>
  );
}
function DetailsPage({
  kind,
}: {
  kind: "artist" | "album" | "playlist" | "provider-playlist";
}) {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const { lib, refresh, notify, editPlaylist } = useApp();
  const navigate = useNavigate();
  const player = usePlayer();
  const query = useQuery<Artist | Album | Playlist>({
    queryKey: [kind, id],
    queryFn: () =>
      kind === "artist"
        ? service.artist(id)
        : kind === "album"
          ? service.album(id)
          : service.api<Playlist>("/music/playlists/" + encodeURIComponent(id)),
    enabled: kind !== "playlist",
  });
  const playlist =
    kind === "playlist" ? lib.playlists.find((p) => p.id === id) : undefined;
  const data = playlist || query.data;
  if (!data)
    return kind === "playlist" ? (
      <Empty />
    ) : query.isPending ? (
      <Skeleton />
    ) : (
      <ErrorView error={query.error} retry={() => query.refetch()} />
    );
  const title = "name" in data ? data.name : data.title;
  const tracks = data.tracks;
  const isSaved =
    kind === "artist"
      ? lib.savedArtists.some((a) => a.id === id)
      : lib.savedAlbums.some((a) => a.id === id);
  async function reorder(from: number, to: number) {
    if (!playlist) return;
    const list = [...playlist.tracks];
    list.splice(to, 0, list.splice(from, 1)[0]);
    try {
      await service.orderPlaylist(id, list);
      await refresh();
    } catch (e) {
      notify(String(e));
    }
  }
  return (
    <>
      <button className="text-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        {t("library")}
      </button>
      <div className="detail-hero">
        <Artwork src={data.artwork} title={title} />
        <div>
          <p className="eyebrow">
            {t(
              kind === "artist"
                ? "artist"
                : kind === "album"
                  ? "albums"
                  : "playlists",
            )}
          </p>
          <h1>{title}</h1>
          <p>
            {"description" in data
              ? data.description
              : "artist" in data
                ? data.artist
                : ""}
          </p>
          <small>
            {tracks.length} {t("listenCount")}
          </small>
          <div className="hero-actions">
            <button
              disabled={!tracks.length}
              className="primary"
              onClick={() => player.play(tracks)}
            >
              <Play size={18} fill="currentColor" />
              {t("play")}
            </button>
            <IconButton
              label={t("shuffle")}
              onClick={() => {
                if (!player.shuffle) player.toggleShuffle();
                player.play(tracks, Math.floor(Math.random() * tracks.length));
              }}
              disabled={!tracks.length}
            >
              <Shuffle />
            </IconButton>
            {(kind === "artist" || kind === "album") && (
              <IconButton
                label={t("save")}
                active={isSaved}
                onClick={async () => {
                  try {
                    await service.saved(
                      kind === "artist" ? "artists" : "albums",
                      data as ArtistSummary | AlbumSummary,
                      isSaved,
                    );
                    await refresh();
                  } catch (e) {
                    notify(String(e));
                  }
                }}
              >
                <Heart />
              </IconButton>
            )}
            {playlist && (
              <>
                <IconButton
                  label={t("edit")}
                  onClick={() => editPlaylist(playlist)}
                >
                  <MoreHorizontal />
                </IconButton>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      const p = await service.duplicatePlaylist(playlist);
                      await refresh();
                      navigate("/playlist/" + p.id);
                    } catch (e) {
                      notify(String(e));
                    }
                  }}
                >
                  {t("duplicate")}
                </button>
                <IconButton
                  label={t("delete")}
                  onClick={async () => {
                    if (confirm(t("delete") + " " + playlist.name + "?"))
                      try {
                        await service.deletePlaylist(id);
                        await refresh();
                        navigate("/library");
                      } catch (e) {
                        notify(String(e));
                      }
                  }}
                >
                  <Trash2 />
                </IconButton>
              </>
            )}
          </div>
        </div>
      </div>
      {playlist ? (
        <SortableList ids={tracks.map((x) => x.id)} onMove={reorder}>
          {(_, i) => (
            <TrackRow
              track={tracks[i]}
              index={i}
              tracks={tracks}
              remove={async () => {
                try {
                  await service.playlistTrack(id, tracks[i], true);
                  await refresh();
                } catch (e) {
                  notify(String(e));
                }
              }}
            />
          )}
        </SortableList>
      ) : (
        <TrackList tracks={tracks} />
      )}{" "}
      {"albums" in data && (
        <Section title={t("albums")}>
          <AlbumCards albums={data.albums} />
        </Section>
      )}
      {"related" in data && data.related.length > 0 && (
        <Section title={t("artists")}>
          <ArtistCards artists={data.related} />
        </Section>
      )}
    </>
  );
}
function Statistics() {
  const { t } = useTranslation();
  const { lib } = useApp();
  const statsQuery = useQuery({
    queryKey: ["statistics", service.getSession()?.user.id, lib.history[0]?.id],
    queryFn: () =>
      service.api<{
        totalSeconds: number;
        topArtists: { artist: string; seconds: number }[];
        topTracks: { track: Track; seconds: number }[];
        genres: { genre: string; seconds: number }[];
      }>("/statistics"),
    enabled: !!service.getSession(),
  });
  const total =
    statsQuery.data?.totalSeconds ??
    lib.history.reduce((s, h) => s + h.seconds, 0);
  const artists: [string, number][] = statsQuery.data
    ? statsQuery.data.topArtists.map((x) => [x.artist, x.seconds])
    : Object.entries(
        lib.history.reduce(
          (m, h) => ({
            ...m,
            [h.track.artist]: (m[h.track.artist] || 0) + h.seconds,
          }),
          {} as Record<string, number>,
        ),
      ).sort((a, b) => b[1] - a[1]);
  const tracks =
    statsQuery.data?.topTracks ??
    Object.values(
      lib.history.reduce(
        (m, h) => ({
          ...m,
          [h.track.id]: {
            track: h.track,
            seconds: (m[h.track.id]?.seconds || 0) + h.seconds,
          },
        }),
        {} as Record<string, { track: Track; seconds: number }>,
      ),
    ).sort((a, b) => b.seconds - a.seconds);
  return (
    <>
      <p className="eyebrow">YOUR LISTENING STORY</p>
      <h1>{t("statistics")}</h1>
      <div className="stats-grid">
        <div className="glass stat">
          <Headphones />
          <strong>
            {Math.floor(total / 60)} <small>min</small>
          </strong>
          <span>{t("listening")}</span>
        </div>
        <div className="glass stat">
          <Disc3 />
          <strong>{tracks.length}</strong>
          <span>{t("songs")}</span>
        </div>
        <div className="glass stat">
          <AudioLines />
          <strong>{artists.length}</strong>
          <span>{t("artists")}</span>
        </div>
      </div>
      {total === 0 ? (
        <Empty>{t("noHistory")}</Empty>
      ) : (
        <>
          <Section title={t("topArtists")}>
            {artists.map(([name, seconds]) => (
              <div className="stat-bar" key={name}>
                <div>
                  <strong>{name}</strong>
                  <span>{Math.floor(seconds / 60)} min</span>
                </div>
                <div className="bar">
                  <i style={{ width: (seconds / total) * 100 + "%" }} />
                </div>
              </div>
            ))}
          </Section>
          <Section title={t("topSongs")}>
            <TrackList tracks={tracks.map((x) => x.track)} />
          </Section>
          <Section title={t("genres")}>
            {(statsQuery.data
              ? statsQuery.data.genres.map(
                  (x) => [x.genre, x.seconds] as [string, number],
                )
              : Object.entries(
                  lib.history.reduce(
                    (m, h) => ({
                      ...m,
                      [h.track.genre]: (m[h.track.genre] || 0) + h.seconds,
                    }),
                    {} as Record<string, number>,
                  ),
                )
            ).map(([genre, seconds]) => (
              <div key={genre} className="stat-bar">
                <div>
                  {genre}
                  <span>{Math.floor(seconds / 60)} min</span>
                </div>
                <div className="bar">
                  <i style={{ width: (seconds / total) * 100 + "%" }} />
                </div>
              </div>
            ))}
          </Section>
        </>
      )}
    </>
  );
}
function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { notify, refresh } = useApp();
  const [theme, setTheme] = useState(
    localStorage.getItem("auralis-theme") || "dark",
  );
  const [accent, setAccent] = useState(
    localStorage.getItem("auralis-accent") || "#8b5cf6",
  );
  const save = async (
    language: string,
    newTheme: string,
    newAccent: string,
  ) => {
    localStorage.setItem("auralis-language", language);
    localStorage.setItem("auralis-theme", newTheme);
    localStorage.setItem("auralis-accent", newAccent);
    i18n.changeLanguage(language);
    document.documentElement.dataset.theme =
      newTheme === "system"
        ? matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : newTheme;
    document.documentElement.style.setProperty("--accent", newAccent);
    if (service.getSession())
      try {
        await service.send(
          "/settings",
          { language, theme: newTheme, accent: newAccent },
          "PUT",
        );
      } catch (e) {
        notify(String(e));
      }
  };
  return (
    <>
      <p className="eyebrow">MAKE IT YOURS</p>
      <h1>{t("settings")}</h1>
      <div className="settings-panel glass">
        {service.getSession() && (
          <form
            className="profile-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              try {
                const user = await service.send<service.Session["user"]>(
                  "/auth/me",
                  { displayName: form.get("displayName") },
                  "PUT",
                );
                service.setSession({ ...service.getSession()!, user });
                notify(t("saved"));
              } catch (error) {
                notify(String(error));
              }
            }}
          >
            <label>
              {t("displayName")}
              <input
                name="displayName"
                required
                maxLength={80}
                defaultValue={service.getSession()?.user.displayName}
              />
            </label>
            <button className="primary">{t("save")}</button>
          </form>
        )}

        <label>
          {t("language")}
          <select
            value={i18n.language}
            onChange={(e) => save(e.target.value, theme, accent)}
          >
            <option value="pl">Polski</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {t("theme")}
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value);
              save(i18n.language, e.target.value, accent);
            }}
          >
            {["dark", "light", "system"].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("accent")}
          <input
            type="color"
            value={accent}
            onChange={(e) => {
              setAccent(e.target.value);
              save(i18n.language, theme, e.target.value);
            }}
          />
        </label>
        <div>
          <h3>{t("shortcuts")}</h3>
          <p>{t("shortcutInfo")}</p>
        </div>
        <div>
          <h3>{t("source")}</h3>
          <p>{t("demoNote")}</p>
        </div>
        <div>
          <h3>{t("license")}</h3>
          <p>
            Music: Kevin MacLeod (incompetech.com).{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              Creative Commons Attribution 4.0
            </a>
            . Carefree, Cipher, Dream Culture, Monkeys Spinning Monkeys, Sneaky
            Snitch, Wallpaper. Artwork: original AURALIS typographic designs.
          </p>
        </div>
        <button
          className="text-button danger"
          onClick={async () => {
            if (confirm(t("clear") + " — " + t("history") + "?"))
              try {
                await service.clearHistory();
                await refresh();
                notify(t("removed"));
              } catch (e) {
                notify(String(e));
              }
          }}
        >
          <Trash2 size={16} />
          {t("clear")} · {t("history")}
        </button>
      </div>
    </>
  );
}
function Controls({ large = false }: { large?: boolean }) {
  const { t } = useTranslation();
  const p = usePlayer();
  return (
    <div className={`controls ${large ? "large" : ""}`}>
      <IconButton
        label={t("shuffle")}
        active={p.shuffle}
        onClick={p.toggleShuffle}
      >
        <Shuffle size={17} />
      </IconButton>
      <IconButton
        label={t("previous")}
        onClick={p.previous}
        disabled={!p.queue.length}
      >
        <SkipBack size={20} fill="currentColor" />
      </IconButton>
      <button
        className="main-play"
        aria-label={t(p.playing ? "pause" : "play")}
        disabled={!p.queue.length}
        onClick={p.toggle}
      >
        {p.playing ? (
          <Pause size={23} fill="currentColor" />
        ) : (
          <Play size={23} fill="currentColor" />
        )}
      </button>
      <IconButton label={t("next")} onClick={p.next} disabled={!p.queue.length}>
        <SkipForward size={20} fill="currentColor" />
      </IconButton>
      <IconButton
        label={`${t("repeat")} · ${p.repeat}`}
        active={p.repeat !== "none"}
        onClick={p.cycleRepeat}
      >
        {p.repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
      </IconButton>
    </div>
  );
}
function Progress() {
  const p = usePlayer();
  const { t } = useTranslation();
  return (
    <div className="progress">
      <span>{time(p.position)}</span>
      <input
        type="range"
        aria-label={t("seek", { defaultValue: "Seek" })}
        min={0}
        max={p.duration || 1}
        value={Math.min(p.position, p.duration || 1)}
        step={0.1}
        onChange={(e) => p.seek(+e.target.value)}
        style={
          {
            "--fill": `${p.duration ? (p.position / p.duration) * 100 : 0}%`,
          } as React.CSSProperties
        }
      />
      <span>{time(p.duration)}</span>
    </div>
  );
}
function PlayerBar({
  expand,
  toggleQueue,
}: {
  expand: () => void;
  toggleQueue: () => void;
}) {
  const p = usePlayer();
  const { t } = useTranslation();
  const { lib, like } = useApp();
  const track = p.queue[p.index];
  return (
    <div className="player-bar glass">
      <div className="player-track">
        <button
          className="art-button"
          onClick={expand}
          aria-label={t("fullscreen")}
        >
          <Artwork src={track?.artwork} title={track?.title || "Auralis"} />
        </button>
        <div>
          <strong>{track?.title || t("welcome")}</strong>
          <small>{track?.artist || t("subtitle")}</small>
        </div>
        {track && (
          <IconButton
            label={t("favorites")}
            active={lib.favorites.some((t) => t.id === track.id)}
            onClick={() => like(track)}
          >
            <Heart size={18} />
          </IconButton>
        )}
      </div>
      <div className="player-center">
        <Controls />
        <Progress />
        {p.error && (
          <span className="player-error" role="alert">
            {p.error}{" "}
            <button onClick={() => p.play(p.queue, p.index)}>
              {t("retry")}
            </button>
          </span>
        )}
      </div>
      <div className="player-options">
        <IconButton label={t("queue")} onClick={toggleQueue}>
          <ListMusic size={19} />
        </IconButton>
        <IconButton label={t("mute")} active={p.muted} onClick={p.toggleMute}>
          {p.muted || p.volume === 0 ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
        </IconButton>
        <input
          aria-label={t("volume")}
          type="range"
          min="0"
          max="1"
          step=".01"
          value={p.muted ? 0 : p.volume}
          onChange={(e) => p.setVolume(+e.target.value)}
        />
        <IconButton label={t("fullscreen")} onClick={expand}>
          <Maximize2 size={17} />
        </IconButton>
      </div>
    </div>
  );
}
function Queue({ close }: { close: () => void }) {
  const p = usePlayer();
  const { t } = useTranslation();
  return (
    <motion.aside
      className="queue-panel glass"
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
    >
      <header>
        <h2>{t("queue")}</h2>
        <IconButton label={t("close")} onClick={close}>
          <X />
        </IconButton>
      </header>
      {p.queue.length ? (
        <SortableList
          ids={p.queue.map((_, i) => "queue-" + i)}
          onMove={p.reorder}
        >
          {(_, i) => (
            <div className={`queue-track ${i === p.index ? "selected" : ""}`}>
              <button onClick={() => p.play(p.queue, i)}>
                <Artwork src={p.queue[i].artwork} title={p.queue[i].title} />
                <span>
                  <strong>{p.queue[i].title}</strong>
                  <small>{p.queue[i].artist}</small>
                </span>
              </button>
              <IconButton label={t("delete")} onClick={() => p.remove(i)}>
                <X size={15} />
              </IconButton>
            </div>
          )}
        </SortableList>
      ) : (
        <Empty>{t("emptyQueue")}</Empty>
      )}
    </motion.aside>
  );
}
function Fullscreen({ close }: { close: () => void }) {
  const p = usePlayer();
  const track = p.queue[p.index];
  const { t } = useTranslation();
  return (
    <motion.div
      className="fullscreen-player"
      role="dialog"
      aria-modal="true"
      aria-label={t("nowPlaying")}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
    >
      <div
        className="fullscreen-bg"
        style={{
          backgroundImage: track
            ? `url("${track.artwork.replaceAll('"', "")} ")`
            : undefined,
        }}
      />
      <header>
        <span>
          <AudioLines /> AURALIS
        </span>
        <p className="eyebrow">{t("nowPlaying")}</p>
        <IconButton label={t("close")} onClick={close}>
          <ChevronDown />
        </IconButton>
      </header>
      <div className="fullscreen-content">
        <div className="fullscreen-main">
          <Artwork src={track?.artwork} title={track?.title || "Auralis"} />
          <h1>{track?.title || t("emptyQueue")}</h1>
          <p>{track?.artist}</p>
          <Progress />
          <Controls large />
        </div>
        <aside>
          <h3>{t("queue")}</h3>
          {p.queue.slice(p.index + 1, p.index + 5).map((x, i) => (
            <button
              className="quick-track"
              key={x.id + i}
              onClick={() => p.play(p.queue, p.index + 1 + i)}
            >
              <Artwork src={x.artwork} title={x.title} />
              <span>
                <strong>{x.title}</strong>
                <small>{x.artist}</small>
              </span>
              <Play size={16} />
            </button>
          ))}
          <div className="lyrics-panel glass">
            <h3>{t("lyrics")}</h3>
            <p>{t("noLyrics")}</p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
export default function App() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(service.getSession());
  const [mobile, setMobile] = useState(false);
  const [queue, setQueue] = useState(false);
  const [full, setFull] = useState(false);
  const [toast, setToast] = useState("");
  const [auth, setAuth] = useState<false | "login" | "register">(false);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Playlist | null | undefined>();
  const [adding, setAdding] = useState<Track | null>(null);
  const libQuery = useQuery({
    queryKey: ["library", session?.user.id || "guest"],
    queryFn: service.library,
  });
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    service
      .api<{ language: string; theme: string; accent: string }>("/settings")
      .then((prefs) => {
        if (cancelled) return;
        localStorage.setItem("auralis-language", prefs.language);
        localStorage.setItem("auralis-theme", prefs.theme);
        localStorage.setItem("auralis-accent", prefs.accent);
        i18n.changeLanguage(prefs.language);
        document.documentElement.dataset.theme =
          prefs.theme === "system"
            ? matchMedia("(prefers-color-scheme: light)").matches
              ? "light"
              : "dark"
            : prefs.theme;
        document.documentElement.style.setProperty("--accent", prefs.accent);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);
  const lib = libQuery.data || blank;
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["library"] });
  };
  const notify = (s: string) => setToast(s);
  const track = usePlayer((s) => s.queue[s.index]);
  useEffect(() => {
    const listener = () => {
      setSession(service.getSession());
      qc.invalidateQueries();
    };
    window.addEventListener("session", listener);
    return () => window.removeEventListener("session", listener);
  }, [qc]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => setMobile(false), [location.pathname]);
  useEffect(() => {
    const theme = localStorage.getItem("auralis-theme") || "dark";
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system"
          ? matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark"
          : theme);
    apply();
    document.documentElement.style.setProperty(
      "--accent",
      localStorage.getItem("auralis-accent") || "#8b5cf6",
    );
    const media = matchMedia("(prefers-color-scheme: light)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  useEffect(() => {
    if (!track?.artwork) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        document.documentElement.style.setProperty(
          "--ambient",
          `${r},${g},${b}`,
        );
      } catch {}
    };
    img.src = track.artwork;
  }, [track?.artwork]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,button,a,[contenteditable=true]",
        ) ||
        auth ||
        editing !== undefined ||
        adding
      )
        return;
      const s = usePlayer.getState();
      if (e.key === "Escape") {
        setFull(false);
        setQueue(false);
        setMobile(false);
      }
      if (e.code === "Space") {
        e.preventDefault();
        s.toggle();
      }
      if (e.key === "/") {
        e.preventDefault();
        navigate("/search");
      }
      if (e.key.toLowerCase() === "q") setQueue((v) => !v);
      if (e.key.toLowerCase() === "m") s.toggleMute();
      if (e.key === "ArrowRight") {
        e.preventDefault();
        s.seek(s.position + 5);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        s.seek(s.position - 5);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        s.setVolume(Math.min(1, s.volume + 0.05));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        s.setVolume(Math.max(0, s.volume - 0.05));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [navigate, auth, editing, adding]);
  async function like(track: Track) {
    const key = ["library", session?.user.id || "guest"];
    const before = qc.getQueryData<service.Library>(key);
    const liked = lib.favorites.some((x) => x.id === track.id);
    qc.setQueryData(key, {
      ...lib,
      favorites: liked
        ? lib.favorites.filter((x) => x.id !== track.id)
        : [track, ...lib.favorites],
    });
    try {
      await service.favorite(track, liked);
      notify(t(liked ? "removed" : "liked"));
    } catch (e) {
      qc.setQueryData(key, before);
      notify(String(e));
    } finally {
      await refresh();
    }
  }
  const nav = [
    { path: "/", label: "home", icon: HomeIcon },
    { path: "/search", label: "search", icon: Search },
    { path: "/discover", label: "discover", icon: Compass },
    { path: "/library", label: "library", icon: Library },
    { path: "/favorites", label: "favorites", icon: Heart },
    { path: "/recent", label: "recent", icon: Clock },
  ];
  return (
    <Context.Provider
      value={{
        lib,
        notify,
        refresh,
        like,
        choosePlaylist: setAdding,
        editPlaylist: (p) => setEditing(p || null),
      }}
    >
      <div className="ambient-scene">
        <div />
        <div />
        <div />
      </div>
      {mobile && (
        <div className="mobile-overlay" onClick={() => setMobile(false)} />
      )}
      <aside className={`sidebar glass ${mobile ? "open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <AudioLines size={25} />
          </span>
          AURALIS<span className="brand-dot">®</span>
        </Link>
        <p className="nav-label">YOUR SOUND, YOUR SPACE</p>
        <nav>
          {nav.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="playlist-heading">
          <span>{t("playlists")}</span>
          <IconButton label={t("create")} onClick={() => setEditing(null)}>
            <Plus size={16} />
          </IconButton>
        </div>
        <div className="sidebar-playlists">
          {lib.playlists.map((x) => (
            <NavLink to={"/playlist/" + x.id} key={x.id}>
              <span className="playlist-icon">
                <ListMusic size={14} />
              </span>
              {x.name}
            </NavLink>
          ))}
          {!lib.playlists.length && (
            <button
              className="create-playlist"
              onClick={() => setEditing(null)}
            >
              <Plus size={16} />
              {t("create")}
            </button>
          )}
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/statistics" className="nav-item">
            <BarChart3 size={18} />
            {t("statistics")}
          </NavLink>
          <NavLink to="/settings" className="nav-item">
            <Settings size={18} />
            {t("settings")}
          </NavLink>
          <div className="sidebar-footnote">
            <span className="live-dot" />{" "}
            {session ? session.user.displayName : t("guest")}
            <small>AURALIS MUSIC / 01</small>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              className="mobile-menu"
              label="Menu"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </IconButton>
            <button className="top-search" onClick={() => navigate("/search")}>
              <Search size={17} />
              <span>{t("searchHint")}</span>
              <kbd>/</kbd>
            </button>
          </div>
          <div className="topbar-right">
            <button
              className="lang-toggle"
              onClick={() => {
                const lng = i18n.language === "pl" ? "en" : "pl";
                localStorage.setItem("auralis-language", lng);
                i18n.changeLanguage(lng);
              }}
            >
              {i18n.language.toUpperCase()}
            </button>
            {session ? (
              <>
                <span className="avatar">
                  {session.user.displayName.slice(0, 1)}
                </span>
                <IconButton
                  label={t("logout")}
                  onClick={async () => {
                    try {
                      await service.send("/auth/logout", {
                        refreshToken: session.refreshToken,
                      });
                    } catch (e) {
                      notify(String(e));
                    } finally {
                      service.setSession(null);
                    }
                  }}
                >
                  <LogOut size={18} />
                </IconButton>
              </>
            ) : (
              <button
                className="account-button"
                onClick={() => setAuth("login")}
              >
                <span className="avatar">
                  <Headphones size={16} />
                </span>
                {t("login")}
              </button>
            )}
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            className="page"
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/discover" element={<HomePage discover />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route
                path="/favorites"
                element={<LibraryPage mode="favorites" />}
              />
              <Route path="/recent" element={<LibraryPage mode="recent" />} />
              <Route
                path="/artist/:id"
                element={<DetailsPage kind="artist" />}
              />
              <Route path="/album/:id" element={<DetailsPage kind="album" />} />
              <Route
                path="/playlist/:id"
                element={<DetailsPage kind="playlist" />}
              />
              <Route
                path="/provider-playlist/:id"
                element={<DetailsPage kind="provider-playlist" />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="*" element={<Empty />} />
            </Routes>
            <footer className="page-footer">
              <span>AURALIS</span>
              <small>Music gives space a feeling.</small>
              <Link to="/settings">
                CC BY 4.0 / CREDITS <ArrowUpRight size={12} />
              </Link>
            </footer>
          </motion.div>
        </AnimatePresence>
      </main>
      <PlaybackEngine
        onListen={(track, seconds, id) => {
          service
            .listen(track, seconds, id)
            .then(refresh)
            .catch((e) => notify(String(e)));
        }}
      />
      <PlayerBar
        expand={() => setFull(true)}
        toggleQueue={() => setQueue((v) => !v)}
      />
      <AnimatePresence>
        {queue && <Queue close={() => setQueue(false)} />}{" "}
        {full && <Fullscreen close={() => setFull(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast glass"
            role="status"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <Check size={18} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {libQuery.isError && (
        <div className="error-banner" role="alert">
          {t("error")}{" "}
          <button onClick={() => libQuery.refetch()}>{t("retry")}</button>
        </div>
      )}
      {auth && (
        <Modal
          title={t(auth)}
          onClose={() => {
            setAuth(false);
            setAuthError("");
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setAuthError("");
              const f = new FormData(e.currentTarget);
              try {
                const s = await service.send<service.Session>("/auth/" + auth, {
                  email: f.get("email"),
                  password: f.get("password"),
                  displayName: f.get("displayName"),
                });
                service.setSession(s);
                setAuth(false);
                notify(t("welcome"));
              } catch (e) {
                setAuthError(
                  e instanceof Error ? e.message : t("accountError"),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {auth === "register" && (
              <label>
                {t("displayName")}
                <input name="displayName" required maxLength={80} />
              </label>
            )}
            <label>
              {t("email")}
              <input
                autoFocus
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label>
              {t("password")}
              <input
                name="password"
                type="password"
                autoComplete={
                  auth === "login" ? "current-password" : "new-password"
                }
                required
                minLength={auth === "register" ? 10 : 1}
                maxLength={128}
              />
            </label>
            {authError && (
              <p role="alert" className="form-error">
                {authError}
              </p>
            )}
            <button className="primary wide" disabled={busy}>
              {busy ? t("loading") : t(auth)}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setAuth(auth === "login" ? "register" : "login")}
            >
              {t(auth === "login" ? "register" : "login")}
            </button>
            <p className="muted">{t("guestInfo")}</p>
          </form>
        </Modal>
      )}
      {editing !== undefined && (
        <Modal
          title={t(editing ? "edit" : "create")}
          onClose={() => setEditing(undefined)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const f = new FormData(e.currentTarget);
              try {
                const name = String(f.get("name")).trim();
                if (!name) throw Error(t("playlistName"));
                const description = String(f.get("description"));
                const artwork = String(f.get("artwork"));
                if (artwork && !/^https:\/\//.test(artwork))
                  throw Error(t("artwork"));
                const result = editing
                  ? await service.updatePlaylist({
                      ...editing,
                      name,
                      description,
                      artwork,
                    })
                  : await service.createPlaylist(name, description, artwork);
                await refresh();
                setEditing(undefined);
                navigate("/playlist/" + result.id);
                notify(t("saved"));
              } catch (e) {
                notify(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {t("playlistName")}
              <input
                autoFocus
                name="name"
                required
                maxLength={100}
                defaultValue={editing?.name}
              />
            </label>
            <label>
              {t("description")}
              <textarea
                name="description"
                maxLength={1000}
                defaultValue={editing?.description}
              />
            </label>
            <label>
              {t("artwork")}
              <input
                name="artwork"
                type="url"
                defaultValue={editing?.artwork}
              />
            </label>
            <button className="primary wide" disabled={busy}>
              {t("save")}
            </button>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal title={t("addPlaylist")} onClose={() => setAdding(null)}>
          {lib.playlists.map((p) => (
            <button
              key={p.id}
              className="playlist-choice"
              onClick={async () => {
                try {
                  await service.playlistTrack(p.id, adding);
                  await refresh();
                  setAdding(null);
                  notify(t("added"));
                } catch (e) {
                  notify(String(e));
                }
              }}
            >
              <ListMusic size={18} />
              {p.name}
              <Plus size={16} />
            </button>
          ))}
          <button
            className="primary wide"
            onClick={() => {
              setAdding(null);
              setEditing(null);
            }}
          >
            <Plus size={18} />
            {t("create")}
          </button>
        </Modal>
      )}
    </Context.Provider>
  );
}
