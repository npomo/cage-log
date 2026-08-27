import { pct } from "../../util.js";
import { Stat, FieldGroup } from "../../ui.jsx";
import { fieldLog, sumFields } from "../fields.js";

// ---- Football offensive player tracker (receiver / back) --------------------
// Counters + typed yardage. Catch % (receptions / targets) is derived; the
// rest are entered directly.
//
// data = { targets, rec, recYds, yac, rushAtt, rushYds, td, fumbles }

function offStats(g) {
  const rec = g("rec");
  const targets = g("targets");
  return {
    rec, targets, recYds: g("recYds"), yac: g("yac"),
    rushAtt: g("rushAtt"), rushYds: g("rushYds"),
    td: g("td"), fumbles: g("fumbles"),
    catchPct: pct(rec, targets),
  };
}

function summarize(game) {
  const g = (k) => game.data?.[k] || 0;
  const s = offStats(g);
  return {
    headline: { value: s.recYds, label: "rec yds" },
    lines: [`${s.rec}/${s.targets} rec`, `${s.td} TD`, `${s.rushYds} rush`],
  };
}

function scoreboard(s) {
  return (
    <>
      <div className="scoreboard">
        <Stat label="Rec yds" value={s.recYds} big />
        <Stat label="Catch %" value={s.catchPct} />
        <Stat label="Rec" value={s.rec} />
        <Stat label="TD" value={s.td} />
      </div>
      <p className="tracker-meta">
        {s.rec}/{s.targets} targets · {s.yac} YAC · {s.rushYds} rush yds · {s.fumbles} fum
      </p>
    </>
  );
}

function OffenseTrack({ game, update }) {
  const log = fieldLog(game, update);
  const s = offStats(log.get);
  return (
    <>
      {scoreboard(s)}
      <FieldGroup title="Receiving" log={log} items={[
        { key: "targets", label: "Targets" },
        { key: "rec", label: "Receptions" },
        { key: "recYds", label: "Receiving yards" },
        { key: "yac", label: "Yards after catch" },
      ]} />
      <FieldGroup title="Rushing" log={log} items={[
        { key: "rushAtt", label: "Rush attempts" },
        { key: "rushYds", label: "Rushing yards" },
      ]} />
      <FieldGroup title="Scoring & security" log={log} items={[
        { key: "td", label: "Touchdowns" },
        { key: "fumbles", label: "Fumbles" },
      ]} />
    </>
  );
}

function OffenseStats({ games }) {
  return scoreboard(offStats((k) => sumFields(games, k)));
}

const offenseTracker = {
  sport: "football",
  position: "offense",
  label: "Offensive Player",
  status: "ready",
  emptyData: () => ({}),
  summarize,
  Track: OffenseTrack,
  Stats: OffenseStats,
};

export default offenseTracker;
