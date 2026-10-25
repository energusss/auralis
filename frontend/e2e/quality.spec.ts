import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.abort());
});

test("artist search stays navigable and artist records are not playable rows", async ({ page }) => {
  await page.route("**/api/music/search**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      tracks: [{ id: "yt:abcdefghijk", title: "Hello", artist: "Adele", artistId: "yt:UC-adele", album: "", albumId: "", artwork: "", duration: 200, genre: "Music", provider: "YouTube", playback: { kind: "youtube", videoId: "abcdefghijk" } }],
      artists: [{ id: "yt:UC-adele", name: "Adele", artwork: "" }],
      albums: [],
      playlists: [],
      nextCursor: null,
    }),
  }));
  await page.goto("/search?q=Adele");
  await expect(page.locator(".youtube-player")).toHaveCSS("display", "none");
  await expect(page.getByRole("heading", { name: "Najlepszy wynik" })).toBeVisible();
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page.locator('.artist-card[href="/artist/yt%3AUC-adele"]')).toBeVisible();
  await expect(page.locator(".track-row .track-main")).toContainText("Hello");
  await expect(page.locator(".track-row .track-main")).not.toContainText("Adele\nAdele");
  await page.locator(".search-top-result").click();
  await expect(page).toHaveURL(/\/artist\/yt%3AUC-adele/);
  await expect(page.locator(".player-center .main-play")).toBeDisabled();
});

test("track actions work, expanded player has artwork, and settings switch language", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowa playlista" }).click();
  await page.getByRole("textbox", { name: "Nazwa playlisty" }).fill("Menu test");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await page.goto("/search?q=Kevin");
  const firstTrack = page.locator(".track-row").first();
  await expect(firstTrack).toContainText("Carefree");
  await firstTrack.getByRole("button", { name: "Więcej opcji utworu" }).click();
  await page.getByRole("menuitem", { name: "Dodaj do ulubionych" }).click();
  await expect(page.getByRole("status")).toContainText("Zapisano w polubionych");

  await firstTrack.getByRole("button", { name: "Więcej opcji utworu" }).click();
  await page.getByRole("menuitem", { name: "Odtwórz jako następny" }).click();
  await expect(page.getByRole("status")).toContainText("Ustawiono jako następny");

  await firstTrack.getByRole("button", { name: "Więcej opcji utworu" }).click();
  await page.getByRole("menuitem", { name: "Dodaj do playlisty" }).click();
  await page.getByRole("button", { name: "Menu test", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Dodano");

  await firstTrack.getByRole("button", { name: "Więcej opcji utworu" }).click();
  await page.getByRole("menuitem", { name: "Dodaj do kolejki" }).click();
  await page.locator(".player-track .art-button").click();
  const queueView = page.getByRole("dialog", { name: "TERAZ ODTWARZANE" });
  await queueView.getByRole("button", { name: "Następne w kolejce" }).click();
  await expect(page.locator(".queue-track")).toHaveCount(2);
  await page.locator(".queue-panel").getByRole("button", { name: "Zamknij" }).click();
  await page.getByRole("dialog", { name: "TERAZ ODTWARZANE" }).getByRole("button", { name: "Zamknij" }).click();

  await firstTrack.locator(".track-main").click();
  await page.locator(".player-track .track-action-trigger").click();
  await expect(page.getByRole("menuitem", { name: "Przejdź do artysty" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".player-track .art-button").click();
  const expanded = page.getByRole("dialog", { name: "TERAZ ODTWARZANE" });
  await expect(expanded).toBeVisible();
  await expect(expanded.locator(".fullscreen-main>.artwork")).toBeVisible();
  await expect(expanded.locator(".lyrics-panel")).toHaveCount(0);
  await expanded.getByRole("link", { name: "Kevin MacLeod" }).click();
  await expect(page).toHaveURL(/\/artist\//);
  await expanded.getByRole("button", { name: "Zamknij" }).click();
  await expect(page.locator("main").getByRole("heading", { name: "Kevin MacLeod" })).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Język").selectOption("en");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "EN", exact: true })).toHaveCount(0);
  await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1);
});

test("mobile navigation and player have separate safe-area space without horizontal overflow", async ({ page }) => {
  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/search?q=Kevin");
    await expect(page.locator(".track-row").first()).toContainText("Carefree");
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noOverflow, `horizontal overflow at ${width}px`).toBeTruthy();
    if (width <= 600) {
      const nav = await page.locator(".mobile-bottom-nav").boundingBox();
      const player = await page.locator(".player-bar").boundingBox();
      expect(nav).not.toBeNull();
      expect(player).not.toBeNull();
      expect(nav!.y + nav!.height).toBeLessThanOrEqual(player!.y);
      await expect(page.locator(".mobile-bottom-nav a").first()).toBeVisible();
    }
  }
});
