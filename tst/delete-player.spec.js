import { test, expect } from "@playwright/test";
import { freshLoad, freshLacrosse, switchPlayer, goTo } from "./helpers.js";

test("deleting a player requires a two-step confirm", async ({ page }) => {
  await freshLoad(page);
  await page.click('button.player-edit-btn[title="Delete player"]');
  await expect(page.locator(".confirm-q")).toContainText("Delete Vincent and 4 games?");

  await page.click('button:has-text("Cancel")');
  await expect(page.locator("select.player-select")).toBeVisible();
  await expect(page.locator("select.player-select")).toHaveValue("p_vincent");
});

test("confirming delete removes the player and their games, switching to another player", async ({ page }) => {
  await freshLacrosse(page);
  await page.click('button.player-edit-btn[title="Delete player"]');
  await page.click('button:has-text("Yes, delete")');

  const select = page.locator("select.player-select");
  await expect(select).toHaveValue("p_tony");
  const options = await select.locator("option").allTextContents();
  expect(options).not.toContain("Vincent");

  await goTo(page, "History");
  await expect(page.locator("body")).toContainText("No games yet for this player");
});

test("the only remaining player cannot be deleted", async ({ page }) => {
  await freshLoad(page);
  await switchPlayer(page, "Tony");
  await page.click('button.player-edit-btn[title="Delete player"]');
  await page.click('button:has-text("Yes, delete")');

  const deleteBtn = page.locator('button.player-edit-btn[title="Can\'t delete the only player"]');
  await expect(deleteBtn).toBeVisible();
  await expect(deleteBtn).toBeDisabled();
});
