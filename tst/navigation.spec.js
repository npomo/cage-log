import { test, expect } from "@playwright/test";
import { freshLoad, freshLacrosse, goTo } from "./helpers.js";

test("sport grid shows all five sports, all now playable", async ({ page }) => {
  await freshLoad(page);
  await expect(page.locator(".sport-btn")).toHaveCount(5);
  for (const s of ["Lacrosse", "Basketball", "Baseball", "Hockey", "Football"]) {
    await expect(page.locator(`.sport-btn:has-text("${s}")`)).toBeEnabled();
  }
  await expect(page.locator(".soon-tag")).toHaveCount(0);
});

test("football offers all three positions", async ({ page }) => {
  await freshLoad(page);
  await page.click('.sport-btn:has-text("Football")');
  await goTo(page, "Track");
  for (const p of ["Quarterback", "Offensive Player", "Defensive Player"]) {
    await expect(page.locator(`.position-btn:has-text("${p}")`)).toBeEnabled();
  }
});

test("entering a sport shows its tabs; back returns to the grid", async ({ page }) => {
  await freshLoad(page);
  await page.click('.sport-btn:has-text("Lacrosse")');
  await expect(page.locator("nav.tabs")).toBeVisible();
  await expect(page.locator(".sport-heading h1")).toHaveText("Lacrosse");

  await page.click(".back-btn");
  await expect(page.locator(".sport-grid")).toBeVisible();
});

test("all four lacrosse positions are now playable", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "Track");
  for (const p of ["Goalie", "Attack", "Defender / LSM", "FOGO"]) {
    await expect(page.locator(`.position-btn:has-text("${p}")`)).toBeEnabled();
  }
});

test("legacy seeded games are migrated and shown as goalie games", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  await expect(page.locator(".hcard .hpos").first()).toHaveText("Goalie");
});
