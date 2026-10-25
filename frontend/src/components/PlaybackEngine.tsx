import { uuid } from "../utils/id";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../stores/player";
import {
  getAudioElement,
  consumeExpectedPause,
  onAudioFailure,
  selectAudioTrack,
  pauseAudio,
} from "../services/audioRuntime";
import {
  deactivateYouTube,
  initializeYouTubePlayer,
  selectYouTubeTrack,
  youtubeDuration,
  youtubeIsActive,
  youtubeIsAudible,
  youtubePosition,
  setYouTubeVolume,
} from "../services/youtubeRuntime";
import type { Track } from "../types/music";

export function PlaybackEngine({
  onListen,
}: {
  onListen?: (track: Track, seconds: number, eventId: string) => void;
}) {
  const { t } = useTranslation();
  const track = usePlayer((s) => s.queue[s.index]);
  const loadId = usePlayer((s) => s.loadId);
  const callback = useRef(onListen);
  const trackRef = useRef(track);
  const errorMessage = t("playbackError", {
    defaultValue: "Playback failed. Retry or choose another track.",
  });
  const message = useRef(errorMessage);
  const host = useRef<HTMLDivElement>(null);
  const seconds = useRef(0);
  const previousPosition = useRef(0);
  const previousTick = useRef(0);
  const previousTrack = useRef<Track | undefined>(track);
  callback.current = onListen;
  trackRef.current = track;
  message.current = errorMessage;

  const flush = useCallback(() => {
    const played = Math.floor(seconds.current);
    const item = previousTrack.current;
    if (played > 0 && item) callback.current?.(item, played, uuid());
    seconds.current = Math.max(0, seconds.current - played);
  }, []);

  useEffect(() => {
    const audio = getAudioElement();
    const isYoutube = () =>
      usePlayer.getState().queue[usePlayer.getState().index]?.playback.kind ===
      "youtube";
    const fail = () => {
      if (!isYoutube())
        usePlayer.getState().setStatus("error", message.current);
    };
    const playing = () => {
      if (!isYoutube()) usePlayer.getState().setStatus("playing");
    };
    const waiting = () => {
      if (!isYoutube()) usePlayer.getState().setStatus("loading");
    };
    const paused = () => {
      const state = usePlayer.getState();
      const expected = consumeExpectedPause();
      if (
        !expected &&
        !isYoutube() &&
        state.queue.length > 0 &&
        state.status !== "error"
      )
        usePlayer.setState({ playing: false, status: "paused" });
      flush();
    };
    const ended = () => {
      if (isYoutube()) return;
      flush();
      usePlayer.getState().ended();
    };
    audio.addEventListener("playing", playing);
    audio.addEventListener("waiting", waiting);
    audio.addEventListener("pause", paused);
    audio.addEventListener("ended", ended);
    audio.addEventListener("error", fail);
    const removeFailureHandler = onAudioFailure(fail);
    previousPosition.current = audio.currentTime || 0;
    previousTick.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.max(0, (now - previousTick.current) / 1000);
      previousTick.current = now;
      const state = usePlayer.getState();
      const youtube =
        state.queue[state.index]?.playback.kind === "youtube" &&
        youtubeIsActive();
      const audioPosition = Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : 0;
      const position = youtube ? youtubePosition() : audioPosition;
      const audioDuration = Number.isFinite(audio.duration)
        ? audio.duration
        : 0;
      const duration = youtube ? youtubeDuration() : audioDuration;
      state.sync(position, duration || trackRef.current?.duration || 0);
      const advanced = position - previousPosition.current;
      if (
        state.status === "playing" &&
        !state.muted &&
        state.volume > 0 &&
        (youtube ? youtubeIsAudible() : !audio.paused) &&
        advanced > 0 &&
        advanced <= elapsed + 1
      )
        seconds.current += Math.min(advanced, elapsed);
      previousPosition.current = position;
      if (seconds.current >= 15) flush();
    }, 250);
    const pagehide = () => flush();
    window.addEventListener("pagehide", pagehide);
    return () => {
      flush();
      window.clearInterval(timer);
      window.removeEventListener("pagehide", pagehide);
      audio.removeEventListener("playing", playing);
      audio.removeEventListener("waiting", waiting);
      audio.removeEventListener("pause", paused);
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("error", fail);
      removeFailureHandler();
    };
  }, [flush]);

  useEffect(() => {
    const audio = getAudioElement();
    const state = usePlayer.getState();
    if (track?.playback.kind === "youtube" && track.playback.videoId) {
      pauseAudio();
      const onStateChange = (status: number) => {
        const current = usePlayer.getState();
        if (
          !youtubeIsActive() ||
          current.queue[current.index]?.playback.kind !== "youtube"
        )
          return;
        if (status === 1)
          usePlayer.setState({ playing: true, status: "playing", error: null });
        else if (status === 2) {
          if (current.status !== "error")
            usePlayer.setState({ playing: false, status: "paused" });
          flush();
        } else if (status === 3) current.setStatus("loading");
        else if (status === 0) {
          flush();
          current.ended();
        }
      };
      initializeYouTubePlayer(host.current!, {
        onReady: () => {
          const current = usePlayer.getState();
          setYouTubeVolume(current.volume, current.muted);
        },
        onStateChange,
        onAutoplayBlocked: () =>
          youtubeIsActive() &&
          usePlayer.getState().setStatus(
            "error",
            t("youtubeAutoplayBlocked", {
              defaultValue:
                "Use the visible YouTube player controls to start playback.",
            }),
          ),
        onError: (code) => {
          if (!youtubeIsActive()) return;
          const key =
            code === 101 || code === 150
              ? "youtubeEmbeddingBlocked"
              : code === 100
                ? "youtubeUnavailable"
                : "youtubePlayerError";
          usePlayer.getState().setStatus(
            "error",
            t(key, {
              defaultValue:
                code === 101 || code === 150
                  ? "This video cannot be played in an embedded player."
                  : code === 100
                    ? "This video is unavailable or private."
                    : "The YouTube player could not play this video.",
            }),
          );
        },
      });
      selectYouTubeTrack(
        track.playback.videoId,
        `${track.id}:${loadId}`,
        state.playing,
        state.volume,
        state.muted,
      );
    } else {
      deactivateYouTube();
    }
    if (track?.playback.kind === "audio")
      selectAudioTrack(track, loadId, state.volume, state.muted, state.playing);
    const position =
      track?.playback.kind === "youtube" ? 0 : audio.currentTime || 0;
    if (
      previousTrack.current?.id !== track?.id ||
      previousPosition.current > position + 1
    ) {
      flush();
      seconds.current = 0;
    }
    previousTrack.current = track;
    previousPosition.current = position;
    if (
      track &&
      "mediaSession" in navigator &&
      typeof MediaMetadata !== "undefined"
    ) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        ...(track.artwork ? { artwork: [{ src: track.artwork }] } : {}),
      });
    }
  }, [track?.id, loadId, flush]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const actions: Partial<
      Record<MediaSessionAction, MediaSessionActionHandler>
    > = {
      play: () => {
        const state = usePlayer.getState();
        if (
          !state.playing &&
          !(
            document.hidden &&
            state.queue[state.index]?.playback.kind === "youtube"
          )
        )
          state.toggle();
      },
      pause: () => {
        if (usePlayer.getState().playing) usePlayer.getState().toggle();
      },
      nexttrack: () => usePlayer.getState().next(),
      previoustrack: () => usePlayer.getState().previous(),
      seekto: (detail) => {
        if (detail.seekTime !== undefined)
          usePlayer.getState().seek(detail.seekTime);
      },
    };
    for (const [action, handler] of Object.entries(actions))
      try {
        navigator.mediaSession.setActionHandler(
          action as MediaSessionAction,
          handler!,
        );
      } catch {}
    return () => {
      for (const action of Object.keys(actions))
        try {
          navigator.mediaSession.setActionHandler(
            action as MediaSessionAction,
            null,
          );
        } catch {}
    };
  }, []);

  useEffect(() => {
    const pauseHiddenYouTube = () => {
      const state = usePlayer.getState();
      if (
        document.hidden &&
        state.playing &&
        state.queue[state.index]?.playback.kind === "youtube"
      )
        state.toggle();
    };
    document.addEventListener("visibilitychange", pauseHiddenYouTube);
    return () =>
      document.removeEventListener("visibilitychange", pauseHiddenYouTube);
  }, []);

  const youtube = track?.playback.kind === "youtube";
  return (
    <aside
      className={`youtube-player glass${youtube ? " is-active" : ""}`}
      aria-label={t("officialPlayer", {
        defaultValue: "Official YouTube player",
      })}
      aria-hidden={!youtube}
      aria-live="polite"
    >
      <div className="youtube-player-viewport" ref={host} />
      <div className="youtube-player-caption">
        {t("officialPlayer", { defaultValue: "Official YouTube player" })}
      </div>
    </aside>
  );
}
