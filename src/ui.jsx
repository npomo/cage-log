// Shared presentational components used across sport trackers and the shell.

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
