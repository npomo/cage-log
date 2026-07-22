import React, { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import goalieImg from "./assets/goalie.jpg";
import { css } from "./styles";
import {
  DEFAULT_PLAYERS, loadGames, saveGames, loadPlayers, savePlayers,
  loadUiState, saveUiState, migrateGames, SCHEMA_VERSION,
} from "./storage";
import {
  SPORTS, getSport, getPosition, getTracker, sportIsReady,
} from "./sports/registry";

const isTab = (v) => v === "track" || v === "history" || v === "stats";

export default function CageLog() {
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState("dark");

  // navigation
  const [activeSport, setActiveSport] = useState(null);   // null = sport grid
  const [sportTab, setSportTab] = useState("history");    // track | history | stats

  // game name editing + delete confirm
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  // import feedback
  const [importError, setImportError] = useState(false);
  const [importOk, setImportOk] = useState(0);

  // player CRUD
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const [confirmDeletePlayer, setConfirmDeletePlayer] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [newPlayerDraft, setNewPlayerDraft] = useState("");

  const didLoad = React.useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    Promise.all([loadGames(), loadPlayers(), loadUiState()]).then(([g, p, ui]) => {
      const resolvedPlayers = p || DEFAULT_PLAYERS;
      if (!p) savePlayers(resolvedPlayers);
      setPlayers(resolvedPlayers);
      setGames(g);

      const playerId = ui && resolvedPlayers.some((pl) => pl.id === ui.activePlayerId)
        ? ui.activePlayerId : (resolvedPlayers[0]?.id || null);
      setActivePlayerId(playerId);

      if (ui && ui.activeSport && getSport(ui.activeSport)) setActiveSport(ui.activeSport);
      if (ui && isTab(ui.sportTab)) setSportTab(ui.sportTab);
      const restoredGame = ui && g.find((game) => game.id === ui.activeId && game.playerId === playerId);
      if (restoredGame) setActiveId(restoredGame.id);
      if (ui && (ui.theme === "dark" || ui.theme === "light")) setTheme(ui.theme);

      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveUiState({ activePlayerId, activeId, theme, activeSport, sportTab });
  }, [loaded, activePlayerId, activeId, theme, activeSport, sportTab]);

  // Android hardware/gesture back. Registered once; reads the latest handler
  // through a ref so it always sees current nav state. Steps: track/stats →
  // sport home (History) → sport grid → exit the app.
  const backRef = React.useRef(() => {});
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let handle;
    CapApp.addListener("backButton", () => backRef.current()).then((h) => { handle = h; });
    return () => { if (handle) handle.remove(); };
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const commit = useCallback((updater) => {
    setGames((prev) => {
      const next = updater(prev);
      saveGames(next);
      return next;
    });
  }, []);

  const updateActiveData = useCallback((fn) => {
    commit((prev) => prev.map((g) => (g.id === activeId ? { ...g, data: fn(g.data) } : g)));
  }, [commit, activeId]);

  // ---- derived ----
  const playerGames = games.filter((g) => g.playerId === activePlayerId);
  const sportGames = playerGames.filter((g) => g.sport === activeSport);
  const active = playerGames.find((g) => g.id === activeId && g.sport === activeSport) || null;

  const sportDef = activeSport ? getSport(activeSport) : null;
  const readyPositions = sportDef ? sportDef.positions.filter((p) => p.tracker) : [];

  // ---- game lifecycle ----
  const startGame = (positionId) => {
    const tracker = getTracker(activeSport, positionId);
    if (!tracker) return;
    const g = {
      id: `g_${Date.now()}`,
      name: `Game ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString(),
      playerId: activePlayerId,
      sport: activeSport,
      position: positionId,
      schemaVersion: SCHEMA_VERSION,
      data: tracker.emptyData(),
    };
    commit((prev) => [g, ...prev]);
    setActiveId(g.id);
    setSportTab("track");
    setNameDraft(g.name);
    setEditingName(true);
  };

  // "New game": for a single-position sport, start straight away; otherwise
  // drop back to the position picker (so tracking always "asks what position").
  const beginTracking = () => {
    if (sportDef && sportDef.positions.length === 1 && readyPositions.length === 1) {
      startGame(readyPositions[0].id);
    } else {
      setActiveId(null);
    }
  };

  const saveName = () => {
    const clean = nameDraft.trim();
    if (clean) commit((prev) => prev.map((g) => (g.id === activeId ? { ...g, name: clean } : g)));
    setEditingName(false);
  };

  const deleteGame = (id) => {
    commit((prev) => prev.filter((g) => g.id !== id));
    setConfirmId(null);
    if (activeId === id) setActiveId(null);
  };

  // ---- export / import ----
  const exportData = async () => {
    const json = JSON.stringify(games, null, 2);
    const filename = `cage-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (Capacitor.isNativePlatform()) {
      try {
        const { uri } = await Filesystem.writeFile({
          path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8,
        });
        await Share.share({ title: "Cage Log backup", url: uri, dialogTitle: "Save or share your backup" });
      } catch (e) { console.error("export failed", e); }
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
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
      const incoming = migrateGames(JSON.parse(text));
      if (!incoming.length && JSON.parse(text).length) throw new Error("no valid games");
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

  // ---- players ----
  const commitPlayers = (updater) => {
    setPlayers((prev) => {
      const next = updater(prev);
      savePlayers(next);
      return next;
    });
  };

  const switchPlayer = (playerId) => {
    setActivePlayerId(playerId);
    setActiveId(null);
    setEditingName(false);
    setConfirmId(null);
  };

  const savePlayerName = (id) => {
    const clean = playerNameDraft.trim();
    if (clean) commitPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: clean } : p)));
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
    const remaining = players.filter((p) => p.id !== playerId);
    commitPlayers(() => remaining);
    commit((prev) => prev.filter((g) => g.playerId !== playerId));
    setActivePlayerId(remaining[0]?.id || null);
    setActiveId(null);
    setConfirmDeletePlayer(false);
  };

  // ---- navigation ----
  const enterSport = (sportId) => {
    setActiveSport(sportId);
    setSportTab("history");
    setActiveId(null);
  };
  const backToGrid = () => {
    setActiveSport(null);
    setEditingName(false);
  };

  // Keep the back handler current with the latest nav state (updated in an
  // effect rather than during render so it doesn't touch the ref mid-render).
  useEffect(() => {
    backRef.current = () => {
      if (activeSport) {
        if (sportTab !== "history") setSportTab("history");
        else backToGrid();
      } else {
        CapApp.exitApp();
      }
    };
  });

  const activePlayerName = players.find((p) => p.id === activePlayerId)?.name;

  return (
    <div className={`wrap${theme === "light" ? " light" : ""}`}>
      <style>{css}</style>

      <header className="top">
        <div className="top-row">
          {sportDef ? (
            <div className="sport-heading">
              <button className="back-btn" title="All sports" onClick={backToGrid}>←</button>
              <span className="sport-emoji" aria-hidden="true">{sportDef.emoji}</span>
              <h1>{sportDef.label}</h1>
            </div>
          ) : (
            <div className="crest">
              <span className="crest-mark" aria-hidden="true"><img src={goalieImg} alt="" /></span>
              <div><h1>Cage Log</h1></div>
            </div>
          )}
          <div className="top-actions">
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
                Delete {activePlayerName} and {playerGames.length} game{playerGames.length !== 1 ? "s" : ""}?
              </span>
              <button className="danger sm" onClick={() => deletePlayer(activePlayerId)}>Yes, delete</button>
              <button className="ghost sm" onClick={() => setConfirmDeletePlayer(false)}>Cancel</button>
            </div>
          ) : addingPlayer ? (
            <input
              className="name-input" autoFocus placeholder="Player name"
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
              className="name-input" autoFocus
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
                {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                <option value="__add__">+ Add Player…</option>
              </select>
              {activePlayerId && (
                <button
                  className="player-edit-btn" title="Rename player"
                  onClick={() => { setPlayerNameDraft(activePlayerName || ""); setEditingPlayerId(activePlayerId); }}
                >✎</button>
              )}
              {activePlayerId && (
                <button
                  className="player-edit-btn"
                  title={players.length <= 1 ? "Can't delete the only player" : "Delete player"}
                  disabled={players.length <= 1}
                  onClick={() => setConfirmDeletePlayer(true)}
                >🗑</button>
              )}
            </>
          )}
        </div>

        {sportDef && (
          <nav className="tabs">
            <button className={sportTab === "track" ? "tab on" : "tab"} onClick={() => setSportTab("track")}>Track</button>
            <button className={sportTab === "history" ? "tab on" : "tab"} onClick={() => setSportTab("history")}>History</button>
            <button className={sportTab === "stats" ? "tab on" : "tab"} onClick={() => setSportTab("stats")}>Stats</button>
          </nav>
        )}
      </header>

      {!loaded ? (
        <div className="empty">Loading…</div>
      ) : !sportDef ? (
        <SportGrid onPick={enterSport} />
      ) : sportTab === "track" ? (
        <TrackTab
          sportDef={sportDef}
          active={active}
          getPosition={getPosition}
          updateActiveData={updateActiveData}
          onStart={startGame}
          onBeginTracking={beginTracking}
          editingName={editingName}
          nameDraft={nameDraft}
          setNameDraft={setNameDraft}
          setEditingName={setEditingName}
          saveName={saveName}
        />
      ) : sportTab === "history" ? (
        <HistoryTab
          games={sportGames}
          onExport={exportData}
          onImport={importData}
          importOk={importOk}
          importError={importError}
          clearImportError={() => setImportError(false)}
          confirmId={confirmId}
          setConfirmId={setConfirmId}
          onOpen={(g) => { setActiveId(g.id); setSportTab("track"); }}
          onDelete={deleteGame}
        />
      ) : (
        <StatsTab games={sportGames} sportId={activeSport} />
      )}
    </div>
  );
}

