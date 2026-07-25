import { pct } from "../../util.js";
import { Stat, CounterGroup } from "../../ui.jsx";
import { eventLog, allEvents } from "../eventLog.js";

// ---- Baseball pitcher tracker -----------------------------------------------
// Plain +/- counters; ERA, WHIP, K% and innings computed automatically.
// Innings are stored as outs (each +/- is one out) so thirds work: 17 outs =
// 5.2 IP. Batters faced is approximated as outs + hits + walks for K%.
//
// Events: { type:"out"|"earnedRun"|"strikeout"|"walk"|"hit"|"save" }

const COUNTERS = [
  { type: "out", label: "Outs recorded" },
  { type: "earnedRun", label: "Earned runs" },
  { type: "strikeout", label: "Strikeouts" },
  { type: "walk", label: "Walks" },
  { type: "hit", label: "Hits given up" },
  { type: "save", label: "Saves" },
];

const ipStr = (outs) => `${Math.floor(outs / 3)}.${outs % 3}`;
const ratio = (x) => (x == null ? "—" : x.toFixed(2));

function pitcherStats(events) {
  const c = (t) => events.filter((e) => e.type === t).length;
  const outs = c("out");
  const er = c("earnedRun");
  const k = c("strikeout");
  const bb = c("walk");
  const h = c("hit");
  const sv = c("save");
  const tbf = outs + h + bb;
  return {
    outs, er, k, bb, h, sv, tbf,
    ip: ipStr(outs),
    era: outs ? (27 * er) / outs : null,
    whip: outs ? (3 * (bb + h)) / outs : null,
    kPct: pct(k, tbf),
  };
}

function summarize(game) {
  const s = pitcherStats(game.data.events || []);
  return {
    headline: { value: ratio(s.era), label: "ERA" },
    lines: [`${s.ip} IP`, `${s.k} K`, `${ratio(s.whip)} WHIP`],
  };
}

function PitcherTrack({ game, update }) {
  const log = eventLog(game, update);
  const s = pitcherStats(log.events);
  return (
    <>
      <div className="scoreboard">
        <Stat label="ERA" value={ratio(s.era)} big />
        <Stat label="WHIP" value={ratio(s.whip)} />
        <Stat label="K" value={s.k} />
        <Stat label="IP" value={s.ip} />
      </div>
      <p className="tracker-meta">{s.k} K · {s.bb} BB · {s.h} H · {s.kPct} K rate</p>

      <CounterGroup log={log} items={COUNTERS} />

      <div className="footer-actions">
        <button className="ghost" onClick={log.undoLast} disabled={!log.events.length}>↶ Undo last</button>
        <span className="count">{s.ip} IP logged</span>
      </div>
    </>
  );
}

function PitcherStats({ games }) {
  const s = pitcherStats(allEvents(games));
  return (
    <>
      <div className="scoreboard">
        <Stat label="ERA" value={ratio(s.era)} big />
        <Stat label="WHIP" value={ratio(s.whip)} />
        <Stat label="K" value={s.k} />
        <Stat label="IP" value={s.ip} />
      </div>
      <p className="tracker-meta">{s.k} K · {s.bb} BB · {s.h} H · {s.er} ER · {s.sv} SV · {s.kPct} K rate</p>
    </>
  );
}

const pitcherTracker = {
  sport: "baseball",
  position: "pitcher",
  label: "Pitcher",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: PitcherTrack,
  Stats: PitcherStats,
};

export default pitcherTracker;
