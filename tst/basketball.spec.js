import { test, expect } from "@playwright/test";
import { freshLoad, enterSport, goTo } from "./helpers.js";

async function startBasketball(page) {
  await freshLoad(page);
  await enterSport(page, "Basketball");
  await goTo(page, "Track");
  // single position → simple "Start a game" button
  await page.click('button:has-text("Start a game")');
  await page.keyboard.press("Escape");
}

async function shoot(page, label, made) {
  await page.locator(`.zspot:has-text("${label}")`).first().click();
  await page.click(`button.${made ? "made" : "missed"}`);
}

test("a made three adds 3 points and 100% from three", async ({ page }) => {
  await startBasketball(page);
  await shoot(page, "Top", true);

  await expect(page.locator(".stat.big")).toContainText("3");
  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("100%"); // FG% and 3P% both 100
});

test("FG% reflects makes over attempts across 2s and 3s", async ({ page }) => {
  await startBasketball(page);
  await shoot(page, "Rim", true);   // 2pt make
  await shoot(page, "Top", false);  // 3pt miss

  // 1 of 2 FG → 50%; points = 2
  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("50%");
  await expect(page.locator(".stat.big")).toContainText("2");
  await expect(page.locator(".count")).toContainText("2 shots");
});

test("free throws add a point each and compute FT%", async ({ page }) => {
  await startBasketball(page);

  const made = page.locator(".counter-row", { hasText: "Free throws made" });
  const att = page.locator(".counter-row", { hasText: "Free throws attempted" });
  await made.locator('button:has-text("+")').click();
  await att.locator('button:has-text("+")').click();
  await att.locator('button:has-text("+")').click();

  // 1 point from FT; FT% = 1/2 = 50%
  await expect(page.locator(".stat.big")).toContainText("1");
  await expect(page.locator(".panel-title", { hasText: "Free throws" })).toContainText("1/2");
});

test("playmaking counters tally", async ({ page }) => {
  await startBasketball(page);
  const reb = page.locator(".counter-row", { hasText: "Rebounds" });
  await reb.locator('button:has-text("+")').click();
  await reb.locator('button:has-text("+")').click();
  await expect(reb.locator(".counter-val")).toHaveText("2");
});
