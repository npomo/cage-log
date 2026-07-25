import React, { useState } from "react";
import { pct } from "../../util.js";
import { Stat } from "../../ui.jsx";

// ---- Hockey goalie tracker --------------------------------------------------
// A 3x3 net grid like the lacrosse goalie. Each shot is a save or a goal, and
// a save can be flagged as having allowed a rebound. Save % and rebound rate
// compute automatically.
//
// data: { shots: [ { zone:0-8, result:"save"|"goal", rebound:bool, t } ] }

const ZONES = [
  "Glove hi", "High", "Block hi",
  "Glove", "5-hole", "Block",
  "Glove lo", "Low", "Block lo",
];

function goalieStats(data) {
  const shots = data.shots || [];
  const saves = shots.filter((s) => s.result === "save");
  const goals = shots.filter((s) => s.result === "goal").length;
  const rebounds = saves.filter((s) => s.rebound).length;
  return {
    shots, total: shots.length,
    saves: saves.length, goals, rebounds,
    savePct: pct(saves.length, shots.length),
    reboundPct: pct(rebounds, saves.length),
  };
}

function zoneTally(shots, zone) {
  const cell = shots.filter((x) => x.zone === zone);
  return { s: cell.filter((x) => x.result === "save").length, g: cell.filter((x) => x.result === "goal").length };
}

function cellClass(t, selected) {
  const total = t.s + t.g;
  const goalHeavy = total > 0 && t.g > t.s;
  return `cell${selected ? " sel" : ""}${total ? (goalHeavy ? " hot" : " cool") : ""}`;
}

function summarize(game) {
  const s = goalieStats(game.data);
  return {
    headline: { value: s.savePct, label: "save" },
    lines: [`${s.saves} saves`, `${s.goals} goals`, `${s.rebounds} rebounds`],
  };
}

function GoalieTrack({ game, update }) {
  const [pending, setPending] = useState(null);
  const [editZone, setEditZone] = useState(null);
  const lpTimer = React.useRef(null);
  const lpFired = React.useRef(false);

  const data = game.data;
  const s = goalieStats(data);

  const log = (zone, result, rebound) => {
    update((d) => ({ ...d, shots: [...(d.shots || []), { zone, result, rebound, t: new Date().toISOString() }] }));
    setPending(null);
  };
  const undoLast = () => update((d) => ({ ...d, shots: (d.shots || []).slice(0, -1) }));
  const toggleResult = (idx) => update((d) => ({
    ...d,
    shots: d.shots.map((sh, i) => i === idx
      ? { ...sh, result: sh.result === "save" ? "goal" : "save", rebound: sh.result === "save" ? false : sh.rebound }
      : sh),
  }));
  const toggleRebound = (idx) => update((d) => ({
    ...d, shots: d.shots.map((sh, i) => i === idx ? { ...sh, rebound: !sh.rebound } : sh),
  }));
  const deleteShot = (idx) => update((d) => ({ ...d, shots: d.shots.filter((_, i) => i !== idx) }));

  const lp = (onFire) => ({
    onTouchStart: () => { lpFired.current = false; lpTimer.current = setTimeout(() => { lpFired.current = true; onFire(); }, 500); },
    onTouchEnd: (e) => { clearTimeout(lpTimer.current); if (lpFired.current) { e.preventDefault(); lpFired.current = false; } },
    onTouchMove: () => clearTimeout(lpTimer.current),
    onContextMenu: (e) => { e.preventDefault(); onFire(); },
  });

  return (
    <>
      <div className="scoreboard">
        <Stat label="Save %" value={s.savePct} big />
        <Stat label="Saves" value={s.saves} />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Rebound %" value={s.reboundPct} />
      </div>

      <section className="panel">
        <h2 className="panel-title">Net <span className="hint">tap to log · hold to edit</span></h2>
        <div className="netframe">
          <div className="net">
            {ZONES.map((lbl, i) => {
              const t = zoneTally(s.shots, i);
              const total = t.s + t.g;
              return (
                <button
                  key={i}
                  {...lp(() => setEditZone(i))}
                  className={cellClass(t, pending === i)}
                  onClick={() => { if (lpFired.current) return; setPending(pending === i ? null : i); }}
                >
                  <span className="cell-lbl">{lbl}</span>
                  {total > 0 && <span className="cell-tally">{t.s}<i>/</i>{t.g}</span>}
                </button>
              );
            })}
          </div>
        </div>
        {pending !== null && (
          <div className="choice">
            <span className="choice-q">{ZONES[pending]} →</span>
            <button className="save" onClick={() => log(pending, "save", false)}>Save</button>
            <button className="shot-save" onClick={() => log(pending, "save", true)}>Save + Reb</button>
            <button className="goal" onClick={() => log(pending, "goal", false)}>Goal</button>
            <button className="cancel" onClick={() => setPending(null)}>×</button>
          </div>
        )}
        <p className="legend">Each zone shows <b>saves / goals</b>. Blue = mostly stopped, red = mostly beat.</p>
      </section>

      <div className="footer-actions">
        <button className="ghost" onClick={undoLast} disabled={!s.total}>↶ Undo last</button>
        <span className="count">{s.total} shots · {s.rebounds} rebounds</span>
      </div>

      {editZone !== null && (
        <EditModal
          zone={editZone}
          shots={data.shots}
          onToggleResult={toggleResult}
          onToggleRebound={toggleRebound}
          onDelete={deleteShot}
          onClose={() => setEditZone(null)}
        />
      )}
    </>
  );
}

