import { test, expect } from "@playwright/test";

test.skip(
  process.env.AURALIS_LIVE_PROVIDER_E2E !== "true",
  "requires an external YouTube iframe and Internet Archive audio",
);

test("@live plays the official YouTube video and switches a mixed queue to Archive audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    window.Audio = new Proxy(OriginalAudio, {
      construct(target, args) {
        const audio = Reflect.construct(target, args) as HTMLAudioElement;
        (
          window as Window & { __auralisAudio?: HTMLAudioElement }
        ).__auralisAudio = audio;
        return audio;
      },
    });
  });
  const video = {
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
    playback: {
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
      availability: "official-player",
    },
  };
  const archiveSearch = await page.request.get(
    "http://127.0.0.1:5173/api/music/open-audio/search?q=Directionless%20EP",
  );
  expect(archiveSearch.ok()).toBe(true);
  const archiveResults = await archiveSearch.json();
  const archive = archiveResults.tracks.find((item: { title: string }) =>
    item.title.includes("Night Owl"),
  );
  expect(archive?.playback.availability).toBe("resolvable");
  await page.route("**/api/music/search?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        tracks: [video, archive],
        artists: [],
        albums: [],
        playlists: [],
      }),
    }),
  );
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/search?q=Never%20Gonna%20Give%20You%20Up");
  const videoRow = page
    .locator(".track-row")
    .filter({ hasText: "Never Gonna Give You Up" });
  await expect(videoRow).toBeVisible();
  await videoRow.locator(".track-main").click();

  const officialPlayer = page.locator(".youtube-player.is-active");
  await expect(officialPlayer).toBeVisible({ timeout: 30000 });
  const iframe = officialPlayer.locator("iframe");
  await expect(iframe).toBeVisible({ timeout: 30000 });
  const bounds = await iframe.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(200);
  expect(bounds?.height).toBeGreaterThanOrEqual(200);

  const playPause = page.locator(".player-bar .main-play");
  try {
    await expect
      .poll(() => playPause.getAttribute("aria-label"), { timeout: 45000 })
      .toBe("Pauza");
  } catch {
    // If Chromium blocks API autoplay, start it with the visible native YouTube control.
    await page
      .frameLocator(".youtube-player iframe")
      .locator(".ytp-large-play-button")
      .click({ timeout: 15000 });
  }
  await expect
    .poll(() => playPause.getAttribute("aria-label"), { timeout: 30000 })
    .toBe("Pauza");
  await expect(page.locator(".player-track")).toContainText(
    "Never Gonna Give You Up",
  );

  await page
    .locator(".player-bar")
    .getByRole("button", { name: "Następny" })
    .click();
  try {
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const audio = (
              window as Window & { __auralisAudio?: HTMLAudioElement }
            ).__auralisAudio;
            return Boolean(
              decodeURIComponent(audio?.currentSrc || audio?.src || "")
                .replace(/[_-]+/g, " ")
                .toLowerCase()
                .includes("archive.org/download/") &&
              decodeURIComponent(audio?.currentSrc || audio?.src || "")
                .replace(/[_-]+/g, " ")
                .toLowerCase()
                .includes("night owl") &&
              !audio.paused &&
              audio.currentTime > 0.5,
            );
          }),
        { timeout: 45000 },
      )
      .toBe(true);
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const audio = (window as Window & { __auralisAudio?: HTMLAudioElement })
        .__auralisAudio;
      return {
        src: audio?.currentSrc || audio?.src,
        paused: audio?.paused,
        currentTime: audio?.currentTime,
        readyState: audio?.readyState,
        networkState: audio?.networkState,
        error: audio?.error?.message,
        track: document.querySelector(".player-track")?.textContent,
      };
    });
    console.log(
      `Mixed-provider audio diagnostics: ${JSON.stringify(diagnostics)}`,
    );
    throw error;
  }
  await expect(page.locator(".player-track")).toContainText("Night Owl");

  await page
    .locator(".player-bar")
    .getByRole("button", { name: "Poprzedni" })
    .click();
  await expect(page.locator(".player-track")).toContainText(
    "Never Gonna Give You Up",
  );
  await expect(page.locator(".youtube-player.is-active iframe")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
