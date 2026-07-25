import { pct } from "../../util.js";
import { Stat, CounterGroup } from "../../ui.jsx";
import { eventLog, allEvents } from "../eventLog.js";

// ---- FOGO (face-off / get-off) tracker --------------------------------------
// Every draw is one tap: Win by clamp, Win by rake, or Loss. Plus ground-ball
// counters. FO% and clamp/rake rates compute automatically.
//
// Events: { type:"faceoff", result:"win"|"loss", method:"clamp"|"rake"|null }
//         { type:"groundball" | "uncontestedGB" }

function fogoStats(events) {
  const faceoffs = events.filter((e) => e.type === "faceoff");
  const wins = faceoffs.filter((f) => f.result === "win").length;
  const losses = faceoffs.filter((f) => f.result === "loss").length;
  const taken = wins + losses;
  const clampWins = faceoffs.filter((f) => f.result === "win" && f.method === "clamp").length;
  const rakeWins = faceoffs.filter((f) => f.result === "win" && f.method === "rake").length;
  const gb = events.filter((e) => e.type === "groundball").length;
  const uncontestedGB = events.filter((e) => e.type === "uncontestedGB").length;
  return {
    wins, losses, taken, clampWins, rakeWins, gb, uncontestedGB,
    foPct: pct(wins, taken),
    clampPct: pct(clampWins, wins),
  };
}

function summarize(game) {
  const s = fogoStats(game.data.events || []);
  return {
    headline: { value: s.foPct, label: "FO %" },
    lines: [`${s.wins}/${s.taken} won`, `${s.gb} GB`, `${s.clampWins}c · ${s.rakeWins}r`],
  };
}

function FogoTrack({ game, update }) {
  const log = eventLog(game, update);
  const s = fogoStats(log.events);
  const draw = (result, method) => log.append({ type: "faceoff", result, method });

  return (
    <>
      <div className="scoreboard">
        <Stat label="FO %" value={s.foPct} big />
        <Stat label="Won" value={s.wins} />
        <Stat label="Taken" value={s.taken} />
        <Stat label="Ground" value={s.gb} />
      </div>

      <section className="panel">
        <h2 className="panel-title">Face-off <span className="hint">{s.clampWins} clamp · {s.rakeWins} rake</span></h2>
        <div className="choice">
          <button className="shot-goal" onClick={() => draw("win", "clamp")}>Win — Clamp</button>
          <button className="shot-save" onClick={() => draw("win", "rake")}>Win — Rake</button>
          <button className="goal" onClick={() => draw("loss", null)}>Loss</button>
        </div>
      </section>

      <CounterGroup
        title="Ground balls"
        log={log}
        items={[
          { type: "groundball", label: "Ground balls" },
          { type: "uncontestedGB", label: "Uncontested GBs" },
        ]}
      />

      <div className="footer-actions">
        <button className="ghost" onClick={log.undoLast} disabled={!log.events.length}>↶ Undo last</button>
        <span className="count">{s.taken} faceoffs · {s.gb} GB logged</span>
      </div>
    </>
  );
}

function FogoStats({ games }) {
  const s = fogoStats(allEvents(games));
  return (
    <>
      <div className="scoreboard">
        <Stat label="FO %" value={s.foPct} big />
        <Stat label="Won" value={s.wins} />
        <Stat label="Lost" value={s.losses} />
        <Stat label="Ground" value={s.gb} />
      </div>
      <p className="tracker-meta">
        {s.taken} faceoffs · {s.clampWins} clamp / {s.rakeWins} rake ({s.clampPct} clamp) · {s.uncontestedGB} uncontested GB
      </p>
    </>
  );
}

const fogoTracker = {
  sport: "lacrosse",
  position: "fogo",
  label: "FOGO",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: FogoTrack,
  Stats: FogoStats,
};

export default fogoTracker;
