import { Stat, CounterGroup } from "../../ui.jsx";
import { eventLog, allEvents } from "../eventLog.js";

// ---- Baseball hitter tracker ------------------------------------------------
// Plain +/- counters; AVG, OBP, SLG, OPS computed automatically. Hit types
// (1B/2B/3B/HR) and at-bats are entered independently (a hit is also an at-bat,
// so bump both), matching the design's "one counter per stat".
//
// Events: { type:"atbat"|"single"|"double"|"triple"|"homerun"|"walk"|"strikeout"|"steal" }

const COUNTERS = [
  { type: "atbat", label: "At-bats" },
  { type: "single", label: "Singles" },
  { type: "double", label: "Doubles" },
  { type: "triple", label: "Triples" },
  { type: "homerun", label: "Home runs" },
  { type: "walk", label: "Walks" },
  { type: "strikeout", label: "Strikeouts" },
  { type: "steal", label: "Steals" },
];

// Baseball rate format: 3 decimals, drop the leading zero when below 1 (.325).
const rate = (x) => {
  if (x == null) return "—";
  const s = x.toFixed(3);
  return x >= 0 && x < 1 ? s.replace(/^0/, "") : s;
};

function hitterStats(events) {
  const c = (t) => events.filter((e) => e.type === t).length;
  const ab = c("atbat");
  const bb = c("walk");
  const single = c("single");
  const dbl = c("double");
  const triple = c("triple");
  const hr = c("homerun");
  const hits = single + dbl + triple + hr;
  const tb = single + 2 * dbl + 3 * triple + 4 * hr;
  const obp = ab + bb ? (hits + bb) / (ab + bb) : null;
  const slg = ab ? tb / ab : null;
  return {
    ab, bb, single, dbl, triple, hr, hits, tb,
    k: c("strikeout"), steal: c("steal"),
    avg: ab ? hits / ab : null,
    obp, slg,
    ops: obp != null && slg != null ? obp + slg : null,
  };
}

function summarize(game) {
  const s = hitterStats(game.data.events || []);
  return {
    headline: { value: rate(s.avg), label: "AVG" },
    lines: [`${s.hits}/${s.ab}`, `${s.hr} HR`, `${rate(s.ops)} OPS`],
  };
}

function scoreboard(s) {
  return (
    <>
      <div className="scoreboard">
        <Stat label="AVG" value={rate(s.avg)} big />
        <Stat label="OBP" value={rate(s.obp)} />
        <Stat label="SLG" value={rate(s.slg)} />
        <Stat label="OPS" value={rate(s.ops)} />
      </div>
      <p className="tracker-meta">{s.hits} H / {s.ab} AB · {s.hr} HR · {s.bb} BB · {s.k} K · {s.steal} SB</p>
    </>
  );
}

function HitterTrack({ game, update }) {
  const log = eventLog(game, update);
  const s = hitterStats(log.events);
  return (
    <>
      {scoreboard(s)}
      <CounterGroup log={log} items={COUNTERS} />
      <div className="footer-actions">
        <button className="ghost" onClick={log.undoLast} disabled={!log.events.length}>↶ Undo last</button>
        <span className="count">{s.ab} at-bats logged</span>
      </div>
    </>
  );
}

function HitterStats({ games }) {
  return scoreboard(hitterStats(allEvents(games)));
}

const hitterTracker = {
  sport: "baseball",
  position: "hitter",
  label: "Hitter",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: HitterTrack,
  Stats: HitterStats,
};

export default hitterTracker;
