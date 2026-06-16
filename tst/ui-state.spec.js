import { test, expect } from "@playwright/test";
import { freshLoad, goTo, switchPlayer, startBlankGame } from "./helpers.js";

test("reloading the page restores the last active tab and player", async ({ page }) => {
  await freshLoad(page);
  await switchPlayer(page, "Tony");
  await goTo(page, "Stats");

  await page.reload();
  await page.waitForSelector("text=Cage Log");

  await expect(page.locator(".tab.on")).toHaveText("Stats");
  await expect(page.locator("select.player-select")).toHaveValue("p_tony");
});

test("reloading the page restores the last active game", async ({ page }) => {
  await freshLoad(page);
  await startBlankGame(page);
  await goTo(page, "Track");
  const gameName = await page.locator(".gname").textContent();

  await page.reload();
  await page.waitForSelector("text=Cage Log");
  await goTo(page, "Track");

  await expect(page.locator(".gname")).toHaveText(gameName);
});
