import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo, SEEDED_GAME_NAMES } from "./helpers.js";

test("export downloads the current games as a JSON file", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click('button:has-text("Export")'),
  ]);

  expect(download.suggestedFilename()).toMatch(/^cage-log-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  expect(parsed.length).toBe(SEEDED_GAME_NAMES.length);
});

test("importing a legacy game migrates and upserts it into History", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");

  // legacy (v1) shape — no sport/position; migration should wrap it as lacrosse/goalie
  const newGame = [{
    id: "g_imported_test",
    name: "Imported Test Game",
    playerId: "p_vincent",
    date: new Date().toISOString(),
    shots: [],
    clears: [],
  }];
  await page.setInputFiles('input[type="file"]', {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(newGame)),
  });

  await expect(page.locator("text=Imported 1 game")).toBeVisible();
  await expect(page.locator(".hcard")).toHaveCount(SEEDED_GAME_NAMES.length + 1);
  await expect(page.locator("body")).toContainText("Imported Test Game");
});

test("importing a malformed file shows an error", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  await page.setInputFiles('input[type="file"]', {
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not valid json"),
  });
  await expect(page.locator(".import-err")).toBeVisible();
});
