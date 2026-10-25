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
import { GoogleLoginButton } from "./components/GoogleLoginButton";
import {
  Artwork,
  IconButton,
  Modal,
  Empty,
  Skeleton,
  time,
} from "./components/ui";
import { SortableList } from "./components/SortableList";
import { isPlayableTrack } from "./types/music";
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
  const playable = isPlayableTrack(track);
  return (
    <div className={`track-row ${active ? "selected" : ""}`}>
      <button
        className="track-main"
        onClick={
          onPlay ||
          (() =>
            playable
              ? player.play(tracks, index)
              : notify(t("trackUnavailable")))
        }
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
          {!playable && (
            <small className="track-availability">{t("metadataOnly")}</small>
          )}
        </span>
      </button>
      <Link
        className="track-artist"
        to={"/artist/" + encodeURIComponent(track.artistId)}
      >
        {track.artist}
      </Link>
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
        disabled={!playable}
        onClick={() => {
          player.enqueue(track);
          notify(t("added"