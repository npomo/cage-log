import { Stat, FieldGroup } from "../../ui.jsx";
import { fieldLog, sumFields } from "../fields.js";

// ---- Football defensive player tracker --------------------------------------
// Straight counters: sacks, pressures, tackles, interceptions, passes
// deflected. No derived stats.
//
// data = { tackles, sacks, pressures, int, pd }

function defStats(g) {
  return {
    tackles: g("tackles"), sacks: g("sacks"), pressures: g("pressures"),
    int: g("int"), pd: g("pd"),
  };
}

function summarize(game) {
  const g = (k) => game.data?.[k] || 0;
  const s = defStats(g);
  return {
    headline: { value: s.tackles, label: "tkl" },
    lines: [`${s.sacks} sacks`, `${s.int} INT`, `${s.pd} PD`],
  };
}

function scoreboard(s) {
  return (
    <>
      <div className="scoreboard">
        <Stat label="Tackles" value={s.tackles} big />
        <Stat label="Sacks" value={s.sacks} />
        <Stat label="Pressures" value={s.pressures} />
        <Stat label="INT" value={s.int} />
      </div>
      <p className="tracker-meta">{s.pd} passes deflected</p>
    </>
  );
}

function DefenseTrack({ game, update }) {
  const log = fieldLog(game, update);
  const s = defStats(log.get);
  return (
    <>
      {scoreboard(s)}
      <FieldGroup log={log} items={[
        { key: "tackles", label: "Tackles" },
        { key: "sacks", label: "Sacks" },
        { key: "pressures", label: "Pressures" },
        { key: "int", label: "Interceptions" },
        { key: "pd", label: "Passes deflected" },
      ]} />
    </>
  );
}

function DefenseStats({ games }) {
  return scoreboard(defStats((k) => sumFields(games, k)));
}

const defenseTracker = {
  sport: "football",
  position: "defense",
  label: "Defensive Player",
  status: "ready",
  emptyData: () => ({}),
  summarize,
  Track: DefenseTrack,
  Stats: DefenseStats,
};

export default defenseTracker;
