import { test, expect } from "@playwright/test";
import { freshLoad, enterSport, goTo } from "./helpers.js";

async function startFootball(page, position) {
  await freshLoad(page);
  await enterSport(page, "Football");
  await goTo(page, "Track");
  await page.locator(`button.position-btn:has-text("${position}")`).click();
  await page.keyboard.press("Escape");
}

async function bump(page, label, times = 1) {
  const row = page.locator(".counter-row", { hasText: label });
  for (let i = 0; i < times; i++) await row.locator('button:has-text("+")').click();
}

// Tap the number in a field row and type a value directly.
async function typeField(page, label, value) {
  const row = page.locator(".counter-row", { hasText: label });
  await row.locator(".field-num").click();
  await row.locator(".field-input").fill(String(value));
  await row.locator(".field-input").press("Enter");
}

test("QB completion % and Y/A compute from attempts, completions, yards", async ({ page }) => {
  await startFootball(page, "Quarterback");

  await bump(page, "Pass attempts", 10);
  await bump(page, "Completions", 6);
  await typeField(page, "Passing yards", 90);

  // completion % = 6/10 = 60%; Y/A = 90/10 = 9.0
  await expect(page.locator(".stat.big")).toContainText("60%");
  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("90");  // pass yards tile
  await expect(board).toContainText("9.0"); // Y/A tile
});

test("QB typed yardage persists and can be edited", async ({ page }) => {
  await startFootball(page, "Quarterback");
  await typeField(page, "Rushing yards", 42);
  const row = page.locator(".counter-row", { hasText: "Rushing yards" });
  await expect(row.locator(".field-num")).toHaveText("42");
  // +/- still nudges by one
  await row.locator('button:has-text("+")').click();
  await expect(row.locator(".field-num")).toHaveText("43");
});

test("QB third-down and red-zone efficiency show in the meta line", async ({ page }) => {
  await startFootball(page, "Quarterback");
  await bump(page, "3rd down attempts", 4);
  await bump(page, "3rd downs converted", 3);
  await bump(page, "Red zone attempts", 2);
  await bump(page, "Red zone TDs", 1);

  await expect(page.locator(".tracker-meta")).toContainText("3rd down 3/4 (75%)");
  await expect(page.locator(".tracker-meta")).toContainText("red zone 1/2 (50%)");
});

test("defensive player tallies straight counters", async ({ page }) => {
  await startFootball(page, "Defensive Player");
  await bump(page, "Tackles", 7);
  await bump(page, "Sacks", 2);
  await bump(page, "Interceptions", 1);

  const board = page.locator(".scoreboard").first();
  await expect(page.locator(".stat.big")).toContainText("7"); // tackles
  await expect(board).toContainText("2"); // sacks
});

test("offensive player catch % computes from receptions over targets", async ({ page }) => {
  await startFootball(page, "Offensive Player");
  await bump(page, "Targets", 8);
  await bump(page, "Receptions", 6);
  await typeField(page, "Receiving yards", 84);

  // catch % = 6/8 = 75%
  await expect(page.locator(".scoreboard").first()).toContainText("75%");
  await expect(page.locator(".stat.big")).toContainText("84"); // rec yds marquee
});

test("football games get their own Stats section per position", async ({ page }) => {
  await startFootball(page, "Quarterback");
  await bump(page, "Pass attempts", 3);
  await bump(page, "Completions", 2);

  await goTo(page, "History");
  await expect(page.locator(".hcard .hpos").first()).toHaveText("Quarterback");

  await goTo(page, "Stats");
  await expect(page.locator(".stat.big")).toContainText("67%"); // 2/3 completion
});
