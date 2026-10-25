// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { moveItem, nextQueueIndex, usePlayer } from "./player";
import type { Track } from "../types/music";
import { resetYouTubeRuntimeForTests } from "../services/youtubeRuntime";
const track = (id: string): Track => ({
  id,
  title: id,
  artist: "Test",
  artistId: "a",
  album: "Album",
  albumId: "b",
  artwork: "",
  duration: 100,
  genre: "Test",
  provider: "test",
  playback: { kind: "audio", url: "https://example.com/test.mp3" },
});
beforeEach(() => {
  resetYouTubeRuntimeForTests();
  usePlayer.setState({
    queue: [],
    index: 0,
    playing: false,
    position: 0,
    repeat: "none",
    shuffle: false,
    loadId: 0,
  });
});
describe("queue transitions", () => {
  it("stops at end unless repeat-all is enabled", () => {
    expect(nextQueueIndex(2, 3, false, "none")).toBe(-1);
    expect(nextQueueIndex(2, 3, false, "all")).toBe(0);
  });
  it("shuffle avoids immediately repeating the current track", () => {
    for (const sample of [0, 0.25, 0.5, 0.99])
      expect(nextQueueIndex(1, 4, true, "none", () => sample)).not.toBe(1);
  });
  it("preserves playing track after another item is moved", () => {
    usePlayer.getState().play([track("a"), track("b"), track("c")], 1);
    usePlayer.getState().reorder(0, 2);
    const s = usePlayer.getState();
    expect(s.queue[s.index].id).toBe("b");
    expect(s.loadId).toBe(1);
  });
  it("preserves duplicate queue entries when moving current item", () => {
    usePlayer.getState().play([track("a"), track("a"), track("b")], 1);
    usePlayer.getState().reorder(1, 2);
    expect(usePlayer.getState().index).toBe(2);
  });
  it("repeats one automatically but advances manually", () => {
    usePlayer.getState().play([track("a"), track("b")]);
    usePlayer.setState({ repeat: "one" });
    usePlayer.getState().ended();
    expect(usePlayer.getState().index).toBe(0);
    expect(usePlayer.getState().loadId).toBe(2);
    usePlayer.getState().next();
    expect(usePlayer.getState().index).toBe(1);
  });
  it("removing final queue item stops playback", () => {
    usePlayer.getState().play([track("a")]);
    usePlayer.getState().remove(0);
    expect(usePlayer.getState().playing).toBe(false);
    expect(usePlayer.getState().queue).toEqual([]);
  });
  it("ignores invalid reorder indexes", () => {
    const a = [1, 2];
    expect(moveItem(a, -1, 1)).toBe(a);
  });
  it("rejects artist/channel results and tracks without an authorized source", () => {
    const before = usePlayer.getState().queue;
    usePlayer
      .getState()
      .play([
        { id: "yt:channel", name: "Artist", artwork: "" } as unknown as Track,
      ]);
    usePlayer.getState().enqueue({
      id: "yt:channel",
      name: "Artist",
      artwork: "",
    } as unknown as Track);
    expect(usePlayer.getState().queue).toBe(before);
    usePlayer
      .getState()
      .play([{ ...track("invalid"), playback: { kind: "youtube" } } as Track]);
    expect(usePlayer.getState().queue).toBe(before);
  });
  it("classifies YouTube metadata as non-playable and never queues it", () => {
    const metadata = {
      ...track("yt:abcdefghijk"),
      playback: {
        kind: "youtube",
        videoId: "abcdefghijk",
        availability: "metadata-only",
      },
    } as Track;
    usePlayer.getState().play([metadata]);
    usePlayer.getState().enqueue(metadata);
    expect(usePlayer.getState().queue).toEqual([]);
  });
  it("accepts official YouTube embeds in mixed-provider queues", () => {
    const youtube = {
      ...track("yt:dQw4w9WgXcQ"),
      provider: "YouTube",
      playback: {
        kind: "youtube",
        videoId: "dQw4w9WgXcQ",
        availability: "official-player",
      },
    } as Track;
    const archive = {
      ...track("ia:archive-track"),
      provider: "Internet Archive",
    };
    usePlayer.getState().play([youtube, archive]);
    expect(usePlayer.getState().queue.map((item) => item.id)).toEqual([
      youtube.id,
      archive.id,
    ]);
    usePlayer.getState().next();
    expect(usePlayer.getState().queue[usePlayer.getState().index].id).toBe(
      archive.id,
    );
    usePlayer.getState().previous();
    expect(usePlayer.getState().queue[usePlayer.getState().index].id).toBe(
      youtube.id,
    );
  });
  it("previous seeks to beginning after three seconds", () => {
    usePlayer.getState().play([track("a"), track("b")], 1);
    usePlayer.setState({ position: 20 });
    usePlayer.getState().previous();
    expect(usePlayer.getState().index).toBe(1);
    expect(usePlayer.getState().seekRequest?.position).toBe(0);
  });
});
