import { test, expect } from "@playwright/test";
import { freshLoad, goTo, SEEDED_GAME_NAMES } from "./helpers.js";

test("export shows the current games as JSON", async ({ page }) => {
  await freshLoad(page);
  await goTo(page, "History");
  await page.click('button:has-text("Export")');

  const exportArea = page.locator("textarea.export-area");
  await expect(exportArea).toBeVisible();
  const value = await exportArea.inputValue();
  const parsed = JSON.parse(value);
  expect(parsed.length).toBe(SEEDED_GAME_NAMES.length);
  await expect(page.locator(".export-count")).toContainText("4 games");

  await page.click('button:has-text("Done")');
  await expect(exportArea).not.toBeVisible();
});

test("importing a new game upserts it into History", async ({ page }) => {
  await freshLoad(page);
  await goTo(page, "History");
  await page.click('button.ghost.sm:has-text("Import")');

  const newGame = [{
    id: "g_imported_test",
    name: "Imported Test Game",
    playerId: "p_vincent",
    date: new Date().toISOString(),
    shots: [],
    clears: [],
  }];
  await page.locator("textarea.paste-area").fill(JSON.stringify(newGame));
  await page.click('button.primary.sm:has-text("Import")');

  await expect(page.locator("text=Imported 1 game")).toBeVisible();
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length + 1);
  await expect(page.locator("body")).toContainText("Imported Test Game");
});

test("importing malformed JSON shows an error", async ({ page }) => {
  await freshLoad(page);
  await goTo(page, "History");
  await page.click('button.ghost.sm:has-text("Import")');
  await page.locator("textarea.paste-area").fill("{ not valid json");
  await page.click('button.primary.sm:has-text("Import")');
  await expect(page.locator(".import-err")).toBeVisible();
});
