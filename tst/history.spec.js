import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo, startBlankGame, SEEDED_GAME_NAMES } from "./helpers.js";

test("starting a new game adds it to History", async ({ page }) => {
  await freshLacrosse(page);
  await startBlankGame(page);
  await goTo(page, "History");
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length + 1);
});

test("renaming a game updates its History card", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  const firstCard = page.locator(".hcard").first();
  await expect(firstCard.locator(".gname")).toHaveText(SEEDED_GAME_NAMES[0]);

  // Open the game → Track tab, then rename via the game-name editor.
  await firstCard.locator('button:has-text("Open")').click();
  await page.click(".gname-edit");
  await page.locator(".name-input").fill("Renamed Game");
  await page.locator(".name-input").press("Enter");

  await goTo(page, "History");
  await expect(page.locator(".hcard").first().locator(".gname")).toHaveText("Renamed Game");
});

test("deleting a game requires a two-step confirm", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  const firstCard = page.locator(".hcard").first();

  await firstCard.locator('button:has-text("Delete")').click();
  await expect(firstCard.locator("text=Delete?")).toBeVisible();
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length);

  await firstCard.locator('button:has-text("Cancel")').click();
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length);

  await firstCard.locator('button:has-text("Delete")').click();
  await firstCard.locator('button:has-text("Yes, delete")').click();
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length - 1);
});
