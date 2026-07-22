import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo, waitReady, SEEDED_GAME_NAMES } from "./helpers.js";

test("seeds the 4 prototype games on first launch", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  const body = await page.textContent("body");
  for (const name of SEEDED_GAME_NAMES) {
    expect(body).toContain(name);
  }
});

test("does not re-seed once primary storage has been written", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  const firstCard = page.locator(".hcard").first();
  await firstCard.locator('button:has-text("Delete")').click();
  await firstCard.locator('button:has-text("Yes, delete")').click();
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length - 1);

  await page.reload();
  await waitReady(page);
  await goTo(page, "History");
  const body = await page.textContent("body");
  // the deleted game should stay deleted, not reappear via re-seeding
  const remaining = SEEDED_GAME_NAMES.filter((n) => body.includes(n));
  expect(remaining.length).toBe(SEEDED_GAME_NAMES.length - 1);
});

test("persists games across reload without duplicating", async ({ page }) => {
  await freshLacrosse(page);
  await page.reload();
  await waitReady(page);
  await goTo(page, "History");
  const body = await page.textContent("body");
  for (const name of SEEDED_GAME_NAMES) {
    expect(body.split(name).length - 1).toBe(1);
  }
});
