import { useState } from "react";
import { pct } from "../../util.js";
import { Stat, CounterGroup } from "../../ui.jsx";
import { eventLog, allEvents } from "../eventLog.js";

// ---- Basketball player tracker ----------------------------------------------
// Tap a spot on the half-court, then Made / Missed. Each spot knows whether
// it's worth 2 or 3, so points, FG%, 3P% follow automatically. Assists,
// rebounds, steals, blocks and free throws are +/- counters.
//
// Events: { type:"shot", zone, pts:2|3, made:bool }
//         { type:"assist"|"rebound"|"steal"|"block"|"ftMade"|"ftAtt" }

// Court zones: x/y are % of the court box (viewBox 500x470, basket at bottom).
const ZONES = [
  { id: "rim", x: 50, y: 83, pts: 2, label: "Rim" },
  { id: "baseL", x: 19, y: 85, pts: 2, label: "Base L" },
  { id: "baseR", x: 81, y: 85, pts: 2, label: "Base R" },
  { id: "elbowL", x: 31, y: 61, pts: 2, label: "Elbow L" },
  { id: "elbowR", x: 69, y: 61, pts: 2, label: "Elbow R" },
  { id: "ft", x: 50, y: 59, pts: 2, label: "FT" },
  { id: "cornerL", x: 9, y: 94, pts: 3, label: "Corner" },
  { id: "cornerR", x: 91, y: 94, pts: 3, label: "Corner" },
  { id: "wingL", x: 16, y: 45, pts: 3, label: "Wing" },
  { id: "wingR", x: 84, y: 45, pts: 3, label: "Wing" },
  { id: "top", x: 50, y: 29, pts: 3, label: "Top" },
];

const COUNTERS = [
  { type: "assist", label: "Assists" },
  { type: "rebound", label: "Rebounds" },
  { type: "steal", label: "Steals" },
  { type: "block", label: "Blocks" },
];

function ballStats(events) {
  const shots = events.filter((e) => e.type === "shot");
  const made2 = shots.filter((s) => s.pts === 2 && s.made).length;
  const att2 = shots.filter((s) => s.pts === 2).length;
  const made3 = shots.filter((s) => s.pts === 3 && s.made).length;
  const att3 = shots.filter((s) => s.pts === 3).length;
  const fgm = made2 + made3;
  const fga = att2 + att3;
  const c = (t) => events.filter((e) => e.type === t).length;
  const ftMade = c("ftMade");
  const ftAtt = c("ftAtt");
  return {
    shots, made2, att2, made3, att3, fgm, fga, ftMade, ftAtt,
    assists: c("assist"), rebounds: c("rebound"), steals: c("steal"), blocks: c("block"),
    points: 2 * made2 + 3 * made3 + ftMade,
    fgPct: pct(fgm, fga), tpPct: pct(made3, att3), ftPct: pct(ftMade, ftAtt),
  };
}

function summarize(game) {
  const s = ballStats(game.data.events || []);
  return {
    headline: { value: s.points, label: "pts" },
    lines: [`${s.fgm}/${s.fga} FG`, `${s.made3}/${s.att3} 3PT`, `${s.rebounds} reb · ${s.assists} ast`],
  };
}

function CourtChart({ shots, pending, onTap }) {
  const tally = (zoneId) => {
    const cell = shots.filter((s) => s.zone === zoneId);
    return { made: cell.filter((s) => s.made).length, att: cell.length };
  };
  return (
    <div className="court">
      <svg className="court-svg" viewBox="0 0 500 470" preserveAspectRatio="xMidYMid meet">
        <rect x="2" y="2" width="496" height="466" />
        <rect className="paint" x="170" y="280" width="160" height="188" />
        <circle cx="250" cy="280" r="60" />
        <line x1="215" y1="430" x2="285" y2="430" />
        <circle cx="250" cy="422" r="9" />
        <line x1="40" y1="468" x2="40" y2="340" />
        <line x1="460" y1="468" x2="460" y2="340" />
        <path d="M40,340 A224,224 0 0 1 460,340" />
        <path d="M180,2 A70,70 0 0 1 320,2" />
      </svg>
      {ZONES.map((z) => {
        const t = tally(z.id);
        const madeHeavy = t.att > 0 && t.made * 2 >= t.att;
        const cls = t.att ? (madeHeavy ? " good" : " bad") : "";
        return (
          <button
            key={z.id}
            className={`zspot${pending === z.id ? " sel" : ""}${cls}`}
            style={{ left: `${z.x}%`, top: `${z.y}%` }}
            onClick={() => onTap(z.id)}
          >
            {z.pts === 3 && <span className="z3">3</span>}
            <span className="z-lbl">{z.label}</span>
            {t.att > 0 && <span className="z-tally">{t.made}<i>/</i>{t.att}</span>}
          </button>
        );
      })}
    </div>
  );
}

