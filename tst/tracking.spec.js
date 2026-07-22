import { test, expect } from "@playwright/test";
import { freshLacrosse, startBlankGame } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await freshLacrosse(page);
  await startBlankGame(page);
});

test("logging a save updates the net tally and scoreboard", async ({ page }) => {
  await page.locator(".net .cell", { hasText: "Top L" }).click();
  await page.click('button.save:has-text("Save")');

  await expect(page.locator(".net .cell", { hasText: "Top L" })).toContainText("1/0");
  await expect(page.locator(".count")).toContainText("1 shots");
});

test("logging a goal marks the zone hot", async ({ page }) => {
  const cell = page.locator(".net .cell", { hasText: "Center" });
  await cell.click();
  await page.click('button.goal:has-text("Goal")');
  await expect(cell).toHaveClass(/hot/);
  await expect(cell).toContainText("0/1");
});

test("logging a clear updates the field tally", async ({ page }) => {
  await page.locator(".field .fcell", { hasText: "Left wing" }).click();
  await page.click('button.save:has-text("Success")');
  await expect(page.locator(".count")).toContainText("1 clears");
});

test("undo last removes the most recent entry", async ({ page }) => {
  await page.locator(".net .cell", { hasText: "Top L" }).click();
  await page.click('button.save:has-text("Save")');
  await expect(page.locator(".count")).toContainText("1 shots");

  await page.click('button:has-text("Undo last")');
  await expect(page.locator(".count")).toContainText("0 shots");
});

test("context menu (long-press equivalent) opens the edit modal for a zone", async ({ page }) => {
  await page.locator(".net .cell", { hasText: "Top L" }).click();
  await page.click('button.save:has-text("Save")');

  await page.locator(".net .cell", { hasText: "Top L" }).dispatchEvent("contextmenu");
  await expect(page.locator(".modal-title")).toHaveText("Top L");

  await page.click(".modal-row .modal-badge");
  await expect(page.locator(".modal-row .modal-badge")).toHaveText("Goal");

  await page.click(".modal-del");
  await expect(page.locator(".modal-empty")).toBeVisible();
  await page.click(".modal-close");
});
