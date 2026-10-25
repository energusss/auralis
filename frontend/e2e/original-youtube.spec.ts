import { expect, test } from "@playwright/test";

test("the original YouTube player host stays mounted and uses the requested hidden presentation", async ({ page }) => {
  await page.goto("/");
  const player = page.locator(".youtube-player");
  await expect(player).toBeAttached();
  await expect(player).toHaveCSS("display", "none");
  await expect(player).toBeHidden();
});