function PlayerTrack({ game, update }) {
  const [pending, setPending] = useState(null);
  const log = eventLog(game, update);
  const s = ballStats(log.events);

  const logShot = (made) => {
    const zone = ZONES.find((z) => z.id === pending);
    log.append({ type: "shot", zone: zone.id, pts: zone.pts, made });
    setPending(null);
  };

  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={s.points} big />
        <Stat label="FG %" value={s.fgPct} />
        <Stat label="3P %" value={s.tpPct} />
        <Stat label="FT %" value={s.ftPct} />
      </div>

      <section className="panel">
        <h2 className="panel-title">Shots <span className="hint">tap a spot, then made or missed</span></h2>
        <CourtChart shots={s.shots} pending={pending} onTap={(z) => setPending(pending === z ? null : z)} />
        {pending && (
          <div className="choice">
            <span className="choice-q">{ZONES.find((z) => z.id === pending).label} ({ZONES.find((z) => z.id === pending).pts}pt) →</span>
            <button className="made" onClick={() => logShot(true)}>Made</button>
            <button className="missed" onClick={() => logShot(false)}>Missed</button>
            <button className="cancel" onClick={() => setPending(null)}>×</button>
          </div>
        )}
        <p className="legend">{s.fgm}/{s.fga} FG · {s.made3}/{s.att3} from three. Green = mostly made.</p>
      </section>

      <CounterGroup title="Playmaking" log={log} items={COUNTERS} />

      <section className="panel">
        <h2 className="panel-title">Free throws <span className="hint">{s.ftMade}/{s.ftAtt} · {s.ftPct}</span></h2>
        <CounterGroup log={log} items={[{ type: "ftMade", label: "Free throws made" }, { type: "ftAtt", label: "Free throws attempted" }]} />
      </section>

      <div className="footer-actions">
        <button className="ghost" onClick={log.undoLast} disabled={!log.events.length}>↶ Undo last</button>
        <span className="count">{s.fga} shots · {s.points} pts</span>
      </div>
    </>
  );
}

function PlayerStats({ games }) {
  const s = ballStats(allEvents(games));
  return (
    <>
      <div className="scoreboard">
        <Stat label="Points" value={s.points} big />
        <Stat label="FG %" value={s.fgPct} />
        <Stat label="3P %" value={s.tpPct} />
        <Stat label="FT %" value={s.ftPct} />
      </div>
      <p className="tracker-meta">
        {s.fgm}/{s.fga} FG · {s.made3}/{s.att3} 3PT · {s.ftMade}/{s.ftAtt} FT
      </p>

      <div className="scoreboard">
        <Stat label="Assists" value={s.assists} />
        <Stat label="Rebounds" value={s.rebounds} />
        <Stat label="Steals" value={s.steals} />
        <Stat label="Blocks" value={s.blocks} />
      </div>

      <section className="panel">
        <h2 className="panel-title">Shot chart</h2>
        <CourtChart shots={s.shots} pending={null} onTap={() => {}} />
        <p className="legend">Each spot shows <b>made / attempts</b>. Green = mostly made, red = mostly missed.</p>
      </section>
    </>
  );
}

const basketballTracker = {
  sport: "basketball",
  position: "player",
  label: "Player",
  status: "ready",
  emptyData: () => ({ events: [] }),
  summarize,
  Track: PlayerTrack,
  Stats: PlayerStats,
};

export default basketballTracker;
