import React, { useState } from "react";
import { pct } from "../../util.js";
import { Stat } from "../../ui.jsx";

// ---- Goalie tracker ---------------------------------------------------------
// Data shape (game.data): { shots:[{zone:0-8, result:"save"|"goal", t}],
//                           clears:[{dest:0-5, result:"success"|"fail", t}] }
//
// zone index map for the 3x3 net (0..8):
//   0 1 2   top-left,  top-mid,  top-right
//   3 4 5   mid-left,  center,   mid-right
//   6 7 8   low-left,  low-mid,  low-right (five-hole = 7)

const ZONE_LABELS = [
  "Top L", "Top M", "Top R",
  "Mid L", "Center", "Mid R",
  "Low L", "Low M", "Low R",
];

const FIELD_LABELS = [
  "Left wing", "Up middle", "Right wing",
  "Left side", "Midfield", "Right side",
];

function goalieStats(data) {
  const shotsArr = data.shots || [];
  const clearsArr = data.clears || [];
  const saves = shotsArr.filter((s) => s.result === "save").length;
  const goals = shotsArr.filter((s) => s.result === "goal").length;
  const shots = shotsArr.length;
  const clearOk = clearsArr.filter((c) => c.result === "success").length;
  const clears = clearsArr.length;
  return { saves, goals, shots, savePct: pct(saves, shots), clearOk, clears, clearPct: pct(clearOk, clears) };
}

function summarize(game) {
  const s = goalieStats(game.data);
  return {
    headline: { value: s.savePct, label: "save" },
    lines: [`${s.saves} saves`, `${s.goals} goals`, `${s.clearOk}/${s.clears} clears`],
  };
}

function GoalieTrack({ game, update }) {
  const [pendingZone, setPendingZone] = useState(null);
  const [pendingClear, setPendingClear] = useState(null);
  const [editZone, setEditZone] = useState(null);
  const [editDest, setEditDest] = useState(null);
  const lpTimer = React.useRef(null);
  const lpFired = React.useRef(false);

  const data = game.data;
  const st = goalieStats(data);

  const zoneTally = (zone) => {
    const cell = data.shots.filter((x) => x.zone === zone);
    return { s: cell.filter((x) => x.result === "save").length, g: cell.filter((x) => x.result === "goal").length };
  };
  const destTally = (dest) => {
    const cell = data.clears.filter((x) => x.dest === dest);
    return { ok: cell.filter((x) => x.result === "success").length, fail: cell.filter((x) => x.result === "fail").length };
  };

  const logShot = (zone, result) => {
    update((d) => ({ ...d, shots: [...d.shots, { zone, result, t: new Date().toISOString() }] }));
    setPendingZone(null);
  };
  const logClear = (dest, result) => {
    update((d) => ({ ...d, clears: [...d.clears, { dest, result, t: new Date().toISOString() }] }));
    setPendingClear(null);
  };
  const undoLast = () => {
    update((d) => {
      const lastShot = d.shots[d.shots.length - 1];
      const lastClear = d.clears[d.clears.length - 1];
      const st2 = lastShot ? new Date(lastShot.t).getTime() : -1;
      const ct = lastClear ? new Date(lastClear.t).getTime() : -1;
      if (st2 >= ct && lastShot) return { ...d, shots: d.shots.slice(0, -1) };
      if (lastClear) return { ...d, clears: d.clears.slice(0, -1) };
      return d;
    });
  };

  const toggleShot = (idx) => update((d) => ({
    ...d, shots: d.shots.map((s, i) => i === idx ? { ...s, result: s.result === "save" ? "goal" : "save" } : s),
  }));
  const deleteShot = (idx) => update((d) => ({ ...d, shots: d.shots.filter((_, i) => i !== idx) }));
  const toggleClear = (idx) => update((d) => ({
    ...d, clears: d.clears.map((c, i) => i === idx ? { ...c, result: c.result === "success" ? "fail" : "success" } : c),
  }));
  const deleteClear = (idx) => update((d) => ({ ...d, clears: d.clears.filter((_, i) => i !== idx) }));

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

  return (
    <>
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
                  {total > 0 && (<span className="cell-tally">{t.s}<i>/</i>{t.g}</span>)}
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
                  {total > 0 && (<span className="fcell-tally">{t.ok}<i>/</i>{t.fail}</span>)}
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
        <button className="ghost" onClick={undoLast} disabled={!data.shots.length && !data.clears.length}>↶ Undo last</button>
        <span className="count">{st.shots} shots · {st.clears} clears logged</span>
      </div>

      {(editZone !== null || editDest !== null) && (
        <EditModal
          zone={editZone}
          dest={editDest}
          shots={data.shots}
          clears={data.clears}
          onToggleShot={toggleShot}
          onDeleteShot={deleteShot}
          onToggleClear={toggleClear}
          onDeleteClear={deleteClear}
          onClose={() => { setEditZone(null); setEditDest(null); }}
        />
      )}
    </>
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

function GoalieStats({ games }) {
  const allShots = games.flatMap((g) => g.data.shots || []);
  const allClears = games.flatMap((g) => g.data.clears || []);
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

  return (
    <>
      <div className="scoreboard">
        <Stat label="Save %" value={pct(saves, shots)} big />
        <Stat label="Saves" value={saves} />
        <Stat label="Goals" value={goals} />
        <Stat label="Clear %" value={pct(clearOk, clears)} />
      </div>
      <p className="tracker-meta">{shots} shots · {clears} clears</p>

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
  );
}

const goalieTracker = {
  sport: "lacrosse",
  position: "goalie",
  label: "Goalie",
  status: "ready",
  emptyData: () => ({ shots: [], clears: [] }),
  summarize,
  Track: GoalieTrack,
  Stats: GoalieStats,
};

export default goalieTracker;
