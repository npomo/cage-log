import React, { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import goalieImg from "./assets/goalie.jpg";
import { SEED_GAMES } from "./seedGames";

// ---- Data model -------------------------------------------------------------
// A game holds shots (each tied to a net zone + result) and clears (each tied
// to a field destination + result). Keeping this shape flat and explicit so it
// ports cleanly to on-device storage later.
//
// zone index map for the 3x3 net (0..8):
//   0 1 2   top-left,    top-mid,    top-right
//   3 4 5   mid-left,    center,     mid-right
//   6 7 8   low-left,    low-mid,    low-right (five-hole = 7)

const ZONE_LABELS = [
  "Top L", "Top M", "Top R",
  "Mid L", "Center", "Mid R",
  "Low L", "Low M", "Low R",
];

const FIELD_LABELS = [
  "Left wing", "Up middle", "Right wing",
  "Left side", "Midfield", "Right side",
];

const STORAGE_KEY = "goalie:games:v1";

const emptyGame = (name, playerId) => ({
  id: `g_${Date.now()}`,
  name: name || `Game ${new Date().toLocaleDateString()}`,
  date: new Date().toISOString(),
  playerId: playerId || null,
  shots: [],   // { zone: 0-8, result: "save" | "goal", t: iso }
  clears: [],  // { dest: 0-5, result: "success" | "fail", t: iso }
});

// ---- Persistence ------------------------------------------------------------
// Two keys: primary + rolling backup. A save writes the backup first, then the
// primary, so a corrupt/empty primary can be recovered from the last good copy.
const BACKUP_KEY = "goalie:games:v1:bak";
const PLAYERS_KEY = "goalie:players:v1";
const UI_STATE_KEY = "goalie:ui:v1";
const DEFAULT_PLAYERS = [
  { id: "p_vincent", name: "Vincent" },
  { id: "p_tony",    name: "Tony" },
];

async function readKey(key) {
  try {
    const res = await Preferences.get({ key });
    if (!res.value) return null;
    const parsed = JSON.parse(res.value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function loadGames() {
  const primary = await readKey(STORAGE_KEY);
  if (primary && primary.length) return primary;
  // primary empty or missing — fall back to backup if it has more
  const backup = await readKey(BACKUP_KEY);
  if (backup && backup.length) return backup;
  if (primary === null && backup === null) {
    // neither key has ever been written — first launch, seed with prototype games
    await saveGames(SEED_GAMES);
    return SEED_GAMES;
  }
  return primary || backup || [];
}

async function loadPlayers() {
  const players = await readKey(PLAYERS_KEY);
  return players && players.length ? players : null;
}

async function savePlayers(players) {
  try {
    await Preferences.set({ key: PLAYERS_KEY, value: JSON.stringify(players) });
  } catch (e) {
    console.error("save players failed", e);
  }
}

async function loadUiState() {
  try {
    const res = await Preferences.get({ key: UI_STATE_KEY });
    if (!res.value) return null;
    const parsed = JSON.parse(res.value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

async function saveUiState(state) {
  try {
    await Preferences.set({ key: UI_STATE_KEY, value: JSON.stringify(state) });
  } catch (e) {
    console.error("save ui state failed", e);
  }
}

async function saveGames(games) {
  const json = JSON.stringify(games);
  try {
    // back up the value we're about to commit, then write primary
    await Preferences.set({ key: BACKUP_KEY, value: json });
    await Preferences.set({ key: STORAGE_KEY, value: json });
  } catch (e) {
    console.error("save failed", e);
  }
}

// ---- Small helpers ----------------------------------------------------------
const pct = (made, total) => (total === 0 ? "—" : `${Math.round((made / total) * 100)}%`);

function gameStats(g) {
  const saves = g.shots.filter((s) => s.result === "save").length;
  const goals = g.shots.filter((s) => s.result === "goal").length;
  const shots = g.shots.length;
  const clearOk = g.clears.filter((c) => c.result === "success").length;
  const clears = g.clears.length;
  return { saves, goals, shots, savePct: pct(saves, shots), clearOk, clears, clearPct: pct(clearOk, clears) };
}

export default function GoalieTracker() {
  const [games, setGames] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("track"); // "track" | "history"
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  const [pendingZone, setPendingZone] = useState(null); // zone awaiting save/goal
  const [pendingClear, setPendingClear] = useState(null); // dest awaiting ok/fail
  const [confirmId, setConfirmId] = useState(null); // game id awaiting delete confirm
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [importError, setImportError] = useState(false);
  const [importOk, setImportOk] = useState(0);
  const [editZone, setEditZone] = useState(null);
  const [editDest, setEditDest] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newPlayerDraft, setNewPlayerDraft] = useState("");

  const didLoad = React.useRef(false);
  const lpTimer = React.useRef(null);
  const lpFired = React.useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    Promise.all([loadGames(), loadPlayers(), loadUiState()]).then(([g, p, ui]) => {
      const resolvedPlayers = p || DEFAULT_PLAYERS;
      if (!p) savePlayers(resolvedPlayers);
      setPlayers(resolvedPlayers);
      setGames(g);

      const restoredPlayerId = ui && resolvedPlayers.some((pl) => pl.id === ui.activePlayerId)
        ? ui.activePlayerId
        : null;
      const playerId = restoredPlayerId || resolvedPlayers[0]?.id || null;
      setActivePlayerId(playerId);

      const restoredGame = ui && g.find((game) => game.id === ui.activeId && game.playerId === playerId);
      const firstGame = restoredGame || g.find((game) => game.playerId === playerId);
      if (firstGame) setActiveId(firstGame.id);

      if (ui && (ui.view === "track" || ui.view === "history" || ui.view === "stats")) {
        setView(ui.view);
      }
      if (ui && (ui.theme === "dark" || ui.theme === "light")) {
        setTheme(ui.theme);
      }

      setLoaded(true);
    });
  }, []);

  // Persist which tab/player/game/theme was last active so a fresh page load
  // (e.g. a mobile browser reloading a backgrounded tab) resumes where it left
  // off instead of always defaulting to Track + the first player + dark mode.
  useEffect(() => {
    if (!loaded) return;
    saveUiState({ view, activePlayerId, activeId, theme });
  }, [loaded, view, activePlayerId, activeId, theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // All writes go through here. The functional updater guarantees we mutate
  // the latest state, never a stale render closure — and we only persist the
  // freshly-computed value, so rapid taps can't clobber each other.
  const commit = useCallback((updater) => {
    setGames((prev) => {
      const next = updater(prev);
      saveGames(next);
      return next;
    });
  }, []);

  const startGame = () => {
    const g = emptyGame(undefined, activePlayerId);
    commit((prev) => [g, ...prev]);
    setActiveId(g.id);
    setView("track");
    setNameDraft(g.name);
    setEditingName(true);
  };

  const saveName = () => {
    const clean = nameDraft.trim();
    if (clean) updateActive((g) => { g.name = clean; return g; });
    setEditingName(false);
  };

  const updateActive = (mut) => {
    commit((prev) => prev.map((g) => (g.id === activeId ? mut({ ...g }) : g)));
  };

  const exportData = async () => {
    const json = JSON.stringify(games, null, 2);
    const filename = `cage-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (Capacitor.isNativePlatform()) {
      try {
        const { uri } = await Filesystem.writeFile({
          path: filename,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({ title: "Cage Log backup", url: uri, dialogTitle: "Save or share your backup" });
      } catch (e) {
        console.error("export failed", e);
      }
    } else {
      // browser fallback (e.g. `npm run dev`) — trigger a real file download
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importFromText(reader.result);
    reader.readAsText(file);
    e.target.value = "";
  };

  const importFromText = (text) => {
    try {
      const incoming = JSON.parse(text);
      if (!Array.isArray(incoming)) throw new Error("not an array");
      commit((prev) => {
        const byId = new Map(prev.map((g) => [g.id, g]));
        incoming.forEach((g) => { if (g && g.id) byId.set(g.id, g); });
        return Array.from(byId.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      });
      setImportError(false);
      setImportOk(incoming.length);
      setTimeout(() => setImportOk(0), 2500);
    } catch {
      setImportError(true);
    }
  };

  const logShot = (zone, result) => {
    updateActive((g) => {
      g.shots = [...g.shots, { zone, result, t: new Date().toISOString() }];
      return g;
    });
    setPendingZone(null);
  };

  const logClear = (dest, result) => {
    updateActive((g) => {
      g.clears = [...g.clears, { dest, result, t: new Date().toISOString() }];
      return g;
    });
    setPendingClear(null);
  };

  const undoLast = () => {
    updateActive((g) => {
      // undo whichever was most recent
      const lastShot = g.shots[g.shots.length - 1];
      const lastClear = g.clears[g.clears.length - 1];
      const st = lastShot ? new Date(lastShot.t).getTime() : -1;
      const ct = lastClear ? new Date(lastClear.t).getTime() : -1;
      if (st >= ct && lastShot) g.shots = g.shots.slice(0, -1);
      else if (lastClear) g.clears = g.clears.slice(0, -1);
      return g;
    });
  };

  const longPressHandlers = (onFire) => ({
    onTouchStart: () => {
      lpFired.current = false;
      lpTimer.current = setTimeout(() => { lpFired.current = true; onFire(); }, 500);
    },
    onTouchEnd: (e) => {
      clearTimeout(lpTimer.current);
      if (lpFired.current) { e.preventDefault(); lpFired.current = false; }
    },
    onTouchMove: () => clearTimeout(lpTimer.current),
    onContextMenu: (e) => { e.preventDefault(); onFire(); },
  });

  const toggleShot = (idx) => {
    updateActive((g) => {
      g.shots = g.shots.map((s, i) => i === idx ? { ...s, result: s.result === "save" ? "goal" : "save" } : s);
      return g;
    });
  };
  const deleteShot = (idx) => {
    updateActive((g) => { g.shots = g.shots.filter((_, i) => i !== idx); return g; });
  };
  const toggleClear = (idx) => {
    updateActive((g) => {
      g.clears = g.clears.map((c, i) => i === idx ? { ...c, result: c.result === "success" ? "fail" : "success" } : c);
      return g;
    });
  };
  const deleteClear = (idx) => {
    updateActive((g) => { g.clears = g.clears.filter((_, i) => i !== idx); return g; });
  };

  const deleteGame = (id) => {
    commit((prev) => prev.filter((g) => g.id !== id));
    setConfirmId(null);
    if (activeId === id) {
      const remaining = playerGames.filter((g) => g.id !== id);
      setActiveId(remaining[0]?.id || null);
    }
  };

  const commitPlayers = (updater) => {
    setPlayers((prev) => {
      const next = updater(prev);
      savePlayers(next);
      return next;
    });
  };

  const switchPlayer = (playerId) => {
    setActivePlayerId(playerId);
    const firstGame = games.find((g) => g.playerId === playerId);
    setActiveId(firstGame?.id || null);
    setPendingZone(null);
    setPendingClear(null);
    setEditZone(null);
    setEditDest(null);
  };

  const savePlayerName = (id) => {
    const clean = playerNameDraft.trim();
    if (clean) commitPlayers((prev) => prev.map((p) => p.id === id ? { ...p, name: clean } : p));
    setEditingPlayerId(null);
  };

  const confirmAddPlayer = () => {
    const clean = newPlayerDraft.trim();
    setAddingPlayer(false);
    setNewPlayerDraft("");
    if (!clean) return;
    const p = { id: `p_${Date.now()}`, name: clean };
    commitPlayers((prev) => [...prev, p]);
    switchPlayer(p.id);
  };

  const deletePlayer = (playerId) => {
    const remainingPlayers = players.filter((p) => p.id !== playerId);
    commitPlayers(() => remainingPlayers);
    commit((prev) => prev.filter((g) => g.playerId !== playerId));
    const nextPlayerId = remainingPlayers[0]?.id || null;
    setActivePlayerId(nextPlayerId);
    const nextGame = games.find((g) => g.playerId === nextPlayerId);
    setActiveId(nextGame?.id || null);
    setConfirmDeletePlayer(false);
  };

  const playerGames = games.filter((g) => g.playerId === activePlayerId);
  const active = playerGames.find((g) => g.id === activeId) || null;
  const st = active ? gameStats(active) : null;

  // zone tally for shading the net
  const zoneTally = (zone) => {
    if (!active) return { s: 0, g: 0 };
    const cell = active.shots.filter((x) => x.zone === zone);
    return { s: cell.filter((x) => x.result === "save").length, g: cell.filter((x) => x.result === "goal").length };
  };

  // clear tally per field destination: ok = success, fail = failed
  const destTally = (dest) => {
    if (!active) return { ok: 0, fail: 0 };
    const cell = active.clears.filter((x) => x.dest === dest);
    return { ok: cell.filter((x) => x.result === "success").length, fail: cell.filter((x) => x.result === "fail").length };
  };

  return (
    <div className={`wrap${theme === "light" ? " light" : ""}`}>
      <style>{css}</style>

      <header className="top">
        <div className="top-row">
          <div className="crest">
            <span className="crest-mark" aria-hidden="true">
              <img src={goalieImg} alt="" />
            </span>
            <div>
              <h1>Cage Log</h1>
            </div>
          </div>
          <div className="top-actions">
            <nav className="tabs">
              <button className={view === "track" ? "tab on" : "tab"} onClick={() => setView("track")}>Track</button>
              <button className={view === "history" ? "tab on" : "tab"} onClick={() => setView("history")}>History</button>
              <button className={view === "stats" ? "tab on" : "tab"} onClick={() => setView("stats")}>Stats</button>
            </nav>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? "☀" : "🌙"}
            </button>
          </div>
        </div>
        <div className="player-bar">
          {confirmDeletePlayer ? (
            <div className="player-delete-confirm">
              <span className="confirm-q">
                Delete {players.find((p) => p.id === activePlayerId)?.name} and{" "}
                {games.filter((g) => g.playerId === activePlayerId).length} game
                {games.filter((g) => g.playerId === activePlayerId).length !== 1 ? "s" : ""}?
              </span>
              <button className="danger sm" onClick={() => deletePlayer(activePlayerId)}>Yes, delete</button>
              <button className="ghost sm" onClick={() => setConfirmDeletePlayer(false)}>Cancel</button>
            </div>
          ) : addingPlayer ? (
            <input
              className="name-input"
              autoFocus
              placeholder="Player name"
              value={newPlayerDraft}
              onChange={(e) => setNewPlayerDraft(e.target.value)}
              onBlur={confirmAddPlayer}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAddPlayer();
                if (e.key === "Escape") { setAddingPlayer(false); setNewPlayerDraft(""); }
              }}
            />
          ) : editingPlayerId === activePlayerId && activePlayerId ? (
            <input
              className="name-input"
              autoFocus
              value={playerNameDraft}
              onChange={(e) => setPlayerNameDraft(e.target.value)}
              onBlur={() => savePlayerName(activePlayerId)}
              onKeyDown={(e) => {
                if (e.key === "Enter") savePlayerName(activePlayerId);
                if (e.key === "Escape") setEditingPlayerId(null);
              }}
            />
          ) : (
            <>
              <select
                className="player-select"
                value={activePlayerId || ""}
                onChange={(e) => {
                  if (e.target.value === "__add__") setAddingPlayer(true);
                  else switchPlayer(e.target.value);
                }}
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="__add__">+ Add Player…</option>
              </select>
              {activePlayerId && (
                <button
                  className="player-edit-btn"
                  title="Rename player"
                  onClick={() => { setPlayerNameDraft(players.find((p) => p.id === activePlayerId)?.name || ""); setEditingPlayerId(activePlayerId); }}
                >
                  ✎
                </button>
              )}
              {activePlayerId && (
                <button
                  className="player-edit-btn"
                  title={players.length <= 1 ? "Can't delete the only player" : "Delete player"}
                  disabled={players.length <= 1}
                  onClick={() => setConfirmDeletePlayer(true)}
                >
                  🗑
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {!loaded ? (
        <div className="empty">Loading…</div>
      ) : view === "track" ? (
        !active ? (
          <div className="empty">
            <p>No game started yet.</p>
            <button className="primary" onClick={startGame}>Start a game</button>
          </div>
        ) : (
          <>
            <div className="gamebar">
              <div className="gamebar-name">
                {editingName ? (
                  <input
                    className="name-input"
                    value={nameDraft}
                    autoFocus
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  />
                ) : (
                  <button className="gname-edit" onClick={() => { setNameDraft(active.name); setEditingName(true); }}>
                    <span className="gname">{active.name}</span>
                    <span className="pencil">✎</span>
                  </button>
                )}
                <div className="gmeta">{new Date(active.date).toLocaleDateString()}</div>
              </div>
              <button className="ghost" onClick={startGame}>+ New game</button>
            </div>

            <div className="scoreboard">
              <Stat label="Save %" value={st.savePct} big />
              <Stat label="Saves" value={st.saves} />
              <Stat label="Goals" value={st.goals} />
              <Stat label="Clear %" value={st.clearPct} />
            </div>

            <section className="panel">
              <h2 className="panel-title">Net <span className="hint">tap to log · hold to edit</span></h2>
              <div className="netframe">
                <div className="net">
                  {ZONE_LABELS.map((lbl, i) => {
                    const t = zoneTally(i);
                    const total = t.s + t.g;
                    const goalHeavy = total > 0 && t.g > t.s;
                    return (
                      <button
                        key={i}
                        {...longPressHandlers(() => setEditZone(i))}
                        className={`cell${pendingZone === i ? " sel" : ""}${total ? (goalHeavy ? " hot" : " cool") : ""}`}
                        onClick={() => { if (lpFired.current) return; setPendingZone(pendingZone === i ? null : i); }}
                      >
                        <span className="cell-lbl">{lbl}</span>
                        {total > 0 && (
                          <span className="cell-tally">{t.s}<i>/</i>{t.g}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {pendingZone !== null && (
                <div className="choice">
                  <span className="choice-q">{ZONE_LABELS[pendingZone]} →</span>
                  <button className="save" onClick={() => logShot(pendingZone, "save")}>Save</button>
                  <button className="goal" onClick={() => logShot(pendingZone, "goal")}>Goal</button>
                  <button className="cancel" onClick={() => setPendingZone(null)}>×</button>
                </div>
              )}
              <p className="legend">Each zone shows <b>saves / goals</b>. Blue = mostly stopped, red = mostly beat.</p>
            </section>

            <section className="panel">
              <h2 className="panel-title">Clears <span className="hint">tap to log · hold to edit</span></h2>
              <div className="fieldframe">
                <div className="field">
                  {FIELD_LABELS.map((lbl, i) => {
                    const t = destTally(i);
                    const total = t.ok + t.fail;
                    const failHeavy = total > 0 && t.fail > t.ok;
                    return (
                      <button
                        key={i}
                        {...longPressHandlers(() => setEditDest(i))}
                        className={`fcell${pendingClear === i ? " sel" : ""}${total ? (failHeavy ? " hot" : " cool") : ""}`}
                        onClick={() => { if (lpFired.current) return; setPendingClear(pendingClear === i ? null : i); }}
                      >
                        <span className="fcell-lbl">{lbl}</span>
                        {total > 0 && (
                          <span className="fcell-tally">{t.ok}<i>/</i>{t.fail}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="field-tag">attacking ▲</div>
              </div>
              {pendingClear !== null && (
                <div className="choice">
                  <span className="choice-q">{FIELD_LABELS[pendingClear]} →</span>
                  <button className="save" onClick={() => logClear(pendingClear, "success")}>Success</button>
                  <button className="goal" onClick={() => logClear(pendingClear, "fail")}>Failed</button>
                  <button className="cancel" onClick={() => setPendingClear(null)}>×</button>
                </div>
              )}
              <p className="legend">Each spot shows <b>success / failed</b>. Green = mostly cleared, red = mostly turned over.</p>
            </section>

            <div className="footer-actions">
              <button className="ghost" onClick={undoLast} disabled={!active.shots.length && !active.clears.length}>↶ Undo last</button>
              <span className="count">{st.shots} shots · {st.clears} clears logged</span>
            </div>
          </>
        )
      ) : view === "history" ? (
        <section className="history">
          <div className="backup-bar">
            <div className="backup-info">
              <span className="backup-title">Backup</span>
              <span className="backup-sub">Save your games to a file you keep</span>
            </div>
            <div className="backup-actions">
              <button className="ghost sm" onClick={exportData}>Export</button>
              <label className="ghost sm import-btn">
                Import
                <input type="file" accept="application/json,.json" onChange={importData} hidden />
              </label>
            </div>
          </div>
          {importOk > 0 && (
            <div className="import-ok">Imported {importOk} game{importOk > 1 ? "s" : ""} ✓</div>
          )}
          {importError && (
            <div className="import-err">Couldn't read that file — make sure it's a Cage Log export. <button onClick={() => setImportError(false)}>×</button></div>
          )}
          {playerGames.length === 0 ? (
            <div className="empty"><p>No games yet for this player.</p></div>
          ) : (
            playerGames.map((g) => {
              const s = gameStats(g);
              return (
                <div key={g.id} className="hcard">
                  <div className="hhead">
                    <div>
                      <div className="gname">{g.name}</div>
                      <div className="gmeta">{new Date(g.date).toLocaleDateString()}</div>
                    </div>
                    <div className="hpct">{s.savePct}<span>save</span></div>
                  </div>
                  <div className="hstats">
                    <span>{s.saves} saves</span>
                    <span>{s.goals} goals</span>
                    <span>{s.clearOk}/{s.clears} clears</span>
                  </div>
                  <div className="hactions">
                    {confirmId === g.id ? (
                      <>
                        <span className="confirm-q">Delete?</span>
                        <button className="danger sm" onClick={() => deleteGame(g.id)}>Yes, delete</button>
                        <button className="ghost sm" onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="ghost sm" onClick={() => { setActiveId(g.id); setView("track"); }}>Open</button>
                        <button className="danger sm" onClick={() => setConfirmId(g.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : view === "stats" ? (
        <StatsView games={playerGames} />
      ) : null}
      {active && (editZone !== null || editDest !== null) && (
        <EditModal
          zone={editZone}
          dest={editDest}
          shots={active.shots}
          clears={active.clears}
          onToggleShot={toggleShot}
          onDeleteShot={deleteShot}
          onToggleClear={toggleClear}
          onDeleteClear={deleteClear}
          onClose={() => { setEditZone(null); setEditDest(null); }}
        />
      )}
    </div>
  );
}

function EditModal({ zone, dest, shots, clears, onToggleShot, onDeleteShot, onToggleClear, onDeleteClear, onClose }) {
  const isShots = zone !== null;
  const title = isShots ? ZONE_LABELS[zone] : FIELD_LABELS[dest];
  const entries = isShots
    ? shots.map((s, i) => ({ idx: i, entry: s })).filter(({ entry: s }) => s.zone === zone)
    : clears.map((c, i) => ({ idx: i, entry: c })).filter(({ entry: c }) => c.dest === dest);
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {entries.length === 0 ? (
          <p className="modal-empty">No entries for this {isShots ? "zone" : "destination"} yet.</p>
        ) : (
          <div className="modal-list">
            {entries.map(({ idx, entry }) => {
              const isGood = isShots ? entry.result === "save" : entry.result === "success";
              return (
                <div key={idx} className="modal-row">
                  <span className="modal-time">{fmtTime(entry.t)}</span>
                  <button
                    className={`modal-badge ${isGood ? "badge-save" : "badge-goal"}`}
                    onClick={() => isShots ? onToggleShot(idx) : onToggleClear(idx)}
                  >
                    {isShots ? (isGood ? "Save" : "Goal") : (isGood ? "Success" : "Failed")}
                  </button>
                  <button className="modal-del" onClick={() => isShots ? onDeleteShot(idx) : onDeleteClear(idx)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsView({ games }) {
  const [period, setPeriod] = useState("all");
  const [nameFilter, setNameFilter] = useState("");

  const MS = { "7d": 7 * 86400000, "30d": 30 * 86400000, "90d": 90 * 86400000 };
  const now = Date.now();

  const filtered = games.filter((g) => {
    if (period !== "all" && now - new Date(g.date).getTime() > MS[period]) return false;
    if (nameFilter.trim() && !g.name.toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
    return true;
  });

  const allShots = filtered.flatMap((g) => g.shots);
  const allClears = filtered.flatMap((g) => g.clears);
  const saves = allShots.filter((s) => s.result === "save").length;
  const goals = allShots.filter((s) => s.result === "goal").length;
  const shots = allShots.length;
  const clearOk = allClears.filter((c) => c.result === "success").length;
  const clears = allClears.length;

  const zoneStats = ZONE_LABELS.map((_, i) => {
    const cell = allShots.filter((s) => s.zone === i);
    return { s: cell.filter((s) => s.result === "save").length, g: cell.filter((s) => s.result === "goal").length };
  });
  const destStats = FIELD_LABELS.map((_, i) => {
    const cell = allClears.filter((c) => c.dest === i);
    return { ok: cell.filter((c) => c.result === "success").length, fail: cell.filter((c) => c.result === "fail").length };
  });

  const PERIODS = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
    { key: "all", label: "Career" },
  ];

  return (
    <section className="stats-view">
      <div className="stats-filters">
        <div className="period-chips">
          {PERIODS.map((p) => (
            <button key={p.key} className={`chip${period === p.key ? " on" : ""}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <input
          className="name-filter"
          placeholder="Filter by team name…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><p>No games match.</p></div>
      ) : (
        <>
          <div className="scoreboard">
            <Stat label="Save %" value={pct(saves, shots)} big />
            <Stat label="Saves" value={saves} />
            <Stat label="Goals" value={goals} />
            <Stat label="Clear %" value={pct(clearOk, clears)} />
          </div>
          <p className="stats-meta">{filtered.length} game{filtered.length !== 1 ? "s" : ""} · {shots} shots · {clears} clears</p>

          <section className="panel">
            <h2 className="panel-title">Net</h2>
            <div className="netframe">
              <div className="net">
                {ZONE_LABELS.map((lbl, i) => {
                  const t = zoneStats[i];
                  const total = t.s + t.g;
                  const goalHeavy = total > 0 && t.g > t.s;
                  return (
                    <div key={i} className={`cell${total ? (goalHeavy ? " hot" : " cool") : ""}`} style={{ cursor: "default" }}>
                      <span className="cell-lbl">{lbl}</span>
                      {total > 0 && <span className="cell-tally">{t.s}<i>/</i>{t.g}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="legend">Each zone shows <b>saves / goals</b>. Blue = mostly stopped, red = mostly beat.</p>
          </section>

          <section className="panel">
            <h2 className="panel-title">Clears</h2>
            <div className="fieldframe">
              <div className="field">
                {FIELD_LABELS.map((lbl, i) => {
                  const t = destStats[i];
                  const total = t.ok + t.fail;
                  const failHeavy = total > 0 && t.fail > t.ok;
                  return (
                    <div key={i} className={`fcell${total ? (failHeavy ? " hot" : " cool") : ""}`} style={{ cursor: "default" }}>
                      <span className="fcell-lbl">{lbl}</span>
                      {total > 0 && <span className="fcell-tally">{t.ok}<i>/</i>{t.fail}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="field-tag">attacking ▲</div>
            </div>
            <p className="legend">Each spot shows <b>success / failed</b>. Green = mostly cleared, red = mostly turned over.</p>
          </section>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, big }) {
  return (
    <div className={big ? "stat big" : "stat"}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

const css = `
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.wrap {
  --bg: #0f1413; --bg-1: #1a2220; --bg-2: #161d1b; --bg-3: #111817;
  --border: #2c3a36; --border-strong: #3a4a44; --accent-soft-border: #2f4226;
  --text: #e8efe9; --text-soft: #b9c6bd; --text-dim: #8a978f; --text-dimmer: #6f7c74; --text-faint: #5f6d65;
  --accent: #c6ff4f; --accent-text: #c6ff4f; --accent-on: #0f1413;
  --field-text: #cfe0d2; --field-tag: #4f6a55; --fcell-overlay: rgba(255,255,255,0.04);
  --field-grad-1: #14241a; --field-grad-2: #18301f; --stat-big-grad-1: #1f2c1a; --sel-bg: #1f2c14;
  --save-bg: #1f6f4a; --goal-bg: #a32a32;
  --danger-bg: #2c1518; --danger-border: #4a2126; --danger-text: #ff8087;
  --cool-bg: #15292c; --cool-border: #2e5a63; --cool-text: #6fd3e0;
  --hot-bg: #2c1518; --hot-border: #6b2a30; --hot-text: #ff8087;
  --ok-bg: #15291d; --ok-border: #2f6b42; --ok-text: #7fe0a0;
  --chip-on-border: #4a6a38;

  max-width: 480px; margin: 0 auto; min-height: 100vh;
  background: var(--bg); color: var(--text);
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  padding: 16px 16px 40px;
}
.wrap.light {
  --bg: #f3f6f3; --bg-1: #ffffff; --bg-2: #eaf0ea; --bg-3: #ffffff;
  --border: #d3ddd4; --border-strong: #b9c7bb; --accent-soft-border: #b9d6a8;
  --text: #15201a; --text-soft: #2f3b33; --text-dim: #57655c; --text-dimmer: #6b7a70; --text-faint: #8a978f;
  --accent-text: #4f7a18;
  --field-text: #2f4a33; --fcell-overlay: rgba(0,0,0,0.035);
  --field-grad-1: #eef7ea; --field-grad-2: #e3f3e2; --stat-big-grad-1: #eef7df; --sel-bg: #eef8d2;
  --danger-bg: #fbe2e4; --danger-border: #e3a7ac; --danger-text: #b3232c;
  --cool-bg: #dff1f4; --cool-border: #9cd2db; --cool-text: #136b78;
  --hot-bg: #fbe2e4; --hot-border: #e3a7ac; --hot-text: #b3232c;
  --ok-bg: #e1f5e6; --ok-border: #9ad6ad; --ok-text: #1f7a3f;
  --chip-on-border: #8fbf6e;
}
h1, h2 { margin: 0; }
.top { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.top-row { display: flex; align-items: center; justify-content: space-between; }
.top-actions { display: flex; align-items: center; gap: 8px; }
.theme-toggle { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); font-size: 15px; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.player-bar { display: flex; gap: 6px; }
.player-select { background: var(--bg-1); border: 1px solid var(--border); color: var(--accent-text); font-size: 14px; font-weight: 700; padding: 8px 14px; border-radius: 12px; cursor: pointer; outline: none; font-family: inherit; flex: 1; }
.player-select:focus { border-color: var(--accent); }
.player-edit-btn { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); font-size: 14px; padding: 8px 11px; border-radius: 10px; cursor: pointer; }
.player-edit-btn:disabled { opacity: 0.4; cursor: default; }
.player-delete-confirm { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.crest { display: flex; align-items: center; gap: 11px; }
.crest-mark { display: inline-flex; width: 34px; height: 34px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.crest-mark img { width: 100%; height: 100%; object-fit: cover; }
.crest h1 { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
.tabs { display: flex; gap: 4px; background: var(--bg-1); padding: 3px; border-radius: 11px; }
.tab { border: 0; background: transparent; color: var(--text-dim); font-size: 13px; font-weight: 600; padding: 7px 13px; border-radius: 8px; cursor: pointer; }
.tab.on { background: var(--border); color: var(--text); }

.empty { text-align: center; padding: 70px 20px; color: var(--text-dim); }
.empty p { margin: 0 0 16px; }

.primary { background: var(--accent); color: var(--accent-on); border: 0; font-weight: 700; font-size: 15px; padding: 13px 26px; border-radius: 12px; cursor: pointer; }

.gamebar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.gamebar-name { min-width: 0; }
.gname-edit { display: inline-flex; align-items: center; gap: 7px; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; }
.pencil { font-size: 13px; color: var(--text-dimmer); }
.name-input { background: var(--bg-2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 16px; font-weight: 700; padding: 7px 10px; width: 200px; max-width: 60vw; font-family: inherit; outline: none; }
.name-input:focus { border-color: var(--accent); }
.gname { font-size: 16px; font-weight: 700; }
.gmeta { font-size: 12px; color: var(--text-dimmer); margin-top: 1px; }
.confirm-q { font-size: 12px; color: var(--danger-text); font-weight: 600; align-self: center; margin-right: 2px; }

.scoreboard { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.stat { background: var(--bg-1); border-radius: 13px; padding: 12px 10px; text-align: center; }
.stat.big { background: linear-gradient(150deg, var(--stat-big-grad-1), var(--bg-1)); border: 1px solid var(--accent-soft-border); }
.stat-val { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.stat.big .stat-val { font-size: 28px; color: var(--accent-text); }
.stat-lbl { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }

.panel { margin-bottom: 22px; }
.panel-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-soft); margin-bottom: 11px; display: flex; align-items: baseline; gap: 8px; }
.hint { font-size: 10px; font-weight: 500; color: var(--text-dimmer); text-transform: none; letter-spacing: 0; }

.netframe { background: var(--bg-2); border: 2px solid var(--border); border-radius: 14px; padding: 10px; }
.net { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 6px; aspect-ratio: 1.3 / 1; }
.cell {
  position: relative; border: 1px dashed var(--border-strong); background: var(--bg-3); border-radius: 8px;
  color: var(--text-faint); font-size: 10px; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px; transition: all .12s;
}
.cell-lbl { font-weight: 600; letter-spacing: 0.04em; }
.cell-tally { font-size: 17px; font-weight: 800; color: var(--text); }
.cell-tally i { color: var(--text-faint); font-style: normal; margin: 0 1px; }
.cell.cool { background: var(--cool-bg); border-color: var(--cool-border); }
.cell.cool .cell-tally { color: var(--cool-text); }
.cell.hot { background: var(--hot-bg); border-color: var(--hot-border); }
.cell.hot .cell-tally { color: var(--hot-text); }
.cell.sel { border: 2px solid var(--accent); background: var(--sel-bg); }

.choice { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.choice-q { font-size: 13px; font-weight: 700; color: var(--text-soft); margin-right: 2px; }
.save { flex: 1; background: var(--save-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.goal { flex: 1; background: var(--goal-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.cancel { background: var(--border); color: var(--text-soft); border: 0; font-size: 18px; width: 44px; padding: 13px 0; border-radius: 11px; cursor: pointer; }

.legend { font-size: 11px; color: var(--text-dimmer); margin: 9px 2px 0; }
.legend b { color: var(--text-soft); }

.fieldframe { position: relative; background: linear-gradient(0deg, var(--field-grad-1), var(--field-grad-2)); border: 2px solid var(--accent-soft-border); border-radius: 14px; padding: 12px; }
.field { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.fcell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: var(--fcell-overlay); border: 1px solid var(--accent-soft-border); border-radius: 9px; color: var(--field-text); font-size: 12px; font-weight: 600; padding: 14px 6px; min-height: 64px; cursor: pointer; transition: all .12s; }
.fcell-lbl { letter-spacing: 0.02em; }
.fcell-tally { font-size: 17px; font-weight: 800; color: var(--text); }
.fcell-tally i { color: var(--text-faint); font-style: normal; margin: 0 1px; }
.fcell.cool { background: var(--ok-bg); border-color: var(--ok-border); }
.fcell.cool .fcell-tally { color: var(--ok-text); }
.fcell.hot { background: var(--hot-bg); border-color: var(--hot-border); }
.fcell.hot .fcell-tally { color: var(--hot-text); }
.fcell.sel { border: 2px solid var(--accent); background: var(--sel-bg); color: var(--accent-text); }
.field-tag { text-align: center; font-size: 10px; color: var(--field-tag); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 9px; }

.footer-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.count { font-size: 11px; color: var(--text-dimmer); }

.ghost { background: var(--bg-1); color: var(--text-soft); border: 1px solid var(--border); font-weight: 600; font-size: 13px; padding: 9px 15px; border-radius: 10px; cursor: pointer; }
.ghost:disabled { opacity: 0.4; cursor: default; }
.ghost.sm, .danger.sm { padding: 7px 13px; font-size: 12px; }
.danger { background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); font-weight: 600; border-radius: 10px; cursor: pointer; }

.history { display: flex; flex-direction: column; gap: 11px; }
.backup-bar { display: flex; align-items: center; justify-content: space-between; background: var(--bg-2); border: 1px solid var(--border); border-radius: 13px; padding: 13px 15px; }
.backup-info { display: flex; flex-direction: column; gap: 2px; }
.backup-title { font-size: 13px; font-weight: 700; }
.backup-sub { font-size: 11px; color: var(--text-dimmer); }
.backup-actions { display: flex; gap: 7px; }
.import-btn { display: inline-flex; align-items: center; cursor: pointer; }
.import-err { background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger-text); font-size: 12px; border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.import-err button { background: none; border: 0; color: var(--danger-text); font-size: 16px; cursor: pointer; padding: 0 4px; }
.import-ok { background: var(--ok-bg); border: 1px solid var(--ok-border); color: var(--ok-text); font-size: 12px; border-radius: 10px; padding: 10px 12px; }
.hcard { background: var(--bg-1); border-radius: 14px; padding: 15px; }
.hhead { display: flex; align-items: flex-start; justify-content: space-between; }
.hpct { font-size: 22px; font-weight: 800; color: var(--accent-text); text-align: right; line-height: 1; }
.hpct span { display: block; font-size: 9px; color: var(--text-dimmer); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
.hstats { display: flex; gap: 14px; margin: 11px 0 13px; font-size: 13px; color: var(--text-soft); }
.hactions { display: flex; gap: 8px; }

.stats-view { display: flex; flex-direction: column; }
.stats-filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.period-chips { display: flex; gap: 6px; }
.chip { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 20px; cursor: pointer; }
.chip.on { background: var(--border); color: var(--accent-text); border-color: var(--chip-on-border); }
.name-filter { width: 100%; background: var(--bg-2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; padding: 10px 13px; font-family: inherit; outline: none; }
.name-filter:focus { border-color: var(--accent); }
.name-filter::placeholder { color: var(--field-tag); }
.stats-meta { font-size: 11px; color: var(--text-dimmer); margin: -10px 0 18px 2px; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 100; padding: 0 0 24px; }
.modal { background: var(--bg-1); border: 1px solid var(--border); border-radius: 18px; width: calc(100% - 32px); max-width: 480px; max-height: 65vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 13px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-title { font-size: 15px; font-weight: 700; }
.modal-close { background: var(--border); border: 0; color: var(--text-soft); font-size: 20px; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; line-height: 1; }
.modal-empty { padding: 22px 18px; color: var(--text-dimmer); font-size: 13px; margin: 0; }
.modal-list { overflow-y: auto; padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 7px; }
.modal-row { display: flex; align-items: center; gap: 10px; background: var(--bg-2); border-radius: 10px; padding: 10px 12px; }
.modal-time { font-size: 12px; color: var(--text-dimmer); flex: 1; }
.modal-badge { border: 0; font-size: 12px; font-weight: 700; padding: 6px 13px; border-radius: 7px; cursor: pointer; }
.badge-save { background: var(--save-bg); color: #fff; }
.badge-goal { background: var(--goal-bg); color: #fff; }
.modal-del { background: none; border: 1px solid var(--danger-border); color: var(--danger-text); font-size: 14px; font-weight: 700; width: 32px; height: 32px; border-radius: 7px; cursor: pointer; }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
