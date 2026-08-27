import { useState } from "react";
import { pct } from "../../util.js";
import { Stat, CounterRow } from "../../ui.jsx";
import { eventLog } from "../eventLog.js";

// ---- Defender / LSM tracker -------------------------------------------------
// Counter-only: where these plays happen matters less than that they happened,
// so there's no field map. Shot suppression and matchup are tracked as plain
// totals (no tagging which opponent), so logging stays fast during a game.
//
// Event log: { type, t } plus { type:"penalty", seconds, t }

const GROUPS = [
  {
    title: "Takeaways",
    items: [
      { type: "causedTO", label: "Caused turnovers" },
      { type: "groundball", label: "Ground balls" },
    ],
  },
  {
    title: "Matchup",
    items: [
      { type: "dodgeStop", label: "Dodges stopped" },
      { type: "dodgeLoss", label: "Beaten on dodge" },
    ],
  },
  {
    title: "Clears",
    items: [
      { type: "clearSuccess", label: "Clears won" },
      { type: "clearFail", label: "Clears failed" },
    ],
  },
  {
    title: "Shots allowed",
    items: [
      { type: "shotAllowed", label: "Shots allowed" },
      { type: "goalAllowed", label: "Goals allowed" },
    ],
  },
];

const PENALTY_OPTIONS = [30, 60, 180];

// A goal allowed is a shot allowed, so goals-allowed can't exceed shots-allowed
// (and locks until there's a shot allowed).
const DEF_CAPS = { goalAllowed: (c) => c("shotAllowed") };

const fmtTime = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

function defenderStats(data) {
  const events = data.events || [];
  const c = (t) => events.filter((e) => e.type === t).length;
  const dodgeStop = c("dodgeStop");
  const dodgeLoss = c("dodgeLoss");
  const clearOk = c("clearSuccess");
  const clearFail = c("clearFail");
  const penalties = events.filter((e) => e.type === "penalty");
  const dodgeTotal = dodgeStop + dodgeLoss;
  const clearTotal = clearOk + clearFail;
  return {
    events,
    causedTO: c("causedTO"),
    groundball: c("groundball"),
    dodgeStop, dodgeLoss, dodgeTotal, dodgePct: pct(dodgeStop, dodgeTotal),
    clearOk, clearFail, clearTotal, clearPct: pct(clearOk, clearTotal),
    shotsAllowed: c("shotAllowed"),
    goalsAllowed: c("goalAllowed"),
    penaltyCount: penalties.length,
    penaltySeconds: penalties.reduce((sum, p) => sum + (p.seconds || 0), 0),
  };
}

function summarize(game) {
  const s = defenderStats(game.data);
  return {
    headline: { value: s.causedTO, label: "CT" },
    lines: [`${s.groundball} GB`, `${s.dodgePct} dodge`, `${s.clearOk}/${s.clearTotal} clears`],
  };
}

function DefenderTrack({ game, update }) {
  const [pendingPenalty, setPendingPenalty] = useState(false);
  const log = eventLog(game, update, DEF_CAPS);
  const s = defenderStats(game.data);
  const logPenalty = (seconds) => { log.append({ type: "penalty", seconds }); setPendingPenalty(false); };

  return (
    <>
      <div className="scoreboard">
        <Stat label="Dodge %" value={s.dodgePct} big />
        <Stat label="Caused TO" value={s.causedTO} />
        <Stat label="Ground" value={s.groundball} />
        <Stat label="Clear %" value={s.clearPct} />
      </div>

      {GROUPS.map((group) => (
        <section className="panel" key={group.title}>
          <h2 className="panel-title">{group.title}</h2>
          <div className="counters">
            {group.items.map(({ type, label }) => (
              <CounterRow
                key={type}
                label={label}
                value={log.count(type)}
                max={log.capOf(type)}
                onAdd={() => log.append({ type })}
                onRemove={() => log.removeLast(type)}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="panel">
        <h2 className="panel-title">
          Penalties <span className="hint">{fmtTime(s.penaltySeconds)} served</span>
        </h2>
        <div className="counters">
          <CounterRow
            label="Penalties"
            value={s.penaltyCount}
            onAdd={() => setPendingPenalty(true)}
            onRemove={() => log.removeLast("penalty")}
          />
        </div>
        {pendingPenalty && (
          <div className="choice">
            <span className="choice-q">Time →</span>
            {PENALTY_OPTIONS.map((sec) => (
              <button key={sec} className="pen-opt" onClick={() => logPenalty(sec)}>{fmtTime(sec)}</button>
            ))}
            <button className="cancel" onClick={() => setPendingPenalty(false)}>×</button>
          </div>
        )}
      </section>

      <div className="footer-actions">
        <button className="ghost" onClick={log.undoLast} disabled={!log.events.length}>↶ Undo last</button>
        <span className="count">{log.events.length} plays logged</span>
      </div>
    </>
  );
}

function DefenderStats({ games }) {
  const s = defenderStats({ events: games.flatMap((g) => g.data.events || []) });
  const perGame = games.length ? (s.shotsAllowed / games.length).toFixed(1) : "0";

  return (
    <>
      <div className="scoreboard">
        <Stat label="Dodge %" value={s.dodgePct} big />
        <Stat label="Caused TO" value={s.causedTO} />
        <Stat label="Ground" value={s.groundball} />
        <Stat label="Clear %" value={s.clearPct} />
      </div>
      <p className="tracker-meta">
        {s.shotsAllowed} shots allowed · {perGame} per game · {s.dodgeStop}/{s.dodgeTotal} matchups won
      </p>

      <div className="scoreboard">
        <Stat label="Shots all." value={s.shotsAllowed} />
        <Stat label="Goals all." value={s.goalsAllowed} />
        <Stat label="Penalties" value={s.penaltyCount} />
        <Stat label="Time" value={fmtTime(s.penaltySeconds)} />
      </div>
    </>
  );
}

const defenderTracker = {
  sport: "lacrosse",
  position: "defender",
  label: "Defender / LSM",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: DefenderTrack,
  Stats: DefenderStats,
};

export default defenderTracker;
