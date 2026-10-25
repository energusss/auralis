import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "../types/music";
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
        if (!tracks.length) return;
        const i = Math.max(0, Math.min(index, tracks.length - 1));
        set((s) => ({
          queue: [...tracks],
          index: i,
          position: 0,
          duration: tracks[i].duration,
          playing: true,
          status: "loading",
          error: null,
          loadId: s.loadId + 1,
          seekRequest: null,
        }));
      },
      toggle: () => {
        if (!get().queue.length) return;
        set((s) => ({
          playing: !s.playing,
          error: null,
          status: s.playing ? "paused" : "loading",
          ...(s.status === "error" ? { loadId: s.loadId + 1 } : {}),
        }));
      },
      next: () => {
        const s = get();
        const i = nextQueueIndex(s.index, s.queue.length, s.shuffle, s.repeat);
        if (i < 0) {
          set({ playing: false, status: "paused" });
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
        } else s.next();
      },
      seek: (seconds) =>
        set((s) => ({
          seekRequest: {
            position: Math.max(0, Math.min(seconds, s.duration || seconds)),
            id: (s.seekRequest?.id ?? 0) + 1,
          },
        })),
      setVolume: (volume) =>
        set({ volume: Math.max(0, Math.min(1, volume)), muted: false }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      cycleRepeat: () =>
        set((s) => ({
          repeat:
            s.repeat === "none" ? "all" : s.repeat === "all" ? "one" : "none",
        })),
      enqueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
      remove: (index) => {
        const s = get();
        if (index < 0 || index >= s.queue.length) return;
        const queue = s.queue.filter((_, i) => i !== index);
        if (!queue.length) {
          s.clear();
          return;
        }
        if (index === s.index)
          set({
            queue,
            index: Math.min(index, queue.length - 1),
            position: 0,
            duration: queue[Math.min(index, queue.length - 1)].duration,
            status: s.playing ? "loading" : "paused",
            error: null,
            seekRequest: null,
            loadId: s.loadId + 1,
          });
        else set({ queue, index: index < s.index ? s.index - 1 : s.index });
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
      clear: () =>
        set((s) => ({
          queue: [],
          index: 0,
          position: 0,
          duration: 0,
          playing: false,
          status: "idle",
          error: null,
          loadId: s.loadId + 1,
        })),
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
        queue: s.queue,
        index: s.index,
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    },
  ),
);
