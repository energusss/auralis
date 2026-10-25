import { expect, test } from "@playwright/test";

test("the requested YouTube player host presentation is defined in the application stylesheet", async ({ page }) => {
  await page.goto("/");
  const hiddenPlayerRule = await page.evaluate(() =>
    Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules).some((rule) =>
          rule instanceof CSSStyleRule && rule.selectorText === ".youtube-player" && rule.style.display === "none",
        );
      } catch {
        return false;
      }
    }),
  );
  expect(hiddenPlayerRule).toBe(true);
});
