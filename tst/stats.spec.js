import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo } from "./helpers.js";

test("Stats shows all 4 seeded games under Career", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "Stats");
  await page.click('button.chip:has-text("Career")');
  await expect(page.locator(".stats-meta")).toContainText("4 games");
});

test("filtering by team name narrows the stats to matching games", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "Stats");
  await page.getByPlaceholder("Filter by team name…").fill("Grizzly");
  await expect(page.locator(".stats-meta")).toContainText("1 game");
});

test("filtering by a name with no matches shows the empty state", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "Stats");
  await page.getByPlaceholder("Filter by team name…").fill("Nonexistent Team XYZ");
  await expect(page.locator("body")).toContainText("No games match.");
});
