// Shared helpers for the Playwright suite. Every test starts from a clean
// localStorage so seeding/persistence behavior is deterministic.

export async function freshLoad(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=Cage Log");
}

export async function switchPlayer(page, name) {
  await page.locator("select.player-select").selectOption({ label: name });
}

export async function goTo(page, tabName) {
  await page.click(`button:has-text("${tabName}")`);
}

// The seeded games already have shots/clears logged. Tests that assert on
// exact tallies start a blank game first so counts begin at zero.
export async function startBlankGame(page) {
  await page.click('button:has-text("New game")');
  await page.keyboard.press("Escape");
}

export const SEEDED_GAME_NAMES = [
  "Grizzly upstate",
  "True Westchester",
  "Brotherly Love Titan",
  "Team Maryland",
];
