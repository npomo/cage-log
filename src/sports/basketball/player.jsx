import { useState } from "react";
import { pct } from "../../util.js";
import { Stat, CounterGroup } from "../../ui.jsx";
import { eventLog, allEvents } from "../eventLog.js";

// ---- Basketball player tracker ----------------------------------------------
// Tap anywhere on the half-court to drop a shot marker, then Made / Missed —
// the dot turns green (made) or red (missed). Whether it's a 2 or a 3 is read
// from the tap location vs the 3-point line, so points/FG%/3P% are automatic.
// Assists, rebounds, steals, blocks and free throws are +/- counters.
//
// Events: { type:"shot", x, y, made }   // x,y are % of the court box
//         { type:"assist"|"rebound"|"steal"|"block"|"ftMade"|"ftAtt" }
//
// The court chart is per game (visible on the Track page / when opened from
// History). The career Stats view omits it — lifetime dots would be a mess.

// Court geometry (viewBox 500x470, basket at ~250,422). A shot is a three if
// it's outside the corner lines (x<40 or x>460) or beyond the arc (r>224).
function isThree(xPct, yPct) {
  const x = (xPct / 100) * 500;
  const y = (yPct / 100) * 470;
  return x < 40 || x > 460 || Math.hypot(x - 250, y - 422) > 224;
}

const COUNTERS = [
  { type: "assist", label: "Assists" },
  { type: "rebound", label: "Rebounds" },
  { type: "steal", label: "Steals" },
  { type: "block", label: "Blocks" },
];

// A made free throw must have been attempted; lock made until there's an
// attempt and cap it there. (Court shots are already made-or-missed, so they
// need no cap.)
const BB_CAPS = { ftMade: (c) => c("ftAtt") };

function ballStats(events) {
  const shots = events
    .filter((e) => e.type === "shot")
    .map((sh) => ({ ...sh, pts: isThree(sh.x, sh.y) ? 3 : 2 }));
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

function CourtChart({ shots, pending, onPlace }) {
  const interactive = !!onPlace;
  const handleClick = interactive
    ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
        onPlace(x, y);
      }
    : undefined;
  return (
    <div className="court" style={interactive ? undefined : { cursor: "default" }} onClick={handleClick}>
      <svg className="court-svg" viewBox="0 0 500 470" preserveAspectRatio="xMidYMid meet">
        <rect x="2" y="2" width="496" height="466" />
        <rect className="paint" x="170" y="280" width="160" height="188" />
        <circle className="court-mark" cx="250" cy="280" r="60" />
        <line x1="215" y1="430" x2="285" y2="430" />
        <circle className="court-mark" cx="250" cy="422" r="9" />
        <line x1="40" y1="468" x2="40" y2="340" />
        <line x1="460" y1="468" x2="460" y2="340" />
        <path d="M40,340 A224,224 0 0 1 460,340" />
        <path d="M180,2 A70,70 0 0 1 320,2" />
        {shots.map((s, i) => (
          <circle key={i} className={s.made ? "dot-made" : "dot-miss"} cx={(s.x / 100) * 500} cy={(s.y / 100) * 470} r="8" />
        ))}
        {pending && <circle className="dot-pending" cx={(pending.x / 100) * 500} cy={(pending.y / 100) * 470} r="11" />}
      </svg>
    </div>
  );
}

function PlayerTrack({ game, update }) {
  const [pending, setPending] = useState(null);
  const log = eventLog(game, update, BB_CAPS);
  const s = ballStats(log.events);

  const logShot = (made) => {
    log.append({ type: "shot", x: pending.x, y: pending.y, made });
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
        <h2 className="panel-title">Shots <span className="hint">tap the court, then made or missed</span></h2>
        <CourtChart shots={s.shots} pending={pending} onPlace={(x, y) => setPending({ x, y })} />
        {pending && (
          <div className="choice">
            <span className="choice-q">{isThree(pending.x, pending.y) ? "3-pointer" : "2-pointer"} →</span>
            <button className="made" onClick={() => logShot(true)}>Made</button>
            <button className="missed" onClick={() => logShot(false)}>Missed</button>
            <button className="cancel" onClick={() => setPending(null)}>×</button>
          </div>
        )}
        <p className="legend">{s.fgm}/{s.fga} FG · {s.made3}/{s.att3} from three. Green = made, red = missed.</p>
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

// Career view: all the stats, but no court (lifetime dots would be noise).
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
