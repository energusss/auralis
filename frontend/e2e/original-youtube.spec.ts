import { expect, test } from "@playwright/test";

test.skip(
  process.env.AURALIS_LIVE_YOUTUBE_E2E !== "true",
  "requires the official YouTube IFrame API and a publicly embeddable video",
);

test("@live plays a real YouTube video through the original IFrame player", async ({
  page,
}) => {
  test.setTimeout(90000);
  const track = {
    id: "yt:dQw4w9WgXcQ",
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
    artistId: "yt:UCuAXFkgsw1L7xaCfnd5JJOw",
    album: "Whenever You Need Somebody",
    albumId: "",
    artwork: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    duration: 213,
    genre: "Pop",
    provider: "YouTube",
    playback: { kind: "youtube", videoId: "dQw4w9WgXcQ" },
  };
  await page.route("**/api/music/search?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tracks: [track],
        artists: [],
        albums: [],
        playlists: [],
        nextCursor: null,
      }),
    }),
  );
  await page.goto("/search?q=Never%20Gonna%20Give%20You%20Up");
  const row = page.locator(".track-row").filter({
    hasText: "Never Gonna Give You Up",
  });
  await expect(row).toBeVisible();
  await row.locator(".track-main").click();

  const player = page.locator(".youtube-player");
  await expect(player).toBeVisible({ timeout: 60000 });
  const iframe = player.locator("iframe");
  await expect(iframe).toBeVisible({ timeout: 60000 });
  const bounds = await iframe.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(200);
  expect(bounds?.height).toBeGreaterThanOrEqual(200);

  const play = page.locator(".player-bar .main-play");
  const isPlaying = async () => /Pauza|Pause/.test((await play.getAttribute("aria-label")) ?? "");
  if (!(await isPlaying())) {
    await page
      .frameLocator(".youtube-player iframe")
      .locator(".ytp-large-play-button")
      .click({ timeout: 30000 });
  }
  await expect.poll(isPlaying, { timeout: 30000 }).toBe(true);
  await expect
    .poll(async () => Number(await page.locator(".player-bar .progress input").inputValue()), {
      timeout: 30000,
    })
    .toBeGreaterThan(0.5);
  await expect(page.locator(".player-track")).toContainText("Never Gonna Give You Up");
});
