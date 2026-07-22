import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo } from "./helpers.js";

// Start a fresh attack game (inside Lacrosse).
async function startAttack(page) {
  await goTo(page, "Track");
  await page.locator('button.position-btn:has-text("Attack")').click();
  await page.keyboard.press("Escape"); // dismiss the auto name-edit
}

test("logging a goal updates goals, points and shot chart", async ({ page }) => {
  await freshLacrosse(page);
  await startAttack(page);

  await page.locator(".szone", { hasText: "Crease" }).first().click();
  await page.click('button.shot-goal:has-text("Goal")');

  // scoreboard: Goals=1, Points=1, Shot%=100%
  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("100%");
  await expect(page.locator(".szone", { hasText: "Crease" }).first()).toContainText("1/1");
});

test("a miss counts as a shot but not a goal (shot % drops)", async ({ page }) => {
  await freshLacrosse(page);
  await startAttack(page);

  await page.locator(".szone", { hasText: "Point" }).first().click();
  await page.click('button.shot-goal:has-text("Goal")');
  await page.locator(".szone", { hasText: "Slot" }).first().click();
  await page.click('button.shot-miss:has-text("Miss")');

  // 1 goal of 2 shots → 50%
  await expect(page.locator(".scoreboard").first()).toContainText("50%");
  await expect(page.locator(".count")).toContainText("2 shots");
});

test("counters increment and decrement; assists feed points", async ({ page }) => {
  await freshLacrosse(page);
  await startAttack(page);

  const assistRow = page.locator(".counter-row", { hasText: "Assists" });
  await assistRow.locator('button:has-text("+")').click();
  await assistRow.locator('button:has-text("+")').click();
  await expect(assistRow.locator(".counter-val")).toHaveText("2");

  await assistRow.locator('button:has-text("−")').click();
  await expect(assistRow.locator(".counter-val")).toHaveText("1");

  // 0 goals + 1 assist = 1 point
  await expect(page.locator(".scoreboard").first()).toContainText("1");
});

test("undo last removes the most recent event", async ({ page }) => {
  await freshLacrosse(page);
  await startAttack(page);

  await page.locator(".szone", { hasText: "Crease" }).first().click();
  await page.click('button.shot-goal:has-text("Goal")');
  await expect(page.locator(".count")).toContainText("1 shots");

  await page.click('button:has-text("Undo last")');
  await expect(page.locator(".count")).toContainText("0 shots");
});

test("attack and goalie games show as separate sections in Stats", async ({ page }) => {
  await freshLacrosse(page);
  // Vincent already has seeded goalie games. Add an attack game with a goal.
  await startAttack(page);
  await page.locator(".szone", { hasText: "Crease" }).first().click();
  await page.click('button.shot-goal:has-text("Goal")');

  await goTo(page, "Stats");
  await expect(page.locator(".pos-section-label", { hasText: "Goalie" })).toBeVisible();
  await expect(page.locator(".pos-section-label", { hasText: "Attack" })).toBeVisible();
});
