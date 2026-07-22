import React, { useState } from "react";
import { pct } from "../../util.js";
import { Stat } from "../../ui.jsx";

// ---- Attack tracker ---------------------------------------------------------
// Everything is a single timestamped event log so undo/edit stay uniform:
//   { type:"shot", zone:0-8, result:"goal"|"save"|"miss", t }
//   { type:"assist"|"groundball"|"turnover"|"causedTO"|"manUpGoal", t }
//
// Half-field shot zones (0..8), goal cage at the top of the frame:
//   0 L crease  1 Crease  2 R crease   (closest to cage)
//   3 L wing    4 Slot    5 R wing
//   6 L alley   7 Point   8 R alley    (outside)

const ZONES = [
  "L crease", "Crease", "R crease",
  "L wing", "Slot", "R wing",
  "L alley", "Point", "R alley",
];

const COUNTERS = [
  { type: "assist", label: "Assists" },
  { type: "groundball", label: "Ground balls" },
  { type: "turnover", label: "Turnovers" },
  { type: "causedTO", label: "Caused TO (ride)" },
  { type: "manUpGoal", label: "Man-up goals" },
];

function attackStats(data) {
  const events = data.events || [];
  const shots = events.filter((e) => e.type === "shot");
  const goals = shots.filter((s) => s.result === "goal").length;
  const saves = shots.filter((s) => s.result === "save").length;
  const misses = shots.filter((s) => s.result === "miss").length;
  const total = shots.length;
  const c = (t) => events.filter((e) => e.type === t).length;
  const assists = c("assist");
  return {
    events, shots, goals, saves, misses, total,
    sog: goals + saves,
    assists, points: goals + assists,
    groundball: c("groundball"), turnover: c("turnover"),
    causedTO: c("causedTO"), manUpGoal: c("manUpGoal"),
    shotPct: pct(goals, total),
  };
}

function summarize(game) {
  const s = attackStats(game.data);
  return {
    headline: { value: s.points, label: "pts" },
    lines: [`${s.goals} G · ${s.assists} A`, `${s.shotPct} shot`, `${s.groundball} GB`],
  };
}

