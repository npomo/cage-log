import { useState } from "react";
import { pct } from "../../util.js";
import { Stat, CounterGroup, CounterRow } from "../../ui.jsx";
import { eventLog, allEvents } from "../eventLog.js";

// ---- Hockey skater tracker --------------------------------------------------
// Plain +/- counters; Points (G+A) and shooting % computed automatically.
// Penalties log minutes via a 2/5/10 choice, summed into PIM.
//
// Events: { type:"goal"|"assist"|"sog"|"shot"|"block"|"hit" }
//         { type:"penalty", minutes }

const COUNTERS = [
  { type: "goal", label: "Goals" },
  { type: "assist", label: "Assists" },
  { type: "sog", label: "Shots on goal" },
  { type: "shot", label: "Total shots" },
  { type: "block", label: "Blocked shots" },
  { type: "hit", label: "Hits / checks" },
];

const PIM_OPTIONS = [2, 5, 10];

function skaterStats(events) {
  const c = (t) => events.filter((e) => e.type === t).length;
  const goals = c("goal");
  const assists = c("assist");
  const shots = c("shot");
  const penalties = events.filter((e) => e.type === "penalty");
  return {
    goals, assists, shots,
    sog: c("sog"), blocks: c("block"), hits: c("hit"),
    points: goals + assists,
    shootPct: pct(goals, shots),
    penaltyCount: penalties.length,
    pim: penalties.reduce((n, p) => n + (p.minutes || 0), 0),
  };
}

function summarize(game) {
  const s = skaterStats(game.data.events || []);
  return {
    headline: { value: s.points, label: "pts" },
    lines: [`${s.goals} G · ${s.assists} A`, `${s.shootPct} shot`, `${s.pim} PIM`],
  };
}

function SkaterTrack({ game, update }) {
  const [pendingPenalty, setPendingPenalty] = useState(false);
  const log = eventLog(game, update);
  const s = skaterStats(log.events);
  const logPenalty = (minutes) => { log.append({ type: "penalty", minutes }); setPendingPenalty(false); };

  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={s.points} big />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Assists" value={s.assists} />
        <Stat label="Shot %" value={s.shootPct} />
      </div>
      <p className="tracker-meta">{s.sog}/{s.shots} on goal · {s.blocks} blocks · {s.hits} hits · {s.pim} PIM</p>

      <CounterGroup log={log} items={COUNTERS} />

      <section className="panel">
        <h2 className="panel-title">Penalties <span className="hint">{s.pim} PIM</span></h2>
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
            <span className="choice-q">Minutes →</span>
            {PIM_OPTIONS.map((m) => (
              <button key={m} className="pen-opt" onClick={() => logPenalty(m)}>{m} min</button>
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

function SkaterStats({ games }) {
  const s = skaterStats(allEvents(games));
  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={s.points} big />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Assists" value={s.assists} />
        <Stat label="Shot %" value={s.shootPct} />
      </div>
      <p className="tracker-meta">{s.sog}/{s.shots} on goal · {s.blocks} blocks · {s.hits} hits · {s.pim} PIM</p>
    </>
  );
}

const skaterTracker = {
  sport: "hockey",
  position: "skater",
  label: "Skater",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: SkaterTrack,
  Stats: SkaterStats,
};

export default skaterTracker;
