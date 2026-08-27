import { pct } from "../../util.js";
import { Stat, FieldGroup } from "../../ui.jsx";
import { fieldLog, sumFields } from "../fields.js";

// ---- Football quarterback tracker -------------------------------------------
// Field-style: +/- counters for whole-number stats, tap-to-type for yardage.
// Completion %, yards/attempt, 3rd-down efficiency and red-zone % are derived
// from the entered stats. Third down & red zone are tracked as attempt/success
// pairs (rather than tagging each pass's down/yard line), keeping entry quick.
//
// data = { passAtt, comp, passYds, passTD, int, rushAtt, rushYds, fumbles,
//          thirdAtt, thirdConv, rzAtt, rzTD }

const oneDp = (x) => (x == null ? "—" : x.toFixed(1));

function qbStats(g) {
  const passAtt = g("passAtt");
  const comp = g("comp");
  const passYds = g("passYds");
  return {
    passAtt, comp, passYds,
    passTD: g("passTD"), int: g("int"),
    rushAtt: g("rushAtt"), rushYds: g("rushYds"), fumbles: g("fumbles"),
    thirdAtt: g("thirdAtt"), thirdConv: g("thirdConv"),
    rzAtt: g("rzAtt"), rzTD: g("rzTD"),
    compPct: pct(comp, passAtt),
    ypa: passAtt ? passYds / passAtt : null,
    thirdPct: pct(g("thirdConv"), g("thirdAtt")),
    rzPct: pct(g("rzTD"), g("rzAtt")),
  };
}

function summarize(game) {
  const g = (k) => game.data?.[k] || 0;
  const s = qbStats(g);
  return {
    headline: { value: s.compPct, label: "comp" },
    lines: [`${s.passYds} yds`, `${s.passTD} TD · ${s.int} INT`, `${s.rushYds} rush`],
  };
}

function scoreboard(s) {
  return (
    <>
      <div className="scoreboard">
        <Stat label="Comp %" value={s.compPct} big />
        <Stat label="Pass yds" value={s.passYds} />
        <Stat label="Pass TD" value={s.passTD} />
        <Stat label="Y/A" value={oneDp(s.ypa)} />
      </div>
      <p className="tracker-meta">
        {s.comp}/{s.passAtt} · {s.int} INT · 3rd down {s.thirdConv}/{s.thirdAtt} ({s.thirdPct}) · red zone {s.rzTD}/{s.rzAtt} ({s.rzPct})
      </p>
    </>
  );
}

function QuarterbackTrack({ game, update }) {
  const log = fieldLog(game, update);
  const s = qbStats(log.get);
  return (
    <>
      {scoreboard(s)}
      <FieldGroup title="Passing" log={log} items={[
        { key: "passAtt", label: "Pass attempts" },
        { key: "comp", label: "Completions" },
        { key: "passYds", label: "Passing yards" },
        { key: "passTD", label: "Passing TDs" },
        { key: "int", label: "Interceptions" },
      ]} />
      <FieldGroup title="Rushing" log={log} items={[
        { key: "rushAtt", label: "Rush attempts" },
        { key: "rushYds", label: "Rushing yards" },
      ]} />
      <FieldGroup title="Situational" log={log} items={[
        { key: "thirdAtt", label: "3rd down attempts" },
        { key: "thirdConv", label: "3rd downs converted" },
        { key: "rzAtt", label: "Red zone attempts" },
        { key: "rzTD", label: "Red zone TDs" },
      ]} />
      <FieldGroup title="Ball security" log={log} items={[
        { key: "fumbles", label: "Fumbles" },
      ]} />
    </>
  );
}

function QuarterbackStats({ games }) {
  const g = (k) => sumFields(games, k);
  return scoreboard(qbStats(g));
}

const quarterbackTracker = {
  sport: "football",
  position: "quarterback",
  label: "Quarterback",
  status: "ready",
  emptyData: () => ({}),
  summarize,
  Track: QuarterbackTrack,
  Stats: QuarterbackStats,
};

export default quarterbackTracker;
