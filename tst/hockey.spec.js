import { test, expect } from "@playwright/test";
import { freshLoad, enterSport, goTo } from "./helpers.js";

async function startHockey(page, position) {
  await freshLoad(page);
  await enterSport(page, "Hockey");
  await goTo(page, "Track");
  await page.locator(`button.position-btn:has-text("${position}")`).click();
  await page.keyboard.press("Escape");
}

test("goalie: save % and rebound % compute from the net grid", async ({ page }) => {
  await startHockey(page, "Goalie");

  // save with no rebound
  await page.locator(".net .cell", { hasText: "Glove hi" }).click();
  await page.click('button.save:has-text("Save")');
  // save that allowed a rebound
  await page.locator(".net .cell", { hasText: "5-hole" }).click();
  await page.click('button.shot-save:has-text("Save + Reb")');
  // a goal
  await page.locator(".net .cell", { hasText: "Block lo" }).click();
  await page.click('button.goal:has-text("Goal")');

  // 2 saves of 3 shots → 67%; rebound % = 1/2 = 50%
  await expect(page.locator(".stat.big")).toContainText("67%");
  const board = page.locator(".scoreboard").first();
  await expect(board).toContainText("50%"); // rebound %
  await expect(page.locator(".count")).toContainText("1 rebounds");
});

test("skater: logging a goal auto-raises shots on goal and total shots", async ({ page }) => {
  await startHockey(page, "Skater");
  const bump = async (label, n) => {
    const row = page.locator(".counter-row", { hasText: label });
    for (let i = 0; i < n; i++) await row.locator('button:has-text("+")').click();
  };

  await bump("Goals", 2); // auto: sog=2, shots=2
  await expect(page.locator(".counter-row", { hasText: "Shots on goal" }).locator(".counter-val")).toHaveText("2");
  await expect(page.locator(".counter-row", { hasText: "Total shots" }).locator(".counter-val")).toHaveText("2");

  await bump("Total shots", 2); // 2 more non-goal shots → 4 total
  await bump("Assists", 1);

  // points = 3; shooting % = 2 goals / 4 shots = 50%
  await expect(page.locator(".stat.big")).toContainText("3");
  await expect(page.locator(".scoreboard").first()).toContainText("50%");
});

test("skater: a parent can't be dropped below its child", async ({ page }) => {
  await startHockey(page, "Skater");
  const bump = async (label, n) => {
    const row = page.locator(".counter-row", { hasText: label });
    for (let i = 0; i < n; i++) await row.locator('button:has-text("+")').click();
  };
  await bump("Goals", 2); // sog=2, shots=2

  // shots-on-goal − is disabled because it equals goals (2)
  const sog = page.locator(".counter-row", { hasText: "Shots on goal" });
  await expect(sog.locator('button:has-text("−")')).toBeDisabled();
});

test("skater: penalties log minutes into PIM", async ({ page }) => {
  await startHockey(page, "Skater");

  const row = page.locator(".counter-row", { hasText: "Penalties" });
  await row.locator('button:has-text("+")').click();
  await page.click('button.pen-opt:has-text("2 min")');
  await row.locator('button:has-text("+")').click();
  await page.click('button.pen-opt:has-text("5 min")');

  // 2 + 5 = 7 PIM
  await expect(page.locator(".panel-title", { hasText: "Penalties" })).toContainText("7 PIM");
});
