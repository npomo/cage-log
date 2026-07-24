import { test, expect } from "@playwright/test";
import { freshLoad, freshLacrosse, goTo } from "./helpers.js";

test("sport grid shows all five sports, only lacrosse playable", async ({ page }) => {
  await freshLoad(page);
  await expect(page.locator(".sport-btn")).toHaveCount(5);
  await expect(page.locator('.sport-btn:has-text("Lacrosse")')).toBeEnabled();
  await expect(page.locator('.sport-btn:has-text("Basketball")')).toBeDisabled();
  await expect(page.locator('.sport-btn:has-text("Basketball") .soon-tag')).toBeVisible();
});

test("entering a sport shows its tabs; back returns to the grid", async ({ page }) => {
  await freshLoad(page);
  await page.click('.sport-btn:has-text("Lacrosse")');
  await expect(page.locator("nav.tabs")).toBeVisible();
  await expect(page.locator(".sport-heading h1")).toHaveText("Lacrosse");

  await page.click(".back-btn");
  await expect(page.locator(".sport-grid")).toBeVisible();
});

test("track tab offers a position picker with FOGO still coming soon", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "Track");
  await expect(page.locator('.position-btn:has-text("Goalie")')).toBeEnabled();
  await expect(page.locator('.position-btn:has-text("Attack")')).toBeEnabled();
  await expect(page.locator('.position-btn:has-text("Defender / LSM")')).toBeEnabled();
  await expect(page.locator('.position-btn:has-text("FOGO")')).toBeDisabled();
});

test("legacy seeded games are migrated and shown as goalie games", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  await expect(page.locator(".hcard .hpos").first()).toHaveText("Goalie");
});
