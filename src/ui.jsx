// Shared presentational components used across sport trackers and the shell.
import { useState } from "react";

export function Stat({ label, value, big }) {
  return (
    <div className={big ? "stat big" : "stat"}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

// A single +/- counter row. `value` is the current count; onAdd/onRemove
// mutate it. `max` caps it: + disables at the cap, and when max<=0 the row
// locks (e.g. a stat whose parent is still 0). Used by the counter-style
// trackers (fogo, baseball, hockey…).
export function CounterRow({ label, value, onAdd, onRemove, min = 0, max = Infinity }) {
  const locked = max <= 0;
  return (
    <div className={`counter-row${locked ? " locked" : ""}`}>
      <span className="counter-name">{label}</span>
      <div className="counter-ctl">
        <button className="counter-btn" onClick={onRemove} disabled={value <= min}>−</button>
        <span className="counter-val">{value}</span>
        <button className="counter-btn" onClick={onAdd} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

// A titled panel of counter rows. `items` = [{ type, label }]; `log` is an
// eventLog() result; each row increments/decrements events of its `type`.
// Caps (and thus locking) come from log.capOf(type).
export function CounterGroup({ title, items, log }) {
  return (
    <section className="panel">
      {title && <h2 className="panel-title">{title}</h2>}
      <div className="counters">
        {items.map(({ type, label }) => (
          <CounterRow
            key={type}
            label={label}
            value={log.count(type)}
            max={log.capOf(type)}
            onAdd={() => log.append({ type })}
            onRemove={() => log.removeLast(type)}
          />
        ))}
      </div>
    </section>
  );
}

// A field row: label + [−] [tappable number] [+]. Tapping the number lets you
// type a value directly (numeric keyboard on mobile) — handy for yardage that
// jumps in big increments; the +/- still nudge by one. Used by field-style
// trackers (football) via a fieldLog(). `max` caps the value: at the cap the +
// is disabled, and when max<=0 the whole row locks (e.g. no pass attempts yet).
export function FieldRow({ label, value, onAdjust, onSet, max = Infinity }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const locked = max <= 0;
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) onSet(n);
    setEditing(false);
  };
  return (
    <div className={`counter-row${locked ? " locked" : ""}`}>
      <span className="counter-name">{label}</span>
      <div className="counter-ctl">
        <button className="counter-btn" onClick={() => onAdjust(-1)} disabled={value === 0}>−</button>
        {editing && !locked ? (
          <input
            className="field-input"
            type="number"
            inputMode="numeric"
            autoFocus
            value={draft}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          />
        ) : (
          <button
            className="counter-val field-num"
            disabled={locked}
            onClick={() => { setDraft(String(value)); setEditing(true); }}
          >
            {value}
          </button>
        )}
        <button className="counter-btn" onClick={() => onAdjust(1)} disabled={value >= max}>+</button>
      </div>
    </div>
  );
}

// A titled panel of field rows. `items` = [{ key, label }]; `log` is a
// fieldLog() result. Caps (and thus locking) come from log.capOf(key).
export function FieldGroup({ title, items, log }) {
  return (
    <section className="panel">
      {title && <h2 className="panel-title">{title}</h2>}
      <div className="counters">
        {items.map(({ key, label }) => (
          <FieldRow
            key={key}
            label={label}
            value={log.get(key)}
            max={log.capOf(key)}
            onAdjust={(d) => log.adjust(key, d)}
            onSet={(v) => log.set(key, v)}
          />
        ))}
      </div>
    </section>
  );
}
