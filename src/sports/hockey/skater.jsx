import { useState } from "react";
import { pct } from "../../util.js";
import { Stat, CounterRow } from "../../ui.jsx";

// ---- Hockey skater tracker --------------------------------------------------
// Field model with auto-bumping parents: a goal is a shot on goal, and a shot
// on goal is a shot — so tapping Goal + also raises shots-on-goal and total
// shots to keep the line consistent (goals ≤ SOG ≤ total shots). Lowering a
// parent can't drop it below its child. Points and shooting % are automatic.
// Penalties are kept as a list of minute values so PIM sums correctly and the
// − removes the most recent one.
//
// data = { goals, assists, sog, shots, blocks, hits, penalties:[minutes] }

const PIM_OPTIONS = [2, 5, 10];

const g = (d, k) => d[k] || 0;

// Raise parents so goals ≤ sog ≤ shots always holds.
function raiseParents(d) {
  const sog = Math.max(g(d, "sog"), g(d, "goals"));
  const shots = Math.max(g(d, "shots"), sog);
  return { ...d, sog, shots };
}

function skaterStats(data) {
  const goals = g(data, "goals");
  const assists = g(data, "assists");
  const shots = g(data, "shots");
  const penalties = data.penalties || [];
  return {
    goals, assists, shots,
    sog: g(data, "sog"), blocks: g(data, "blocks"), hits: g(data, "hits"),
    points: goals + assists,
    shootPct: pct(goals, shots),
    penaltyCount: penalties.length,
    pim: penalties.reduce((n, m) => n + m, 0),
  };
}

function summarize(game) {
  const s = skaterStats(game.data);
  return {
    headline: { value: s.points, label: "pts" },
    lines: [`${s.goals} G · ${s.assists} A`, `${s.shootPct} shot`, `${s.pim} PIM`],
  };
}

function SkaterTrack({ game, update }) {
  const [pendingPenalty, setPendingPenalty] = useState(false);
  const data = game.data;
  const s = skaterStats(data);

  // Adjust a stat; `floors` gives per-key minimums so a parent can't drop
  // below its child. Increments then re-raise parents.
  const adjust = (key, delta, floors = {}) => update((d) => {
    const floor = floors[key] || 0;
    const next = { ...d, [key]: Math.max(floor, g(d, key) + delta) };
    return raiseParents(next);
  });

  const addPenalty = (minutes) => {
    update((d) => ({ ...d, penalties: [...(d.penalties || []), minutes] }));
    setPendingPenalty(false);
  };
  const removePenalty = () => update((d) => ({ ...d, penalties: (d.penalties || []).slice(0, -1) }));

  const row = (key, label, extra = {}) => (
    <CounterRow
      label={label}
      value={g(data, key)}
      onAdd={() => adjust(key, +1, extra.floors)}
      onRemove={() => adjust(key, -1, extra.floors)}
      min={extra.min || 0}
    />
  );

  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={s.points} big />
        <Stat label="Goals" value={s.goals} />
        <Stat label="Assists" value={s.assists} />
        <Stat label="Shot %" value={s.shootPct} />
      </div>
      <p className="tracker-meta">{s.sog}/{s.shots} on goal · {s.blocks} blocks · {s.hits} hits · {s.pim} PIM</p>

      <section className="panel">
        <h2 className="panel-title">Shooting <span className="hint">a goal counts as a shot on goal &amp; a shot</span></h2>
        <div className="counters">
          {row("goals", "Goals")}
          {row("sog", "Shots on goal", { min: s.goals, floors: { sog: s.goals } })}
          {row("shots", "Total shots", { min: s.sog, floors: { shots: s.sog } })}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Playmaking</h2>
        <div className="counters">
          {row("assists", "Assists")}
          {row("blocks", "Blocked shots")}
          {row("hits", "Hits / checks")}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Penalties <span className="hint">{s.pim} PIM</span></h2>
        <div className="counters">
          <CounterRow
            label="Penalties"
            value={s.penaltyCount}
            onAdd={() => setPendingPenalty(true)}
            onRemove={removePenalty}
          />
        </div>
        {pendingPenalty && (
          <div className="choice">
            <span className="choice-q">Minutes →</span>
            {PIM_OPTIONS.map((m) => (
              <button key={m} className="pen-opt" onClick={() => addPenalty(m)}>{m} min</button>
            ))}
            <button className="cancel" onClick={() => setPendingPenalty(false)}>×</button>
          </div>
        )}
      </section>

      <div className="footer-actions">
        <span className="count">{s.goals} G · {s.assists} A · {s.shots} shots</span>
      </div>
    </>
  );
}

function SkaterStats({ games }) {
  const total = games.reduce((acc, gm) => {
    const s = skaterStats(gm.data);
    acc.goals += s.goals; acc.assists += s.assists; acc.sog += s.sog;
    acc.shots += s.shots; acc.blocks += s.blocks; acc.hits += s.hits; acc.pim += s.pim;
    return acc;
  }, { goals: 0, assists: 0, sog: 0, shots: 0, blocks: 0, hits: 0, pim: 0 });
  const points = total.goals + total.assists;
  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={points} big />
        <Stat label="Goals" value={total.goals} />
        <Stat label="Assists" value={total.assists} />
        <Stat label="Shot %" value={pct(total.goals, total.shots)} />
      </div>
      <p className="tracker-meta">{total.sog}/{total.shots} on goal · {total.blocks} blocks · {total.hits} hits · {total.pim} PIM</p>
    </>
  );
}

const skaterTracker = {
  sport: "hockey",
  position: "skater",
  label: "Skater",
  status: "ready",
  emptyData: () => ({}),
  summarize,
  Track: SkaterTrack,
  Stats: SkaterStats,
};

export default skaterTracker;
