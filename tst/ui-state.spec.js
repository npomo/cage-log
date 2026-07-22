import { test, expect } from "@playwright/test";
import { freshLacrosse, goTo, switchPlayer, startBlankGame, waitReady } from "./helpers.js";

test("reloading the page restores the last active sport, tab, and player", async ({ page }) => {
  await freshLacrosse(page);
  await switchPlayer(page, "Tony");
  await goTo(page, "Stats");

  await page.reload();
  await waitReady(page);

  await expect(page.locator(".tab.on")).toHaveText("Stats");
  await expect(page.locator("select.player-select")).toHaveValue("p_tony");
});

test("reloading the page restores the last active game", async ({ page }) => {
  await freshLacrosse(page);
  await startBlankGame(page);
  const gameName = await page.locator(".gname").textContent();

  await page.reload();
  await waitReady(page);
  await goTo(page, "Track");

  await expect(page.locator(".gname")).toHaveText(gameName);
});
