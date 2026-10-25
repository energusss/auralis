import { uuid } from "../utils/id";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../stores/player";
import {
  getAudioElement,
  consumeExpectedPause,
  onAudioFailure,
  selectAudioTrack,
} from "../services/audioRuntime";
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
    const fail = () => usePlayer.getState().setStatus("error", message.current);
    const playing = () => usePlayer.getState().setStatus("playing");
    const waiting = () => usePlayer.getState().setStatus("loading");
    const paused = () => {
      const state = usePlayer.getState();
      if (
        !consumeExpectedPause() &&
        state.queue.length > 0 &&
        state.status !== "error"
      )
        usePlayer.setState({ playing: false, status: "paused" });
      flush();
    };
    const ended = () => {
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
      const position = Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : 0;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const state = usePlayer.getState();
      state.sync(position, duration || trackRef.current?.duration || 0);
      const advanced = position - previousPosition.current;
      if (
        state.status === "playing" &&
        !state.muted &&
        state.volume > 0 &&
        !audio.paused &&
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
    if (track)
      selectAudioTrack(track, loadId, state.volume, state.muted, state.playing);
    if (
      previousTrack.current?.id !== track?.id ||
      previousPosition.current > audio.currentTime + 1
    ) {
      flush();
      seconds.current = 0;
    }
    previousTrack.current = track;
    previousPosition.current = audio.currentTime || 0;
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
        if (!usePlayer.getState().playing) usePlayer.getState().toggle();
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

  return null;
}
