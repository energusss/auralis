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
        selectAudioTrack(
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
        if (wasPlaying) pauseAudio();
        else if (wasError)
          selectAudioTrack(
            state.queue[state.index],
            state.loadId,
            state.volume,
            state.muted,
            true,
          );
        else resumeAudio();
      },
      next: () => {
        const s = get();
        const i = nextQueueIndex(s.index, s.queue.length, s.shuffle, s.repeat);
        if (i < 0) {
          set({ playing: false, status: "paused" });
          pauseAudio();
          return;
        }
        set({
          index: i,
          posit