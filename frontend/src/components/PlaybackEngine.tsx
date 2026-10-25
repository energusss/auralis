import { uuid } from "../utils/id";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../stores/player";
import type { Track } from "../types/music";
interface Adapter {
  play(): void | Promise<void>;
  pause(): void;
  seek(n: number): void;
  volume(n: number): void;
  position(): number;
  duration(): number;
  audible(): boolean;
  destroy(): void;
}
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(n: number, a: boolean): void;
  setVolume(n: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVolume(): number;
  isMuted(): boolean;
  destroy(): void;
}
interface YTApi {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
        onError: () => void;
        onAutoplayBlocked: () => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let apiPromise: Promise<YTApi> | null = null;
function youtubeApi(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      apiPromise = null;
      reject(new Error("YouTube player timed out"));
    }, 20000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      apiPromise = null;
      script.remove();
      reject(new Error("YouTube unavailable"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}
export function PlaybackEngine({
  onListen,
  expanded = false,
}: {
  onListen?: (track: Track, seconds: number, eventId: string) => void;
  expanded?: boolean;
}) {
  const { t } = useTranslation();
  const track = usePlayer((s) => s.queue[s.index]),
    loadId = usePlayer((s) => s.loadId),
    playing = usePlayer((s) => s.playing),
    volume = usePlayer((s) => s.volume),
    muted = usePlayer((s) => s.muted),
    seekRequest = usePlayer((s) => s.seekRequest);
  const host = useRef<HTMLDivElement>(null),
    adapter = useRef<Adapter | null>(null),
    callback = useRef(onListen);
  callback.current = onListen;
  const errorMessage = t("playbackError", {
    defaultValue:
      "Nie udało się odtworzyć. Spróbuj ponownie lub wybierz następny utwór.",
  });
  const message = useRef(errorMessage);
  message.current = errorMessage;
  const command = useRef<{ adapter: Adapter; playing: boolean } | null>(null);
  const syncPlayback = () => {
    const p = adapter.current,
      state = usePlayer.getState();
    if (
      !p ||
      (command.current?.adapter === p &&
        command.current.playing === state.playing)
    )
      return;
    command.current = { adapter: p, playing: state.playing };
    const failed = () => {
      if (adapter.current === p && usePlayer.getState().playing)
        usePlayer.getState().setStatus("error", message.current);
    };
    if (state.playing) {
      try {
        const result = p.play();
        if (result instanceof Promise) result.catch(failed);
      } catch {
        failed();
      }
    } else p.pause();
  };
  useEffect(() => {
    if (!track) return;
    let alive = true,
      local: Adapter | null = null,
      seconds = 0,
      lastPosition = 0,
      lastTick = performance.now();
    const flush = () => {
      if (seconds >= 1) {
        callback.current?.(track, Math.floor(seconds), uuid());
        seconds -= Math.floor(seconds);
      }
    };
    const fail = () => {
      if (alive) usePlayer.getState().setStatus("error", message.current);
    };
    const ready = () => {
      if (!alive) return;
      adapter.current = local;
      const s = usePlayer.getState();
      local?.volume(s.muted ? 0 : s.volume);
      syncPlayback();
      if (!s.playing) s.setStatus("paused");
    };
    if (track.playback.kind === "audio") {
      const audio = new Audio();
      audio.preload = "metadata";
      local = {
        play: () => audio.play(),
        pause: () => audio.pause(),
        seek: (n) => {
          audio.currentTime = n;
        },
        volume: (n) => {
          audio.volume = n;
        },
        position: () => audio.currentTime,
        duration: () => audio.duration,
        audible: () => audio.volume > 0 && !audio.muted,
        destroy: () => {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        },
      };
      audio.onplaying = () => {
        if (alive) usePlayer.getState().setStatus("playing");
      };
      audio.onwaiting = () => {
        if (alive) usePlayer.getState().setStatus("loading");
      };
      audio.onpause = () => {
        if (alive && usePlayer.getState().status !== "error")
          usePlayer.getState().setStatus("paused");
        flush();
      };
      audio.onended = () => {
        flush();
        if (alive) usePlayer.getState().ended();
      };
      audio.onerror = fail;
      if (track.playback.url) {
        audio.src = track.playback.url;
        ready();
      } else fail();
    } else if (
      track.playback.kind === "youtube" &&
      expanded &&
      track.playback.videoId
    ) {
      youtubeApi()
        .then((YT) => {
          const target = document.getElementById("auralis-youtube-host");
          if (!alive || !target) return;
          host.current = target as HTMLDivElement;
          target.replaceChildren();
          const element = document.createElement("div");
          host.current.appendChild(element);
          const youtube = new YT.Player(element, {
            width: 640,
            height: 360,
            videoId: track.playback.videoId!,
            playerVars: {
              playsinline: 1,
              origin: window.location.origin,
              autoplay: 0,
              controls: 1,
            },
            events: {
              onReady: () => {
                local = {
                  play: () => youtube.playVideo(),
                  pause: () => youtube.pauseVideo(),
                  seek: (n) => youtube.seekTo(n, true),
                  volume: (n) => youtube.setVolume(n * 100),
                  position: () => youtube.getCurrentTime(),
                  duration: () => youtube.getDuration(),
                  audible: () => youtube.getVolume() > 0 && !youtube.isMuted(),
                  destroy: () => youtube.destroy(),
                };
                ready();
              },
              onStateChange: (e) => {
                if (!alive) return;
                if (e.data === 1)
                  usePlayer.setState({
                    playing: true,
                    status: "playing",
                    error: null,
                  });
                else if (e.data === 2) {
                  if (usePlayer.getState().status !== "error")
                    usePlayer.setState({ playing: false, status: "paused" });
                  flush();
                } else if (e.data === 3)
                  usePlayer.getState().setStatus("loading");
                else if (e.data === 0) {
                  flush();
                  usePlayer.getState().ended();
                }
              },
              onError: fail,
              onAutoplayBlocked: fail,
            },
          });
          local = {
            play: () => {},
            pause: () => {},
            seek: () => {},
            volume: () => {},
            position: () => 0,
            duration: () => track.duration,
            audible: () => false,
            destroy: () => youtube.destroy(),
          };
        })
        .catch(fail);
    } else if (track.playback.kind === "youtube") {
      return () => {
        alive = false;
      };
    } else fail();
    const timer = window.setInterval(() => {
      if (!local || !alive) return;
      const now = performance.now(),
        elapsed = (now - lastTick) / 1000;
      lastTick = now;
      let pos = 0,
        duration = 0;
      try {
        pos = local.position();
        duration = local.duration();
      } catch {
        return;
      }
      const s = usePlayer.getState();
      s.sync(pos, duration || track.duration);
      const advanced = pos - lastPosition;
      // Only advancing, audible playback counts. Seeking and buffering add no time.
      if (
        s.status === "playing" &&
        !s.muted &&
        s.volume > 0 &&
        local.audible() &&
        advanced > 0 &&
        advanced <= elapsed + 1
      )
        seconds += Math.min(advanced, elapsed);
      lastPosition = pos;
      if (seconds >= 15) flush();
    }, 250);
    const pagehide = () => flush();
    window.addEventListener("pagehide", pagehide);
    if ("mediaSession" in navigator)
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        ...(track.artwork ? { artwork: [{ src: track.artwork }] } : {}),
      });
    return () => {
      alive = false;
      flush();
      window.clearInterval(timer);
      window.removeEventListener("pagehide", pagehide);
      if (adapter.current === local) adapter.current = null;
      local?.destroy();
    };
    // Same-id metadata and queue reordering must not restart the current track.
  }, [track?.id, loadId, expanded]);
  useEffect(() => {
    syncPlayback();
  }, [playing]);
  useEffect(() => {
    adapter.current?.volume(muted ? 0 : volume);
  }, [volume, muted]);
  useEffect(() => {
    if (seekRequest)
      try {
        adapter.current?.seek(seekRequest.position);
      } catch {
        usePlayer.getState().setStatus("error", message.current);
      }
  }, [seekRequest]);
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const actions: Partial<
      Record<MediaSessionAction, MediaSessionActionHandler>
    > = {
      play: () => {
        if (!usePlayer.getState().playing) usePlayer.getState().toggle();
      },
      pause: () => {
        if (usePlayer.getState().playing) usePlayer.getState().toggle();
      },
      nexttrack: () => usePlayer.getState().next(),
      previoustrack: () => usePlayer.getState().previous(),
      seekto: (d) => {
        if (d.seekTime !== undefined) usePlayer.getState().seek(d.seekTime);
      },
    };
    for (const [a, h] of Object.entries(actions))
      try {
        navigator.mediaSession.setActionHandler(a as MediaSessionAction, h!);
      } catch {}
    return () => {
      for (const a of Object.keys(actions))
        try {
          navigator.mediaSession.setActionHandler(
            a as MediaSessionAction,
            null,
          );
        } catch {}
    };
  }, []);
  return null;
}
