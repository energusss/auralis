import { test, expect, type Page } from "@playwright/test";
async function navigation(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name, exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => route.abort());
});
test("guest can search, like, create and reorder a persistent playlist", async ({
  page,
}) => {
  await page.goto("/search");
  await page
    .getByRole("textbox", { name: "Szukaj", exact: true })
    .fill("Kevin");
  await expect(page.locator(".track-main").first()).toContainText("Carefree");
  await page
    .locator(".track-row")
    .first()
    .getByRole("button", { name: "Polubione", exact: true })
    .click();
  await navigation(page, "Biblioteka");
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Biblioteka", exact: true }),
  ).toBeVisible();
  await page
    .locator("main")
    .getByRole("button", { name: "Nowa playlista", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nazwa playlisty" })
    .fill("Browser test");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser test", exact: true }),
  ).toBeVisible();
  await navigation(page, "Szukaj");
  await page
    .getByRole("textbox", { name: "Szukaj", exact: true })
    .fill("Kevin");
  await page
    .locator(".track-row")
    .nth(0)
    .getByRole("button", { name: "Dodaj do playlisty" })
    .click();
  await page.getByRole("button", { name: "Browser test", exact: true }).click();
  await page
    .locator(".track-row")
    .nth(1)
    .getByRole("button", { name: "Dodaj do playlisty" })
    .click();
  await page.getByRole("button", { name: "Browser test", exact: true }).click();
  await navigation(page, "Browser test");
  const handle = page.getByLabel("Reorder", { exact: true }).first();
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await expect(page.locator(".track-main").first()).toContainText(
    "Monkeys Spinning Monkeys",
  );
  await page.reload();
  await expect(page.locator(".track-main").first()).toContainText(
    "Monkeys Spinning Monkeys",
  );
  await navigation(page, "Polubione");
  await expect(
    page
      .locator("main")
      .getByRole("heading", { name: "Polubione", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".track-main")).toHaveCount(1);
  await expect(page.locator(".track-main")).toContainText("Carefree");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("artist detail, collection, language and fullscreen navigation", async ({
  page,
}) => {
  await page.goto("/search?q=Kevin");
  await expect(page.locator(".track-row")).toHaveCount(6);
  await expect(page.locator(".artist-card")).toContainText("Kevin MacLeod");
  await page.locator(".track-artist").first().click();
  await expect(page).toHaveURL(/\/artist\/demo%3Akevin-macleod/);
  await expect(
    page.getByRole("heading", { name: "Kevin MacLeod", exact: true }),
  ).toBeVisible();
  await page.goto("/search?q=Kevin");
  await expect(
    page.getByRole("button", { name: "Playlisty", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "PL", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Playlists", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "PL", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Kevin MacLeod Kevin MacLeod", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kevin MacLeod", exact: true }),
  ).toBeVisible();
  await page.locator(".music-card").first().click();
  await expect(page.locator(".track-row")).toHaveCount(6);
  await page.getByRole("button", { name: "PL", exact: true }).click();
  await page
    .locator(".player-options")
    .getByRole("button", { name: "Full screen", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "NOW PLAYING", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
});
