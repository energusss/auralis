// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { search } from "./api";
import { isPlayableTrack, isResolvableTrack } from "../types/music";

afterEach(() => vi.unstubAllGlobals());

describe("typed music search results", () => {
  it("keeps artist and channel results separate from playable tracks", async () => {
    const result = {
      tracks: [],
      artists: [{ id: "yt:channel-id", name: "Auralis Artist", artwork: "" }],
      albums: [],
      playlists: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(result), { status: 200 })),
    );
    const response = await search("Auralis Artist", "all");
    expect(response.artists[0].id).toBe("yt:channel-id");
    expect(response.tracks).toEqual([]);
  });

  it("keeps open-audio metadata non-playable until a source is resolved", () => {
    const track = {
      id: "ia:DirectionlessEP:b35aec4f8033cb9d",
      title: "Night Owl",
      artist: "Broke For Free",
      playback: {
        kind: "audio",
        availability: "resolvable",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        sourcePage: "https://archive.org/details/DirectionlessEP",
      },
    };
    expect(isResolvableTrack(track)).toBe(true);
    expect(isPlayableTrack(track)).toBe(false);
  });

  it("uses the distinct live open-audio search endpoint", async () => {
    const result = { tracks: [], artists: [], albums: [], playlists: [] };
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    await search("Directionless EP", "open-audio");
    expect(String(fetcher.mock.calls[0][0])).toContain("/music/open-audio/search?");
  });
});
