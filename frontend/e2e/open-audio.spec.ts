import { test, expect } from "@playwright/test";

test.skip(
  process.env.AURALIS_LIVE_PROVIDER_E2E !== "true",
  "requires the live AURALIS API and Internet Archive",
);

test("@live resolves and plays the catalog's real CC-licensed MP3 across navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    window.Audio = new Proxy(OriginalAudio, {
      construct(target, args) {
        const audio = Reflect.construct(target, args) as HTMLAudioElement;
        (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio = audio;
        return audio;
      },
    });
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/search");
  await page.getByRole("button", { name: "Muzyka na otwartych licencjach" }).click();
  await page.getByRole("textbox", { name: "Szukaj" }).fill("Directionless EP");
  const row = page.locator(".track-row").filter({ hasText: "Night Owl" }).first();
  await expect(row).toBeVisible({ timeout: 90000 });
  await row.locator(".track-main").click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const audio = (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio;
          const source = decodeURIComponent(audio?.currentSrc || audio?.src || "")
            .replace(/[_-]+/g, " ")
            .toLowerCase();
          return Boolean(
            audio &&
              source.includes("archive.org/download/") &&
              source.includes("night owl") &&
              !audio.paused &&
              audio.currentTime > 0.5,
          );
        }),
      { timeout: 60000 },
    )
    .toBe(true);

  await page.locator(".player-bar").getByRole("button", { name: "Następny" }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const audio = (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio;
          const source = decodeURIComponent(audio?.currentSrc || audio?.src || "")
            .replace(/[_-]+/g, " ")
            .toLowerCase();
          return Boolean(source.includes("my always mood") && !audio?.paused && (audio?.currentTime ?? 0) > 0.5);
        }),
      { timeout: 30000 },
    )
    .toBe(true);
  await page.locator(".player-bar").getByRole("button", { name: "Poprzedni" }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const audio = (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio;
          const source = decodeURIComponent(audio?.currentSrc || audio?.src || "")
            .replace(/[_-]+/g, " ")
            .toLowerCase();
          return Boolean(source.includes("night owl") && !audio?.paused && (audio?.currentTime ?? 0) > 0.5);
        }),
      { timeout: 30000 },
    )
    .toBe(true);

  const before = await page.evaluate(
    () => (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio?.currentTime ?? 0,
  );
  await row.locator(".track-artist").click();
  await expect(page).toHaveURL(/\/artist\//);
  await expect
    .poll(
      () => page.evaluate(() => (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio?.currentTime ?? 0),
      { timeout: 15000 },
    )
    .toBeGreaterThan(before + 1);
  expect(pageErrors).toEqual([]);
});
