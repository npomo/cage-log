import React, { useState, useEffect, useCallback } from "react";
import goalieImg from "./assets/goalie.jpg";

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
const DEFAULT_PLAYERS = [
  { id: "p_vincent", name: "Vincent" },
  { id: "p_tony",    name: "Tony" },
];

async function readKey(key) {
  try {
    const res = await window.storage.get(key);
    if (!res) return null;
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
  return primary || backup || [];
}

async function loadPlayers() {
  try {
    const res = await window.storage.get(PLAYERS_KEY);
    if (!res) return null;
    const parsed = JSON.parse(res.value);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

async function savePlayers(players) {
  try {
    await window.storage.set(PLAYERS_KEY, JSON.stringify(players));
  } catch (e) {
    console.error("save players failed", e);
  }
}

async function saveGames(games) {
  const json = JSON.stringify(games);
  try {
    // back up the value we're about to commit, then write primary
    await window.storage.set(BACKUP_KEY, json);
    await window.storage.set(STORAGE_KEY, json);
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
  const [pendingZone, setPendingZone] = useState(null); // zone awaiting save/goal
  const [pendingClear, setPendingClear] = useState(null); // dest awaiting ok/fail
  const [confirmId, setConfirmId] = useState(null); // game id awaiting delete confirm
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [importError, setImportError] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importOk, setImportOk] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [editZone, setEditZone] = useState(null);
  const [editDest, setEditDest] = useState(null);
  const [players, setPlayers] = useState([]);
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newPlayerDraft, setNewPlayerDraft] = useState("");

  const didLoad = React.useRef(false);
  const lpTimer = React.useRef(null);
  const lpFired = React.useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    Promise.all([loadGames(), loadPlayers()]).then(([g, p]) => {
      const resolvedPlayers = p || DEFAULT_PLAYERS;
      if (!p) savePlayers(resolvedPlayers);
      setPlayers(resolvedPlayers);
      const firstPlayerId = resolvedPlayers[0]?.id || null;
      setActivePlayerId(firstPlayerId);
      setGames(g);
      const firstGame = g.find((game) => game.playerId === firstPlayerId);
      if (firstGame) setActiveId(firstGame.id);
      setLoaded(true);
    });
  }, []);

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

  const exportData = () => {
    const json = JSON.stringify(games, null, 2);
    setExportText(json);
    setExportOpen(true);
    // best-effort clipboard copy; many sandboxes block or undefine this, so guard hard
    try {
      const clip = navigator.clipboard;
      if (clip && typeof clip.writeText === "function") {
        const p = clip.writeText(json);
        if (p && typeof p.then === "function") {
          p.then(
            () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
            () => {}
          );
        }
      }
    } catch {}
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
      setPasteOpen(false);
      setPasteText("");
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
    <div className="wrap">
      <style>{css}</style>

      <header className="top">
        <div className="top-row">
          <div className="crest">
            <span className="crest-mark" aria-hidden="true">
              <img src={goalieImg} alt="" />
            </span>
            <div>
              <h1>Cage Log</h1>
              <p className="sub">Goalie stat tracker</p>
            </div>
          </div>
          <nav className="tabs">
            <button className={view === "track" ? "tab on" : "tab"} onClick={() => setView("track")}>Track</button>
            <button className={view === "history" ? "tab on" : "tab"} onClick={() => setView("history")}>History</button>
            <button className={view === "stats" ? "tab on" : "tab"} onClick={() => setView("stats")}>Stats</button>
          </nav>
        </div>
        <div className="player-bar">
          {addingPlayer ? (
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
              <button className="ghost sm" onClick={() => { setPasteOpen((v) => !v); setImportError(false); }}>Import</button>
            </div>
          </div>
          {exportOpen && (
            <div className="paste-box">
              <p className="paste-label">{copied ? "Copied to clipboard ✓ — " : ""}Tap the box, select all, and copy. Save this somewhere safe:</p>
              <textarea
                className="paste-area export-area"
                value={exportText}
                readOnly
                rows={6}
                onFocus={(e) => e.target.select()}
              />
              <div className="paste-actions">
                <span className="export-count">{games.length} game{games.length !== 1 ? "s" : ""}</span>
                <button className="ghost sm" onClick={() => setExportOpen(false)}>Done</button>
              </div>
            </div>
          )}
          {pasteOpen && (
            <div className="paste-box">
              <p className="paste-label">Paste the JSON below and tap Import:</p>
              <textarea
                className="paste-area"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder='[ { "id": "...", "name": "...", ... } ]'
                rows={5}
              />
              <div className="paste-actions">
                <label className="ghost sm import-btn">
                  Choose file
                  <input type="file" accept="application/json,.json" onChange={importData} hidden />
                </label>
                <div className="paste-right">
                  <button className="ghost sm" onClick={() => { setPasteOpen(false); setPasteText(""); }}>Cancel</button>
                  <button className="primary sm" onClick={() => importFromText(pasteText)} disabled={!pasteText.trim()}>Import</button>
                </div>
              </div>
            </div>
          )}
          {importOk > 0 && (
            <div className="import-ok">Imported {importOk} game{importOk > 1 ? "s" : ""} ✓</div>
          )}
          {importError && (
            <div className="import-err">Couldn't read that — make sure you pasted the full JSON. <button onClick={() => setImportError(false)}>×</button></div>
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
  max-width: 480px; margin: 0 auto; min-height: 100vh;
  background: #0f1413; color: #e8efe9;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  padding: 16px 16px 40px;
}
h1, h2 { margin: 0; }
.top { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.top-row { display: flex; align-items: center; justify-content: space-between; }
.player-bar { display: flex; gap: 6px; }
.player-select { background: #1a2220; border: 1px solid #2c3a36; color: #c6ff4f; font-size: 14px; font-weight: 700; padding: 8px 14px; border-radius: 12px; cursor: pointer; outline: none; font-family: inherit; flex: 1; }
.player-select:focus { border-color: #c6ff4f; }
.player-edit-btn { background: #1a2220; border: 1px solid #2c3a36; color: #8a978f; font-size: 14px; padding: 8px 11px; border-radius: 10px; cursor: pointer; }
.crest { display: flex; align-items: center; gap: 11px; }
.crest-mark { display: inline-flex; width: 34px; height: 34px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.crest-mark img { width: 100%; height: 100%; object-fit: cover; }
.crest h1 { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
.sub { margin: 1px 0 0; font-size: 11px; color: #6f7c74; text-transform: uppercase; letter-spacing: 0.14em; }
.tabs { display: flex; gap: 4px; background: #1a2220; padding: 3px; border-radius: 11px; }
.tab { border: 0; background: transparent; color: #8a978f; font-size: 13px; font-weight: 600; padding: 7px 13px; border-radius: 8px; cursor: pointer; }
.tab.on { background: #2c3a36; color: #e8efe9; }

.empty { text-align: center; padding: 70px 20px; color: #8a978f; }
.empty p { margin: 0 0 16px; }

.primary { background: #c6ff4f; color: #0f1413; border: 0; font-weight: 700; font-size: 15px; padding: 13px 26px; border-radius: 12px; cursor: pointer; }

.gamebar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.gamebar-name { min-width: 0; }
.gname-edit { display: inline-flex; align-items: center; gap: 7px; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; }
.pencil { font-size: 13px; color: #6f7c74; }
.name-input { background: #161d1b; border: 1px solid #2c3a36; border-radius: 9px; color: #e8efe9; font-size: 16px; font-weight: 700; padding: 7px 10px; width: 200px; max-width: 60vw; font-family: inherit; outline: none; }
.name-input:focus { border-color: #c6ff4f; }
.gname { font-size: 16px; font-weight: 700; }
.gmeta { font-size: 12px; color: #6f7c74; margin-top: 1px; }
.confirm-q { font-size: 12px; color: #ff8087; font-weight: 600; align-self: center; margin-right: 2px; }

.scoreboard { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.stat { background: #1a2220; border-radius: 13px; padding: 12px 10px; text-align: center; }
.stat.big { background: linear-gradient(150deg, #1f2c1a, #1a2220); border: 1px solid #2f4226; }
.stat-val { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.stat.big .stat-val { font-size: 28px; color: #c6ff4f; }
.stat-lbl { font-size: 10px; color: #8a978f; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }

.panel { margin-bottom: 22px; }
.panel-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #b9c6bd; margin-bottom: 11px; display: flex; align-items: baseline; gap: 8px; }
.hint { font-size: 10px; font-weight: 500; color: #6f7c74; text-transform: none; letter-spacing: 0; }

.netframe { background: #161d1b; border: 2px solid #2c3a36; border-radius: 14px; padding: 10px; }
.net { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 6px; aspect-ratio: 1.3 / 1; }
.cell {
  position: relative; border: 1px dashed #3a4a44; background: #111817; border-radius: 8px;
  color: #5f6d65; font-size: 10px; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px; transition: all .12s;
}
.cell-lbl { font-weight: 600; letter-spacing: 0.04em; }
.cell-tally { font-size: 17px; font-weight: 800; color: #e8efe9; }
.cell-tally i { color: #5f6d65; font-style: normal; margin: 0 1px; }
.cell.cool { background: #15292c; border-color: #2e5a63; }
.cell.cool .cell-tally { color: #6fd3e0; }
.cell.hot { background: #2c1518; border-color: #6b2a30; }
.cell.hot .cell-tally { color: #ff8087; }
.cell.sel { border: 2px solid #c6ff4f; background: #1f2c14; }

.choice { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.choice-q { font-size: 13px; font-weight: 700; color: #b9c6bd; margin-right: 2px; }
.save { flex: 1; background: #1f6f4a; color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.goal { flex: 1; background: #a32a32; color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.cancel { background: #2c3a36; color: #b9c6bd; border: 0; font-size: 18px; width: 44px; padding: 13px 0; border-radius: 11px; cursor: pointer; }

.legend { font-size: 11px; color: #6f7c74; margin: 9px 2px 0; }
.legend b { color: #b9c6bd; }

.fieldframe { position: relative; background: linear-gradient(0deg, #14241a, #18301f); border: 2px solid #2f4226; border-radius: 14px; padding: 12px; }
.field { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.fcell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: rgba(255,255,255,0.04); border: 1px solid #2f4226; border-radius: 9px; color: #cfe0d2; font-size: 12px; font-weight: 600; padding: 14px 6px; min-height: 64px; cursor: pointer; transition: all .12s; }
.fcell-lbl { letter-spacing: 0.02em; }
.fcell-tally { font-size: 17px; font-weight: 800; color: #e8efe9; }
.fcell-tally i { color: #5f6d65; font-style: normal; margin: 0 1px; }
.fcell.cool { background: #15291d; border-color: #2f6b42; }
.fcell.cool .fcell-tally { color: #7fe0a0; }
.fcell.hot { background: #2c1518; border-color: #6b2a30; }
.fcell.hot .fcell-tally { color: #ff8087; }
.fcell.sel { border: 2px solid #c6ff4f; background: #1f2c14; color: #c6ff4f; }
.field-tag { text-align: center; font-size: 10px; color: #4f6a55; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 9px; }

.footer-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.count { font-size: 11px; color: #6f7c74; }

.ghost { background: #1a2220; color: #b9c6bd; border: 1px solid #2c3a36; font-weight: 600; font-size: 13px; padding: 9px 15px; border-radius: 10px; cursor: pointer; }
.ghost:disabled { opacity: 0.4; cursor: default; }
.ghost.sm, .danger.sm { padding: 7px 13px; font-size: 12px; }
.danger { background: #2c1518; color: #ff8087; border: 1px solid #4a2126; font-weight: 600; border-radius: 10px; cursor: pointer; }

.history { display: flex; flex-direction: column; gap: 11px; }
.backup-bar { display: flex; align-items: center; justify-content: space-between; background: #161d1b; border: 1px solid #2c3a36; border-radius: 13px; padding: 13px 15px; }
.backup-info { display: flex; flex-direction: column; gap: 2px; }
.backup-title { font-size: 13px; font-weight: 700; }
.backup-sub { font-size: 11px; color: #6f7c74; }
.backup-actions { display: flex; gap: 7px; }
.import-btn { display: inline-flex; align-items: center; cursor: pointer; }
.import-err { background: #2c1518; border: 1px solid #4a2126; color: #ff8087; font-size: 12px; border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.import-err button { background: none; border: 0; color: #ff8087; font-size: 16px; cursor: pointer; padding: 0 4px; }
.import-ok { background: #15291d; border: 1px solid #2f6b42; color: #7fe0a0; font-size: 12px; border-radius: 10px; padding: 10px 12px; }
.paste-box { background: #161d1b; border: 1px solid #2c3a36; border-radius: 13px; padding: 13px; }
.paste-label { margin: 0 0 8px; font-size: 12px; color: #b9c6bd; }
.paste-area { width: 100%; background: #0f1413; border: 1px solid #2c3a36; border-radius: 9px; color: #e8efe9; font-family: ui-monospace, Menlo, monospace; font-size: 11px; padding: 9px; resize: vertical; outline: none; }
.paste-area:focus { border-color: #c6ff4f; }
.export-area { color: #b9c6bd; }
.export-count { font-size: 12px; color: #6f7c74; align-self: center; }
.paste-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 9px; }
.paste-right { display: flex; gap: 7px; }
.primary.sm { padding: 7px 15px; font-size: 13px; border-radius: 10px; }
.primary.sm:disabled { opacity: 0.4; cursor: default; }
.hcard { background: #1a2220; border-radius: 14px; padding: 15px; }
.hhead { display: flex; align-items: flex-start; justify-content: space-between; }
.hpct { font-size: 22px; font-weight: 800; color: #c6ff4f; text-align: right; line-height: 1; }
.hpct span { display: block; font-size: 9px; color: #6f7c74; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
.hstats { display: flex; gap: 14px; margin: 11px 0 13px; font-size: 13px; color: #b9c6bd; }
.hactions { display: flex; gap: 8px; }

.stats-view { display: flex; flex-direction: column; }
.stats-filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.period-chips { display: flex; gap: 6px; }
.chip { background: #1a2220; border: 1px solid #2c3a36; color: #8a978f; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 20px; cursor: pointer; }
.chip.on { background: #2c3a36; color: #c6ff4f; border-color: #4a6a38; }
.name-filter { width: 100%; background: #161d1b; border: 1px solid #2c3a36; border-radius: 10px; color: #e8efe9; font-size: 14px; padding: 10px 13px; font-family: inherit; outline: none; }
.name-filter:focus { border-color: #c6ff4f; }
.name-filter::placeholder { color: #4f6a55; }
.stats-meta { font-size: 11px; color: #6f7c74; margin: -10px 0 18px 2px; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 100; padding: 0 0 24px; }
.modal { background: #1a2220; border: 1px solid #2c3a36; border-radius: 18px; width: calc(100% - 32px); max-width: 480px; max-height: 65vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 13px; border-bottom: 1px solid #2c3a36; flex-shrink: 0; }
.modal-title { font-size: 15px; font-weight: 700; }
.modal-close { background: #2c3a36; border: 0; color: #b9c6bd; font-size: 20px; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; line-height: 1; }
.modal-empty { padding: 22px 18px; color: #6f7c74; font-size: 13px; margin: 0; }
.modal-list { overflow-y: auto; padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 7px; }
.modal-row { display: flex; align-items: center; gap: 10px; background: #161d1b; border-radius: 10px; padding: 10px 12px; }
.modal-time { font-size: 12px; color: #6f7c74; flex: 1; }
.modal-badge { border: 0; font-size: 12px; font-weight: 700; padding: 6px 13px; border-radius: 7px; cursor: pointer; }
.badge-save { background: #1f6f4a; color: #fff; }
.badge-goal { background: #a32a32; color: #fff; }
.modal-del { background: none; border: 1px solid #4a2126; color: #ff8087; font-size: 14px; font-weight: 700; width: 32px; height: 32px; border-radius: 7px; cursor: pointer; }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
