// Shared helpers for the Playwright suite. Every test starts from a clean
// localStorage so seeding/persistence behavior is deterministic.

// Wait for the app to finish loading. The player dropdown is present in both
// the sport-grid view and inside a sport, so it's a stable "ready" signal
// (unlike the "Cage Log" title, which is hidden once you're inside a sport).
export async function waitReady(page) {
  await page.waitForSelector("select.player-select");
}

export async function freshLoad(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitReady(page);
}

// Click a sport tile on the grid to enter it.
export async function enterSport(page, label = "Lacrosse") {
  await page.click(`button.sport-btn:has-text("${label}")`);
  await page.waitForSelector("nav.tabs");
}

// Most specs want to be inside Lacrosse (the one built sport).
export async function freshLacrosse(page) {
  await freshLoad(page);
  await enterSport(page);
}

// Switch between the Track / History / Stats tabs inside a sport.
export async function goTo(page, tabName) {
  await page.click(`nav.tabs button:has-text("${tabName}")`);
}

export async function switchPlayer(page, name) {
  await page.locator("select.player-select").selectOption({ label: name });
}

// Start a fresh goalie game. Assumes we're already inside Lacrosse. The seeded
// games carry logged shots/clears, so tests asserting exact tallies start clean.
export async function startBlankGame(page) {
  await goTo(page, "Track");
  // If a game is already active, "New game" returns us to the position picker.
  if (!(await page.locator('button.position-btn:has-text("Goalie")').count())) {
    await page.click('button:has-text("New game")');
  }
  await page.locator('button.position-btn:has-text("Goalie")').click();
  await page.keyboard.press("Escape"); // dismiss the auto name-edit
}

export const SEEDED_GAME_NAMES = [
  "Grizzly upstate",
  "True Westchester",
  "Brotherly Love Titan",
  "Team Maryland",
];
