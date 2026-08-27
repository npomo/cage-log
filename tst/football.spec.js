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

// Click + up to `times`, stopping early if the button locks at its cap.
async function bumpMax(page, label, times) {
  const btn = page.locator(".counter-row", { hasText: label }).locator('button:has-text("+")');
  for (let i = 0; i < times; i++) {
    if (await btn.isDisabled()) break;
    await btn.click();
  }
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
  await bump(page, "Rush attempts", 1); // unlock rushing yards
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

test("QB: completion/yards/TD rows are locked until there are pass attempts", async ({ page }) => {
  await startFootball(page, "Quarterback");

  const comp = page.locator(".counter-row", { hasText: "Completions" });
  const yds = page.locator(".counter-row", { hasText: "Passing yards" });
  await expect(comp).toHaveClass(/locked/);
  await expect(comp.locator('button:has-text("+")')).toBeDisabled();
  await expect(yds.locator(".field-num")).toBeDisabled();

  // one attempt unlocks them
  await bump(page, "Pass attempts", 1);
  await expect(comp).not.toHaveClass(/locked/);
  await expect(comp.locator('button:has-text("+")')).toBeEnabled();
});

test("QB: completions can't exceed attempts", async ({ page }) => {
  await startFootball(page, "Quarterback");
  await bump(page, "Pass attempts", 2);
  await bumpMax(page, "Completions", 5); // only 2 allowed → locks at 2

  const comp = page.locator(".counter-row", { hasText: "Completions" });
  await expect(comp.locator(".field-num")).toHaveText("2");
  await expect(comp.locator('button:has-text("+")')).toBeDisabled();
});

test("QB: passing TDs are capped at completions", async ({ page }) => {
  await startFootball(page, "Quarterback");
  await bump(page, "Pass attempts", 6);
  await bump(page, "Completions", 3);
  await bumpMax(page, "Passing TDs", 5); // only 3 completions

  await expect(page.locator(".counter-row", { hasText: "Passing TDs" }).locator(".field-num")).toHaveText("3");
});

test("QB: lowering attempts clamps the children", async ({ page }) => {
  await startFootball(page, "Quarterback");
  await bump(page, "Pass attempts", 5);
  await bump(page, "Completions", 4);
  await bump(page, "Passing TDs", 3);

  // drop attempts to 2 → completions clamp to 2, TDs clamp to 2
  const att = page.locator(".counter-row", { hasText: "Pass attempts" });
  await att.locator('button:has-text("−")').click();
  await att.locator('button:has-text("−")').click();
  await att.locator('button:has-text("−")').click();

  await expect(page.locator(".counter-row", { hasText: "Completions" }).locator(".field-num")).toHaveText("2");
  await expect(page.locator(".counter-row", { hasText: "Passing TDs" }).locator(".field-num")).toHaveText("2");
});

test("offense: receptions can't exceed targets, YAC can't exceed receiving yards", async ({ page }) => {
  await startFootball(page, "Offensive Player");
  await bump(page, "Targets", 3);
  await bumpMax(page, "Receptions", 9); // capped at 3
  await expect(page.locator(".counter-row", { hasText: "Receptions" }).locator(".field-num")).toHaveText("3");

  await typeField(page, "Receiving yards", 40);
  await typeField(page, "Yards after catch", 99); // capped at 40
  await expect(page.locator(".counter-row", { hasText: "Yards after catch" }).locator(".field-num")).toHaveText("40");
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
