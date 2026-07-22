import { test, expect } from "@playwright/test";
import { freshLoad, freshLacrosse, goTo, switchPlayer, SEEDED_GAME_NAMES } from "./helpers.js";

test("dropdown lists Vincent and Tony, defaults to Vincent", async ({ page }) => {
  await freshLoad(page);
  const select = page.locator("select.player-select");
  await expect(select).toHaveValue("p_vincent");
  const options = await select.locator("option").allTextContents();
  expect(options).toContain("Vincent");
  expect(options).toContain("Tony");
});

test("switching players scopes History to that player's games", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "History");
  let body = await page.textContent("body");
  for (const name of SEEDED_GAME_NAMES) expect(body).toContain(name);

  await switchPlayer(page, "Tony");
  body = await page.textContent("body");
  expect(body).toContain("No games yet for this player");
  for (const name of SEEDED_GAME_NAMES) expect(body).not.toContain(name);
});

test("switching players keeps the current tab instead of jumping to Track", async ({ page }) => {
  await freshLacrosse(page);
  await goTo(page, "Stats");
  await switchPlayer(page, "Tony");
  await expect(page.locator(".tab.on")).toHaveText("Stats");
});

test("adding a player via the dropdown creates and switches to them", async ({ page }) => {
  await freshLacrosse(page);
  const select = page.locator("select.player-select");
  await select.selectOption("__add__");
  const input = page.locator(".player-bar input.name-input");
  await input.fill("Sam");
  await input.press("Enter");

  await expect(select).toBeVisible();
  const options = await select.locator("option").allTextContents();
  expect(options).toContain("Sam");

  await goTo(page, "History");
  await expect(page.locator("body")).toContainText("No games yet for this player");
});

test("renaming the active player via the pencil button updates the dropdown", async ({ page }) => {
  await freshLoad(page);
  await page.click('button.player-edit-btn[title="Rename player"]');
  const input = page.locator(".player-bar input.name-input");
  await input.fill("Vinny");
  await input.press("Enter");

  const select = page.locator("select.player-select");
  const options = await select.locator("option").allTextContents();
  expect(options).toContain("Vinny");
  expect(options).not.toContain("Vincent");
});