function AttackTrack({ game, update }) {
  const [pendingZone, setPendingZone] = useState(null);
  const [editZone, setEditZone] = useState(null);
  const lpTimer = React.useRef(null);
  const lpFired = React.useRef(false);

  const data = game.data;
  const s = attackStats(data);
  const events = data.events || [];

  const zoneTally = (z) => {
    const cell = s.shots.filter((x) => x.zone === z);
    return { goals: cell.filter((x) => x.result === "goal").length, total: cell.length };
  };

  const append = (ev) => update((d) => ({ ...d, events: [...(d.events || []), { ...ev, t: new Date().toISOString() }] }));
  const logShot = (zone, result) => { append({ type: "shot", zone, result }); setPendingZone(null); };
  const addCounter = (type) => append({ type });
  const decCounter = (type) => update((d) => {
    const evs = [...(d.events || [])];
    for (let i = evs.length - 1; i >= 0; i--) { if (evs[i].type === type) { evs.splice(i, 1); break; } }
    return { ...d, events: evs };
  });
  const undoLast = () => update((d) => ({ ...d, events: (d.events || []).slice(0, -1) }));
  const cycleShot = (absIdx) => update((d) => {
    const evs = [...d.events];
    const cur = evs[absIdx];
    const next = cur.result === "goal" ? "save" : cur.result === "save" ? "miss" : "goal";
    evs[absIdx] = { ...cur, result: next };
    return { ...d, events: evs };
  });
  const deleteShot = (absIdx) => update((d) => ({ ...d, events: d.events.filter((_, i) => i !== absIdx) }));

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
        <Stat label="Points" value={s.points} big />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Assists" value={s.assists} />
        <Stat label="Shot %" value={s.shotPct} />
      </div>

      <section className="panel">
        <h2 className="panel-title">Shots <span className="hint">tap a spot, then result · hold to edit</span></h2>
        <div className="hfield">
          <div className="cage-line"><span>goal</span></div>
          <div className="hshots">
            {ZONES.map((lbl, i) => {
              const t = zoneTally(i);
              const goalHeavy = t.goals > 0 && t.goals >= t.total - t.goals;
              const cls = t.total ? (goalHeavy ? " good" : " bad") : "";
              return (
                <button
                  key={i}
                  {...longPressHandlers(() => setEditZone(i))}
                  className={`szone${pendingZone === i ? " sel" : ""}${cls}`}
                  onClick={() => { if (lpFired.current) return; setPendingZone(pendingZone === i ? null : i); }}
                >
                  <span className="szone-lbl">{lbl}</span>
                  {t.total > 0 && (<span className="szone-tally">{t.goals}<i>/</i>{t.total}</span>)}
                </button>
              );
            })}
          </div>
        </div>
        {pendingZone !== null && (
          <div className="choice">
            <span className="choice-q">{ZONES[pendingZone]} →</span>
            <button className="shot-goal" onClick={() => logShot(pendingZone, "goal")}>Goal</button>
            <button className="shot-save" onClick={() => logShot(pendingZone, "save")}>Save</button>
            <button className="shot-miss" onClick={() => logShot(pendingZone, "miss")}>Miss</button>
            <button className="cancel" onClick={() => setPendingZone(null)}>×</button>
          </div>
        )}
        <p className="legend">Each spot shows <b>goals / shots</b>. Green = mostly scored, red = mostly missed or saved.</p>
      </section>

      <section className="panel">
        <h2 className="panel-title">Plays <span className="hint">{s.sog} on goal · {s.total} shots</span></h2>
        <div className="counters">
          {COUNTERS.map(({ type, label }) => {
            const val = events.filter((e) => e.type === type).length;
            return (
              <div key={type} className="counter-row">
                <span className="counter-name">{label}</span>
                <div className="counter-ctl">
                  <button className="counter-btn" onClick={() => decCounter(type)} disabled={val === 0}>−</button>
                  <span className="counter-val">{val}</span>
                  <button className="counter-btn" onClick={() => addCounter(type)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="footer-actions">
        <button className="ghost" onClick={undoLast} disabled={!events.length}>↶ Undo last</button>
        <span className="count">{s.total} shots · {events.length - s.total} plays logged</span>
      </div>

      {editZone !== null && (
        <ShotEditModal
          zone={editZone}
          label={ZONES[editZone]}
          events={events}
          onCycle={cycleShot}
          onDelete={deleteShot}
          onClose={() => setEditZone(null)}
        />
      )}
    </>
  );
}

function ShotEditModal({ zone, label, events, onCycle, onDelete, onClose }) {
  const entries = events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.type === "shot" && e.zone === zone);
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const badge = { goal: "badge-att-goal", save: "badge-att-save", miss: "badge-att-miss" };
  const text = { goal: "Goal", save: "Save", miss: "Miss" };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">{label}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {entries.length === 0 ? (
          <p className="modal-empty">No shots from this spot yet.</p>
        ) : (
          <div className="modal-list">
            {entries.map(({ e, i }) => (
              <div key={i} className="modal-row">
                <span className="modal-time">{fmtTime(e.t)}</span>
                <button className={`modal-badge ${badge[e.result]}`} onClick={() => onCycle(i)}>{text[e.result]}</button>
                <button className="modal-del" onClick={() => onDelete(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AttackStats({ games }) {
  const s = attackStats({ events: games.flatMap((g) => g.data.events || []) });

  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={s.points} big />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Assists" value={s.assists} />
        <Stat label="Shot %" value={s.shotPct} />
      </div>
      <p className="tracker-meta">{s.sog} on goal · {s.total} shots</p>

      <div className="scoreboard">
        <Stat label="Ground" value={s.groundball} />
        <Stat label="Turnovers" value={s.turnover} />
        <Stat label="Caused" value={s.causedTO} />
        <Stat label="Man-up G" value={s.manUpGoal} />
      </div>

      <section className="panel">
        <h2 className="panel-title">Shot chart</h2>
        <div className="hfield">
          <div className="cage-line"><span>goal</span></div>
          <div className="hshots">
            {ZONES.map((lbl, i) => {
              const cell = s.shots.filter((x) => x.zone === i);
              const goals = cell.filter((x) => x.result === "goal").length;
              const total = cell.length;
              const goalHeavy = goals > 0 && goals >= total - goals;
              const cls = total ? (goalHeavy ? " good" : " bad") : "";
              return (
                <div key={i} className={`szone${cls}`} style={{ cursor: "default" }}>
                  <span className="szone-lbl">{lbl}</span>
                  {total > 0 && (<span className="szone-tally">{goals}<i>/</i>{total}</span>)}
                </div>
              );
            })}
          </div>
        </div>
        <p className="legend">Each spot shows <b>goals / shots</b>. Green = mostly scored, red = mostly missed or saved.</p>
      </section>
    </>
  );
}

const attackTracker = {
  sport: "lacrosse",
  position: "attack",
  label: "Attack",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: AttackTrack,
  Stats: AttackStats,
};

export default attackTracker;
