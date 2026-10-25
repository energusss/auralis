// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackEngine } from "./PlaybackEngine";
import { usePlayer } from "../stores/player";
import { resetAudioRuntimeForTests } from "../services/audioRuntime";
import type { Track } from "../types/music";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  duration = 100;
  volume = 1;
  muted = false;
  paused = true;
  preload = "";
  src = "";
  private listeners = new Map<
    string,
    Set<EventListenerOrEventListenerObject>
  >();
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    if (!this.paused) {
      this.paused = true;
      this.emit("pause");
    }
  });
  load = vi.fn(() => {
    this.currentTime = 0;
    this.paused = true;
  });
  removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
  addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
    const listeners =
      this.listeners.get(name) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(name, listeners);
  }
  removeEventListener(
    name: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    this.listeners.get(name)?.delete(listener);
  }
  emit(name: string) {
    for (const listener of this.listeners.get(name) ?? [])
      typeof listener === "function"
        ? listener(new Event(name))
        : listener.handleEvent(new Event(name));
  }
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
  playback: {
    kind: "audio",
    url: `https://example.com/${id}.mp3`,
    availability: "playable",
  },
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  resetAudioRuntimeForTests();
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
  resetAudioRuntimeForTests();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function start(
  onListen?: (track: Track, seconds: number, eventId: string) => void,
) {
  act(() => usePlayer.getState().play([track("a"), track("b")]));
  const rendered = render(<PlaybackEngine onListen={onListen} />);
  const audio = FakeAudio.instances[0];
  act(() => audio.emit("playing"));
  return { ...rendered, audio };
}

describe("persistent authorized audio engine", () => {
  it("uses one audio element across track changes and unrelated rerenders", () => {
    const { audio, rerender } = start();
    expect(audio.play).toHaveBeenCalledTimes(1);
    rerender(<PlaybackEngine />);
    act(() => usePlayer.getState().next());
    expect(FakeAudio.instances).toHaveLength(1);
    expect(audio.src).toContain("/b.mp3");
    expect(audio.play).toHaveBeenCalledTimes(2);
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

  it("rejects metadata-only YouTube tracks without creating another audio source", () => {
    const { audio } = start();
    const youtubeTrack: Track = {
      ...track("yt:abcdefghijk"),
      playback: {
        kind: "youtube",
        videoId: "abcdefghijk",
        availability: "metadata-only",
      },
    };
    const before = audio.play.mock.calls.length;
    act(() => usePlayer.getState().play([youtubeTrack]));
    expect(FakeAudio.instances).toHaveLength(1);
    expect(audio.play).toHaveBeenCalledTimes(before);
    expect(usePlayer.getState().queue[usePlayer.getState().index].id).toBe("a");
  });

  it("clears the source and stops audio when the queue is cleared", () => {
    const { audio } = start();
    act(() => usePlayer.getState().clear());
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.removeAttribute).toHaveBeenCalledWith("src");
    expect(audio.load).toHaveBeenCalled();
    expect(usePlayer.getState().status).toBe("idle");
  });

  it("automatically advances on ended and honors repeat-one", () => {
    const { audio } = start();
    act(() => audio.emit("ended"));
    expect(FakeAudio.instances).toHaveLength(1);
    expect(usePlayer.getState().queue[usePlayer.getState().index].id).toBe("b");
    act(() => usePlayer.getState().cycleRepeat());
    act(() => usePlayer.getState().cycleRepeat());
    act(() => audio.emit("ended"));
    expect(usePlayer.getState().queue[usePlayer.getState().index].id).toBe("b");
  });

  it("counts only actual audible playback for history", () => {
    const listened = vi.fn();
    const { audio } = start(listened);
    for (let i = 0; i < 16; i++)
      act(() => {
        audio.currentTime += 0.25;
        vi.advanceTimersByTime(250);
      });
    act(() => usePlayer.getState().clear());
    expect(listened).toHaveBeenCalledOnce();
    expect(listened.mock.calls[0][1]).toBe(4);
    expect(listened.mock.calls[0][2]).toMatch(/^[0-9a-f-]{36}$/);
  });
});
