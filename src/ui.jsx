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
// mutate it. Used by the counter-style trackers (fogo, baseball, hockey…).
export function CounterRow({ label, value, onAdd, onRemove }) {
  return (
    <div className="counter-row">
      <span className="counter-name">{label}</span>
      <div className="counter-ctl">
        <button className="counter-btn" onClick={onRemove} disabled={value === 0}>−</button>
        <span className="counter-val">{value}</span>
        <button className="counter-btn" onClick={onAdd}>+</button>
      </div>
    </div>
  );
}

// A titled panel of counter rows. `items` = [{ type, label }]; `log` is an
// eventLog() result; each row increments/decrements events of its `type`.
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
// trackers (football) via a fieldLog().
export function FieldRow({ label, value, onAdjust, onSet }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) onSet(n);
    setEditing(false);
  };
  return (
    <div className="counter-row">
      <span className="counter-name">{label}</span>
      <div className="counter-ctl">
        <button className="counter-btn" onClick={() => onAdjust(-1)} disabled={value === 0}>−</button>
        {editing ? (
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
          <button className="counter-val field-num" onClick={() => { setDraft(String(value)); setEditing(true); }}>
            {value}
          </button>
        )}
        <button className="counter-btn" onClick={() => onAdjust(1)}>+</button>
      </div>
    </div>
  );
}

// A titled panel of field rows. `items` = [{ key, label }]; `log` is a
// fieldLog() result.
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
            onAdjust={(d) => log.adjust(key, d)}
            onSet={(v) => log.set(key, v)}
          />
        ))}
      </div>
    </section>
  );
}