// ---- Sport grid -------------------------------------------------------------
function SportGrid({ onPick }) {
  return (
    <>
      <div className="section-label">Choose a sport</div>
      <div className="sport-grid">
        {SPORTS.map((s) => {
          const ready = sportIsReady(s);
          return (
            <button
              key={s.id}
              className={`sport-btn ${ready ? "ready" : "soon"}`}
              onClick={() => ready && onPick(s.id)}
              disabled={!ready}
            >
              {!ready && <span className="soon-tag">soon</span>}
              <span className="sport-emoji" aria-hidden="true">{s.emoji}</span>
              <span className="sport-name">{s.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---- Track tab --------------------------------------------------------------
function TrackTab({
  sportDef, active, getPosition, updateActiveData, onStart, onBeginTracking,
  editingName, nameDraft, setNameDraft, setEditingName, saveName,
}) {
  if (!active) {
    return <PositionPicker sportDef={sportDef} onStart={onStart} />;
  }
  const tracker = getTracker(active.sport, active.position);
  const posLabel = getPosition(active.sport, active.position)?.label || "";
  if (!tracker) return <div className="empty"><p>This position isn't available.</p></div>;
  const Track = tracker.Track;
  return (
    <>
      <div className="gamebar">
        <div className="gamebar-name">
          <div className="gpos">{posLabel}</div>
          {editingName ? (
            <input
              className="name-input" value={nameDraft} autoFocus
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
        <button className="ghost" onClick={onBeginTracking}>+ New game</button>
      </div>
      <Track game={active} update={updateActiveData} />
    </>
  );
}

function PositionPicker({ sportDef, onStart }) {
  const ready = sportDef.positions.filter((p) => p.tracker);
  const soon = sportDef.positions.filter((p) => !p.tracker);
  if (ready.length === 1 && soon.length === 0) {
    return (
      <div className="empty">
        <p>No game started yet.</p>
        <button className="primary" onClick={() => onStart(ready[0].id)}>Start a game</button>
      </div>
    );
  }
  return (
    <>
      <div className="section-label">Choose a position to track</div>
      <div className="position-grid">
        {sportDef.positions.map((p) => (
          <button
            key={p.id}
            className={`position-btn ${p.tracker ? "ready" : "soon"}`}
            onClick={() => p.tracker && onStart(p.id)}
            disabled={!p.tracker}
          >
            <span>{p.label}</span>
            {p.tracker ? <span className="chev">›</span> : <span className="soon-tag" style={{ position: "static" }}>soon</span>}
          </button>
        ))}
      </div>
    </>
  );
}

// ---- History tab ------------------------------------------------------------
function HistoryTab({
  games, onExport, onImport, importOk, importError, clearImportError,
  confirmId, setConfirmId, onOpen, onDelete,
}) {
  return (
    <section className="history">
      <div className="backup-bar">
        <div className="backup-info">
          <span className="backup-title">Backup</span>
          <span className="backup-sub">Save all your games to a file you keep</span>
        </div>
        <div className="backup-actions">
          <button className="ghost sm" onClick={onExport}>Export</button>
          <label className="ghost sm import-btn">
            Import
            <input type="file" accept="application/json,.json" onChange={onImport} hidden />
          </label>
        </div>
      </div>
      {importOk > 0 && (<div className="import-ok">Imported {importOk} game{importOk > 1 ? "s" : ""} ✓</div>)}
      {importError && (
        <div className="import-err">Couldn't read that file — make sure it's a Cage Log export. <button onClick={clearImportError}>×</button></div>
      )}
      {games.length === 0 ? (
        <div className="empty"><p>No games yet for this player.</p></div>
      ) : (
        games.map((g) => {
          const tracker = getTracker(g.sport, g.position);
          const posLabel = getPosition(g.sport, g.position)?.label || "";
          const summary = tracker ? tracker.summarize(g) : { headline: null, lines: [] };
          return (
            <div key={g.id} className="hcard">
              <div className="hhead">
                <div>
                  <div className="hpos">{posLabel}</div>
                  <div className="gname">{g.name}</div>
                  <div className="gmeta">{new Date(g.date).toLocaleDateString()}</div>
                </div>
                {summary.headline && (
                  <div className="hpct">{summary.headline.value}<span>{summary.headline.label}</span></div>
                )}
              </div>
              <div className="hstats">
                {summary.lines.map((line, i) => (<span key={i}>{line}</span>))}
              </div>
              <div className="hactions">
                {confirmId === g.id ? (
                  <>
                    <span className="confirm-q">Delete?</span>
                    <button className="danger sm" onClick={() => onDelete(g.id)}>Yes, delete</button>
                    <button className="ghost sm" onClick={() => setConfirmId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="ghost sm" onClick={() => onOpen(g)}>Open</button>
                    <button className="danger sm" onClick={() => setConfirmId(g.id)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

// ---- Stats tab --------------------------------------------------------------
function StatsTab({ games, sportId }) {
  const [period, setPeriod] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [now] = useState(() => Date.now());

  const MS = { "7d": 7 * 86400000, "30d": 30 * 86400000, "90d": 86400000 * 90 };
  const filtered = games.filter((g) => {
    if (period !== "all" && now - new Date(g.date).getTime() > MS[period]) return false;
    if (nameFilter.trim() && !g.name.toLowerCase().includes(nameFilter.trim().toLowerCase())) return false;
    return true;
  });

  const sportDef = getSport(sportId);
  // group filtered games by position, in the sport's declared position order
  const groups = sportDef.positions
    .map((p) => ({ position: p, games: filtered.filter((g) => g.position === p.id) }))
    .filter((grp) => grp.games.length > 0 && grp.position.tracker);
  const showLabels = groups.length > 1;

  const PERIODS = [
    { key: "7d", label: "7 days" }, { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" }, { key: "all", label: "Career" },
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
          className="name-filter" placeholder="Filter by team name…"
          value={nameFilter} onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><p>No games match.</p></div>
      ) : (
        <>
          <p className="stats-meta">{filtered.length} game{filtered.length !== 1 ? "s" : ""}</p>
          {groups.map(({ position, games: pg }) => {
            const Stats = position.tracker.Stats;
            return (
              <div key={position.id}>
                {showLabels && <div className="pos-section-label">{position.label}</div>}
                <Stats games={pg} />
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
