// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackEngine } from "./PlaybackEngine";
import { usePlayer } from "../stores/player";
import type { Track } from "../types/music";
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  duration = 100;
  volume = 1;
  preload = "";
  src = "";
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onwaiting: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => {
    this.onpause?.();
  });
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor() {
    FakeAudio.instances.push(this);
  }
}
const track = (id: string): Track => ({
  id,
  title: id,
  artist: "Artist",
  artistId: "a",
  album: "Album",
  albumId: "b",
  artwork: "",
  duration: 100,
  genre: "Ambient",
  provider: "test",
  playback: { kind: "audio", url: `https://example.com/${id}.mp3` },
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  FakeAudio.instances = [];
  vi.stubGlobal("Audio", FakeAudio);
  usePlayer.setState({
    queue: [],
    index: 0,
    playing: false,
    status: "idle",
    position: 0,
    duration: 0,
    volume: 0.75,
    muted: false,
    repeat: "none",
    shuffle: false,
    loadId: 0,
    seekRequest: null,
    error: null,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function start() {
  act(() => usePlayer.getState().play([track("a"), track("b")]));
  const rendered = render(<PlaybackEngine />);
  const audio = FakeAudio.instances[0];
  act(() => audio.onplaying?.());
  return { ...rendered, audio };
}
describe("authorized audio adapter lifecycle", () => {
  it("loads once and survives unrelated rerenders and queue reordering", () => {
    const { audio, rerender } = start();
    expect(audio.play).toHaveBeenCalledTimes(1);
    rerender(<PlaybackEngine />);
    act(() => usePlayer.getState().reorder(0, 1));
    expect(FakeAudio.instances).toHaveLength(1);
    expect(audio.pause).not.toHaveBeenCalled();
  });
  it("pauses, resumes, seeks and changes volume through global controls", () => {
    const { audio } = start();
    act(() => usePlayer.getState().toggle());
    expect(audio.pause).toHaveBeenCalledOnce();
    act(() => usePlayer.getState().toggle());
    expect(audio.play).toHaveBeenCalledTimes(2);
    act(() => usePlayer.getState().seek(45));
    expect(audio.currentTime).toBe(45);
    act(() => usePlayer.getState().setVolume(0.3));
    expect(audio.volume).toBe(0.3);
    act(() => usePlayer.getState().toggleMute());
    expect(audio.volume).toBe(0);
  });
  it("stops and releases media when the queue is cleared", () => {
    const { audio } = start();
    act(() => usePlayer.getState().clear());
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(audio.load).toHaveBeenCalled();
    expect(usePlayer.getState().status).toBe("idle");
  });
  it("moves to the next source on ended without stale events changing state", () => {
    const { audio } = start();
    act(() => audio.onended?.());
    expect(FakeAudio.instances).toHaveLength(2);
    expect(usePlayer.getState().queue[usePlayer.getState().index].id).toBe("b");
    act(() => audio.onerror?.());
    expect(usePlayer.getState().error).toBeNull();
  });
  it("retains an error through pause and recreates source on retry", () => {
    const { audio } = start();
    act(() => audio.onerror?.());
    expect(usePlayer.getState().status).toBe("error");
    expect(usePlayer.getState().error).toBe("playbackError");
    act(() => usePlayer.getState().toggle());
    expect(FakeAudio.instances).toHaveLength(2);
    expect(usePlayer.getState().error).toBeNull();
  });
  it("does not let a rejected stale resume promise stop the new track", async () => {
    const { audio } = start();
    let reject!: (error: Error) => void;
    audio.play.mockImplementationOnce(
      () =>
        new Promise<void>((_, r) => {
          reject = r;
        }),
    );
    act(() => usePlayer.getState().toggle());
    act(() => usePlayer.getState().toggle());
    act(() => usePlayer.getState().next());
    await act(async () => reject(new Error("aborted old media")));
    expect(usePlayer.getState().error).toBeNull();
    expect(usePlayer.getState().playing).toBe(true);
  });
  it("counts actual advancing audible time, excluding buffering, muted audio and seeks", () => {
    const listened = vi.fn();
    act(() => usePlayer.getState().play([track("a")]));
    render(<PlaybackEngine onListen={listened} />);
    const audio = FakeAudio.instances[0];
    act(() => audio.onplaying?.());
    const ticks = (n: number) => {
      for (let i = 0; i < n; i++)
        act(() => {
          audio.currentTime += 0.25;
          vi.advanceTimersByTime(250);
        });
    };
    ticks(8);
    act(() => audio.onwaiting?.());
    ticks(8);
    act(() => audio.onplaying?.());
    act(() => usePlayer.getState().toggleMute());
    ticks(8);
    act(() => usePlayer.getState().toggleMute());
    act(() => {
      audio.currentTime = 70;
      vi.advanceTimersByTime(250);
    });
    ticks(8);
    act(() => usePlayer.getState().clear());
    expect(listened).toHaveBeenCalledOnce();
    expect(listened.mock.calls[0][1]).toBe(4);
    expect(listened.mock.calls[0][2]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