function EditModal({ zone, shots, onToggleResult, onToggleRebound, onDelete, onClose }) {
  const entries = shots.map((sh, i) => ({ sh, i })).filter(({ sh }) => sh.zone === zone);
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{ZONES[zone]}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {entries.length === 0 ? (
          <p className="modal-empty">No shots to this zone yet.</p>
        ) : (
          <div className="modal-list">
            {entries.map(({ sh, i }) => {
              const isSave = sh.result === "save";
              return (
                <div key={i} className="modal-row">
                  <span className="modal-time">{fmtTime(sh.t)}</span>
                  <button className={`modal-badge ${isSave ? "badge-save" : "badge-goal"}`} onClick={() => onToggleResult(i)}>
                    {isSave ? "Save" : "Goal"}
                  </button>
                  {isSave && (
                    <button className={`modal-badge ${sh.rebound ? "badge-att-save" : "badge-att-miss"}`} onClick={() => onToggleRebound(i)}>
                      {sh.rebound ? "Rebound" : "No reb"}
                    </button>
                  )}
                  <button className="modal-del" onClick={() => onDelete(i)}>✕</button>
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
  const s = goalieStats({ shots: games.flatMap((g) => g.data.shots || []) });
  return (
    <>
      <div className="scoreboard">
        <Stat label="Save %" value={s.savePct} big />
        <Stat label="Saves" value={s.saves} />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Rebound %" value={s.reboundPct} />
      </div>
      <p className="tracker-meta">{s.total} shots faced · {s.rebounds} rebounds allowed</p>

      <section className="panel">
        <h2 className="panel-title">Net</h2>
        <div className="netframe">
          <div className="net">
            {ZONES.map((lbl, i) => {
              const t = zoneTally(s.shots, i);
              const total = t.s + t.g;
              return (
                <div key={i} className={cellClass(t, false)} style={{ cursor: "default" }}>
                  <span className="cell-lbl">{lbl}</span>
                  {total > 0 && <span className="cell-tally">{t.s}<i>/</i>{t.g}</span>}
                </div>
              );
            })}
          </div>
        </div>
        <p className="legend">Each zone shows <b>saves / goals</b>. Blue = mostly stopped, red = mostly beat.</p>
      </section>
    </>
  );
}

const hockeyGoalieTracker = {
  sport: "hockey",
  position: "goalie",
  label: "Goalie",
  status: "ready",
  emptyData: () => ({ shots: [] }),
  summarize,
  Track: GoalieTrack,
  Stats: GoalieStats,
};

export default hockeyGoalieTracker;
