import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo } from "./helpers.js";

async function startDefender(page) {
  await goTo(page, "Track");
  await page.locator('button.position-btn:has-text("Defender / LSM")').click();
  await page.keyboard.press("Escape"); // dismiss the auto name-edit
}

// bump a named counter row n times
async function bump(page, label, times = 1) {
  const row = page.locator(".counter-row", { hasText: label });
  for (let i = 0; i < times; i++) await row.locator('button:has-text("+")').click();
}

test("goals allowed are locked until a shot is allowed, then capped by it", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  const goals = page.locator(".counter-row", { hasText: "Goals allowed" });
  await expect(goals).toHaveClass(/locked/);

  await bump(page, "Shots allowed", 1);
  await expect(goals).not.toHaveClass(/locked/);
  await goals.locator('button:has-text("+")').click(); // 1 goal = 1 shot → at cap
  await expect(goals.locator('button:has-text("+")')).toBeDisabled();
});

test("caused turnovers and ground balls tally on the scoreboard", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  await bump(page, "Caused turnovers", 3);
  await bump(page, "Ground balls", 2);

  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("3");
  await expect(board).toContainText("2");
  await expect(page.locator(".count")).toContainText("5 plays logged");
});

test("dodge win % computes from stopped vs beaten", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  await bump(page, "Dodges stopped", 3);
  await bump(page, "Beaten on dodge", 1);

  // 3 of 4 matchups won → 75%
  await expect(page.locator(".scoreboard").first()).toContainText("75%");
});

test("clear % computes from won vs failed", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  await bump(page, "Clears won", 1);
  await bump(page, "Clears failed", 1);

  await expect(page.locator(".scoreboard").first()).toContainText("50%");
});

test("a counter can be decremented back down", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  await bump(page, "Ground balls", 2);
  const row = page.locator(".counter-row", { hasText: "Ground balls" });
  await expect(row.locator(".counter-val")).toHaveText("2");

  await row.locator('button:has-text("−")').click();
  await expect(row.locator(".counter-val")).toHaveText("1");
});

test("penalties record both a count and time served", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  const row = page.locator(".counter-row", { hasText: "Penalties" });
  await row.locator('button:has-text("+")').click();
  await page.click('button.pen-opt:has-text("1:00")');
  await row.locator('button:has-text("+")').click();
  await page.click('button.pen-opt:has-text("0:30")');

  await expect(row.locator(".counter-val")).toHaveText("2");
  // 1:00 + 0:30 = 1:30 served
  await expect(page.locator(".panel-title", { hasText: "Penalties" })).toContainText("1:30 served");
});

test("undo last removes the most recent play", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);

  await bump(page, "Caused turnovers", 1);
  await expect(page.locator(".count")).toContainText("1 plays logged");

  await page.click('button:has-text("Undo last")');
  await expect(page.locator(".count")).toContainText("0 plays logged");
});

test("defender games appear in History and get their own Stats section", async ({ page }) => {
  await freshLacrosse(page);
  await startDefender(page);
  await bump(page, "Caused turnovers", 2);

  await goTo(page, "History");
  await expect(page.locator(".hcard .hpos").first()).toHaveText("Defender / LSM");

  await goTo(page, "Stats");
  await expect(page.locator(".pos-section-label", { hasText: "Defender / LSM" })).toBeVisible();
  await expect(page.locator(".pos-section-label", { hasText: "Goalie" })).toBeVisible();
});
