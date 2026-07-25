import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo } from "./helpers.js";

async function startFogo(page) {
  await goTo(page, "Track");
  await page.locator('button.position-btn:has-text("FOGO")').click();
  await page.keyboard.press("Escape");
}

test("faceoff win % computes from wins and losses", async ({ page }) => {
  await freshLacrosse(page);
  await startFogo(page);

  await page.click('button:has-text("Win — Clamp")');
  await page.click('button:has-text("Win — Clamp")');
  await page.click('button:has-text("Win — Rake")');
  await page.click('button:has-text("Loss")');

  // 3 wins of 4 → 75%
  await expect(page.locator(".stat.big")).toContainText("75%");
  await expect(page.locator(".count")).toContainText("4 faceoffs");
});

test("clamp vs rake wins are broken out", async ({ page }) => {
  await freshLacrosse(page);
  await startFogo(page);

  await page.click('button:has-text("Win — Clamp")');
  await page.click('button:has-text("Win — Rake")');
  await page.click('button:has-text("Win — Rake")');

  await expect(page.locator(".panel-title", { hasText: "Face-off" })).toContainText("1 clamp · 2 rake");
});

test("ground balls tally and undo works", async ({ page }) => {
  await freshLacrosse(page);
  await startFogo(page);

  const gb = page.locator(".counter-row", { hasText: "Ground balls" });
  await gb.locator('button:has-text("+")').click();
  await gb.locator('button:has-text("+")').click();
  await expect(gb.locator(".counter-val")).toHaveText("2");

  await page.click('button:has-text("Undo last")');
  await expect(gb.locator(".counter-val")).toHaveText("1");
});
