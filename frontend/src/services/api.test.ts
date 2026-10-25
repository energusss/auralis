// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { search } from "./api";

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
});
