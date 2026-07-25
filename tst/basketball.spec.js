import { test, expect } from "@playwright/test";
import { freshLoad, enterSport, goTo } from "./helpers.js";

async function startBasketball(page) {
  await freshLoad(page);
  await enterSport(page, "Basketball");
  await goTo(page, "Track");
  await page.click('button:has-text("Start a game")'); // single position
  await page.keyboard.press("Escape");
}

// Tap the court at a %-position, then Made/Missed.
async function shootAt(page, xPct, yPct, made) {
  const box = await page.locator(".court").boundingBox();
  await page.locator(".court").click({ position: { x: (box.width * xPct) / 100, y: (box.height * yPct) / 100 } });
  await page.click(`button.${made ? "made" : "missed"}`);
}

test("a made shot from deep drops a green dot worth 3", async ({ page }) => {
  await startBasketball(page);
  await shootAt(page, 50, 16, true); // top, well beyond the arc → 3

  await expect(page.locator(".court-svg .dot-made")).toHaveCount(1);
  await expect(page.locator(".stat.big")).toContainText("3"); // points
  await expect(page.locator(".scoreboard").first()).toContainText("100%");
});

test("the pending shot shows 2 vs 3 from where you tapped", async ({ page }) => {
  await startBasketball(page);
  const box = await page.locator(".court").boundingBox();
  await page.locator(".court").click({ position: { x: box.width * 0.5, y: box.height * 0.83 } }); // near rim
  await expect(page.locator(".choice-q")).toContainText("2-pointer");

  await page.click("button.missed");
  await expect(page.locator(".court-svg .dot-miss")).toHaveCount(1);
});

test("FG% blends 2s and 3s; a miss still counts as an attempt", async ({ page }) => {
  await startBasketball(page);
  await shootAt(page, 50, 83, true);  // rim make (2)
  await shootAt(page, 50, 16, false); // deep miss (3)

  await expect(page.locator(".stat.big")).toContainText("2"); // points from the make
  await expect(page.locator(".scoreboard").first()).toContainText("50%"); // 1 of 2 FG
  await expect(page.locator(".count")).toContainText("2 shots");
});

test("free throws add a point and compute FT%", async ({ page }) => {
  await startBasketball(page);
  const made = page.locator(".counter-row", { hasText: "Free throws made" });
  const att = page.locator(".counter-row", { hasText: "Free throws attempted" });
  await made.locator('button:has-text("+")').click();
  await att.locator('button:has-text("+")').click();
  await att.locator('button:has-text("+")').click();

  await expect(page.locator(".stat.big")).toContainText("1"); // 1 point from FT
  await expect(page.locator(".panel-title", { hasText: "Free throws" })).toContainText("1/2");
});

test("career Stats view keeps the stats but drops the court chart", async ({ page }) => {
  await startBasketball(page);
  await shootAt(page, 50, 16, true);

  await goTo(page, "Stats");
  await expect(page.locator(".court")).toHaveCount(0);
  await expect(page.locator(".stat.big")).toContainText("3"); // points still shown
});
