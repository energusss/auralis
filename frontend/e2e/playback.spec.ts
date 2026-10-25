import { test, expect } from "@playwright/test";

test("real audio continues through route and Now Playing transitions", async ({
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
  await page.route("**/api/**", (route) => route.abort());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search?q=Carefree");
  await expect(page.locator(".track-main").first()).toContainText("Carefree");
  await page.locator(".track-main").first().click();

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const audio = (
            window as Window & { __auralisAudio?: HTMLAudioElement }
          ).__auralisAudio;
          return Boolean(
            audio?.src.includes("Carefree.mp3") &&
            !audio.paused &&
            audio.currentTime > 0.25,
          );
        }),
      { timeout: 30000 },
    )
    .toBe(true);
  const before = await page.evaluate(
    () =>
      (window as Window & { __auralisAudio?: HTMLAudioElement }).__auralisAudio
        ?.currentTime ?? 0,
  );

  await page.locator(".track-artist").first().click();
  await expect(page).toHaveURL(/\/artist\//);
  await page
    .locator(".player-options")
    .getByRole("button", { name: "Pełny ekran", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "TERAZ ODTWARZANE", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (window as Window & { __auralisAudio?: HTMLAudioElement })
            .__auralisAudio?.currentTime ?? 0,
      ),
    )
    .toBeGreaterThan(before + 1);
  expect(errors).toEqual([]);
  expect(await page.locator("iframe").count()).toBe(0);
});
