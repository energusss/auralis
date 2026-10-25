import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isPlayableTrack, type Track } from "../types/music";
import {
  pauseAudio,
  resumeAudio,
  seekAudio,
  selectAudioTrack,
  setAudioVolume,
  stopAudio,
} from "../services/audioRuntime";
import {
  deactivateYouTube,
  pauseYouTube,
  playYouTube,
  seekYouTube,
  selectYouTubeTrack,
  setYouTubeVolume,
} from "../services/youtubeRuntime";
export type Repeat = "none" | "one" | "all";
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
export function nextQueueIndex(
  index: number,
  length: number,
  shuffle: boolean,
  repeat: Repeat,
  random = Math.random,
): number {
  if (length === 0) return -1;
  if (shuffle && length > 1) {
    const n = Math.floor(random() * (length - 1));
    return n >= index ? n + 1 : n;
  }
  return index + 1 < length ? index + 1 : repeat === "all" ? 0 : -1;
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length)
    return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
function selectTrack(
  track: Track,
  loadId: number,
  volume: number,
  muted: boolean,
  shouldPlay: boolean,
) {
  if (track.playback.kind === "youtube" && track.playback.videoId) {
    pauseAudio();
    selectYouTubeTrack(
      track.playback.videoId,
      `${track.id}:${loadId}`,
      shouldPlay,
      volume,
      muted,
    );
  } else {
    deactivateYouTube();
    selectAudioTrack(track, loadId, volume, muted, shouldPlay);
  }
}
function pauseCurrent(track: Track | undefined) {
  if (track?.playback.kind === "youtube") pauseYouTube();
  else pauseAudio();
}
function resumeCurrent(track: Track | undefined) {
  if (track?.playback.kind === "youtube") playYouTube();
  else resumeAudio();
}
interface PlayerState {
  queue: Track[];
  index: number;
  playing: boolean;
  status: PlayerStatus;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  error: string | null;
  loadId: number;
  seekRequest: { position: number; id: number } | null;
  play: (tracks: Track[], index?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  ended: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  enqueue: (track: Track) => void;
  remove: (index: number) => void;
  reorder: (from: number, to: number) => void;
  clear: () => void;
  sync: (position: number, duration: number) => void;
  setStatus: (status: PlayerStatus, error?: string) => void;
}
export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      status: "idle",
      position: 0,
      duration: 0,
      volume: 0.75,
      muted: false,
      shuffle: false,
      repeat: "none",
      error: null,
      loadId: 0,
      seekRequest: null,
      play: (tracks, index = 0) => {
        const playable = tracks
          .map((track, sourceIndex) => ({ track, sourceIndex }))
          .filter(({ track }) => isPlayableTrack(track));
        if (!playable.length) return;
        const i = Math.max(
          0,
          playable.findIndex(({ sourceIndex }) => sourceIndex === index),
        );
        set((s) => ({
          queue: playable.map(({ track }) => track),
          index: i,
          position: 0,
          duration: playable[i].track.duration,
          playing: true,
          status: "loading",
          error: null,
          loadId: s.loadId + 1,
          seekRequest: null,
        }));
        const state = get();
        selectTrack(
          state.queue[state.index],
          state.loadId,
          state.volume,
          state.muted,
          true,
        );
      },
      toggle: () => {
        if (!get().queue.length) return;
        const wasPlaying = get().playing;
        const wasError = get().status === "error";
        set((s) => ({
          playing: !s.playing,
          error: null,
          status: s.playing ? "paused" : "loading",
          ...(s.status === "error" ? { loadId: s.loadId + 1 } : {}),
        }));
        const state = get();
        if (wasPlaying) pauseCurrent(state.queue[state.index]);
        else if (wasError)
          selectTrack(
            state.queue[state.index],
            state.loadId,
            state.volume,
            state.muted,
            true,
          );
        else resumeCurrent(state.queue[state.index]);
      },
      next: () => {
        const s = get();
        const i = nextQueueIndex(s.index, s.queue.length, s.shuffle, s.repeat);
        if (i < 0) {
          set({ playing: false, status: "paused" });
          pauseCurrent(s.queue[s.index]);
          return;
        }
        set({
          index: i,
          position: 0,
          duration: s.queue[i].duration,
          playing: true,
          status: "loading",
          error: null,
          loadId: s.loadId + 1,
          seekRequest: null,
        });
        const state = get();
        selectTrack(
          state.queue[i],
          state.loadId,
          state.volume,
          state.muted,
          true,
        );
      },
      previous: () => {
        const s = get();
        if (s.position > 3) {
          s.seek(0);
          return;
        }
        if (!s.queue.length) return;
        const i = Math.max(0, s.index - 1);
        set({
          index: i,
          position: 0,
          duration: s.queue[i].duration,
          playing: true,
          status: "loading",
          error: null,
          loadId: s.loadId + 1,
          seekRequest: null,
        });
        const state = get();
        selectTrack(
          state.queue[i],
          state.loadId,
          state.volume,
          state.muted,
          true,
        );
      },
      ended: () => {
        const s = get();
        if (s.repeat === "one") {
          set({
            loadId: s.loadId + 1,
            position: 0,
            playing: true,
            status: "loading",
            seekRequest: null,
          });
          const state = get();
          selectTrack(
            state.queue[state.index],
            state.loadId,
            state.volume,
            state.muted,
            true,
          );
        } else s.next();
      },
      seek: (seconds) => {
        set((s) => ({
          seekRequest: {
            position: Math.max(0, Math.min(seconds, s.duration || seconds)),
            id: (s.seekRequest?.id ?? 0) + 1,
          },
        }));
        const state = get();
        if (state.queue[state.index]?.playback.kind === "youtube")
          seekYouTube(state.seekRequest?.position ?? seconds);
        else seekAudio(state.seekRequest?.position ?? seconds);
      },
      setVolume: (volume) => {
        const value = Math.max(0, Math.min(1, volume));
        set({ volume: value, muted: false });
        setAudioVolume(value, false);
        setYouTubeVolume(value, false);
      },
      toggleMute: () => {
        const muted = !get().muted;
        set({ muted });
        setAudioVolume(get().volume, muted);
        setYouTubeVolume(get().volume, muted);
      },
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      cycleRepeat: () =>
        set((s) => ({
          repeat:
            s.repeat === "none" ? "all" : s.repeat === "all" ? "one" : "none",
        })),
      enqueue: (track) => {
        if (isPlayableTrack(track))
          set((s) => ({ queue: [...s.queue, track] }));
      },
      remove: (index) => {
        const s = get();
        if (index < 0 || index >= s.queue.length) return;
        const queue = s.queue.filter((_, i) => i !== index);
        if (!queue.length) {
          s.clear();
          return;
        }
        if (index === s.index) {
          const nextIndex = Math.min(index, queue.length - 1);
          set({
            queue,
            index: nextIndex,
            position: 0,
            duration: queue[Math.min(index, queue.length - 1)].duration,
            status: s.playing ? "loading" : "paused",
            error: null,
            seekRequest: null,
            loadId: s.loadId + 1,
          });
          const state = get();
          selectTrack(
            state.queue[nextIndex],
            state.loadId,
            state.volume,
            state.muted,
            state.playing,
          );
        } else set({ queue, index: index < s.index ? s.index - 1 : s.index });
      },
      reorder: (from, to) =>
        set((s) => {
          const queue = moveItem(s.queue, from, to);
          if (queue === s.queue) return {};
          let index = s.index;
          if (from === index) index = to;
          else if (from < index && to >= index) index--;
          else if (from > index && to <= index) index++;
          return { queue, index };
        }),
      clear: () => {
        set((s) => ({
          queue: [],
          index: 0,
          position: 0,
          duration: 0,
          playing: false,
          status: "idle",
          error: null,
          loadId: s.loadId + 1,
        }));
        stopAudio();
        deactivateYouTube();
      },
      sync: (position, duration) =>
        set({
          position: Number.isFinite(position) ? Math.max(0, position) : 0,
          duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
        }),
      setStatus: (status, error) =>
        set({
          status,
          error: error ?? null,
          ...(status === "error" ? { playing: false } : {}),
        }),
    }),
    {
      name: "auralis-player",
      partialize: (s) => ({
        queue: s.queue.filter(isPlayableTrack),
        index: s.index,
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<PlayerState> | undefined;
        const queue = (saved?.queue ?? []).filter(isPlayableTrack);
        const selected = saved?.queue?.[saved.index ?? 0];
        const index = queue.findIndex((track) => track.id === selected?.id);
        return {
          ...current,
          ...saved,
          queue,
          index: Math.max(0, index),
          position: 0,
          playing: false,
          status: queue.length ? "paused" : "idle",
        };
      },
    },
  ),
);
