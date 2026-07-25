import { test, expect } from "@playwright/test";
import { freshLoad, enterSport, goTo } from "./helpers.js";

async function startBaseball(page, position) {
  await freshLoad(page);
  await enterSport(page, "Baseball");
  await goTo(page, "Track");
  await page.locator(`button.position-btn:has-text("${position}")`).click();
  await page.keyboard.press("Escape");
}

async function bump(page, label, times = 1) {
  const row = page.locator(".counter-row", { hasText: label });
  for (let i = 0; i < times; i++) await row.locator('button:has-text("+")').click();
}

test("pitcher: ERA and IP compute from earned runs and outs", async ({ page }) => {
  await startBaseball(page, "Pitcher");

  await bump(page, "Outs recorded", 9); // 3.0 IP
  await bump(page, "Earned runs", 1);

  // ERA = 9 * 1 / 3 = 3.00
  await expect(page.locator(".stat.big")).toContainText("3.00");
  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("3.0"); // IP
});

test("pitcher: WHIP computes from walks + hits over innings", async ({ page }) => {
  await startBaseball(page, "Pitcher");

  await bump(page, "Outs recorded", 9); // 3.0 IP
  await bump(page, "Walks", 1);
  await bump(page, "Hits given up", 2);

  // WHIP = (1 + 2) / 3 = 1.00
  await expect(page.locator(".scoreboard").first()).toContainText("1.00");
});

test("hitter: batting average computes from hits over at-bats", async ({ page }) => {
  await startBaseball(page, "Hitter");

  await bump(page, "At-bats", 4);
  await bump(page, "Singles", 1);
  await bump(page, "Home runs", 1);

  // 2 hits / 4 AB = .500
  await expect(page.locator(".stat.big")).toContainText(".500");
  await expect(page.locator(".tracker-meta")).toContainText("2 H / 4 AB");
});

test("hitter: OPS is on-base plus slugging", async ({ page }) => {
  await startBaseball(page, "Hitter");

  await bump(page, "At-bats", 2);
  await bump(page, "Home runs", 1); // 1 hit, 4 total bases in 2 AB

  // OBP = 1/2 = .500, SLG = 4/2 = 2.000, OPS = 2.500
  await expect(page.locator(".scoreboard").first()).toContainText("2.500");
});
