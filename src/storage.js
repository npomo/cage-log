import { Preferences } from "@capacitor/preferences";
import { SEED_GAMES } from "./seedGames";

// ---- Persistence ------------------------------------------------------------
// Games use two keys: primary + rolling backup. A save writes the backup first,
// then the primary, so a corrupt/empty primary can recover from the last copy.
const STORAGE_KEY = "goalie:games:v1";
const BACKUP_KEY = "goalie:games:v1:bak";
const PLAYERS_KEY = "goalie:players:v1";
const UI_STATE_KEY = "goalie:ui:v1";

export const DEFAULT_PLAYERS = [
  { id: "p_vincent", name: "Vincent" },
  { id: "p_tony",    name: "Tony" },
];

// ---- Migration --------------------------------------------------------------
// schemaVersion 2 introduced multi-sport games: every game carries sport +
// position + a per-tracker `data` blob. Legacy (v1) games were all lacrosse
// goalies with top-level `shots`/`clears`, so wrap those into the new shape.
export const SCHEMA_VERSION = 2;

export function migrateGame(g) {
  if (!g || typeof g !== "object" || !g.id) return null;
  if (g.schemaVersion >= SCHEMA_VERSION && g.data) return g;
  // legacy v1 lacrosse goalie game
  return {
    id: g.id,
    name: g.name || "Game",
    date: g.date || new Date().toISOString(),
    playerId: g.playerId || null,
    sport: "lacrosse",
    position: "goalie",
    schemaVersion: SCHEMA_VERSION,
    data: {
      shots: Array.isArray(g.shots) ? g.shots : [],
      clears: Array.isArray(g.clears) ? g.clears : [],
    },
  };
}

export function migrateGames(list) {
  if (!Array.isArray(list)) return [];
  return list.map(migrateGame).filter(Boolean);
}

async function readRaw(key) {
  try {
    const res = await Preferences.get({ key });
    if (!res.value) return null;
    const parsed = JSON.parse(res.value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveGames(games) {
  const json = JSON.stringify(games);
  try {
    await Preferences.set({ key: BACKUP_KEY, value: json });
    await Preferences.set({ key: STORAGE_KEY, value: json });
  } catch (e) {
    console.error("save failed", e);
  }
}

export async function loadGames() {
  const primary = await readRaw(STORAGE_KEY);
  const backup = await readRaw(BACKUP_KEY);
  let source;
  let seeded = false;
  if (primary && primary.length) source = primary;
  else if (backup && backup.length) source = backup;
  else if (primary === null && backup === null) {
    // neither key has ever been written — first launch, seed with prototype games
    source = SEED_GAMES;
    seeded = true;
  } else {
    source = primary || backup || [];
  }
  const migrated = migrateGames(source);
  // persist back if we seeded or if migration changed the on-disk shape
  const changed = seeded || migrated.some((g, i) => g !== source[i]);
  if (changed) await saveGames(migrated);
  return migrated;
}

export async function loadPlayers() {
  const players = await readRaw(PLAYERS_KEY);
  return players && players.length ? players : null;
}

export async function savePlayers(players) {
  try {
    await Preferences.set({ key: PLAYERS_KEY, value: JSON.stringify(players) });
  } catch (e) {
    console.error("save players failed", e);
  }
}

export async function loadUiState() {
  try {
    const res = await Preferences.get({ key: UI_STATE_KEY });
    if (!res.value) return null;
    const parsed = JSON.parse(res.value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveUiState(state) {
  try {
    await Preferences.set({ key: UI_STATE_KEY, value: JSON.stringify(state) });
  } catch (e) {
    console.error("save ui state failed", e);
  }
}
