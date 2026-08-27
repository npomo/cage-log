// Shared helpers for counter-style trackers whose data is a flat event log:
//   game.data = { events: [ { type, t, ...fields } ] }
// Call during render with the shell's (game, update); returns closures that
// append/remove events. Not a hook — safe to call anywhere in render.
//
// `caps` optionally constrains counter types: { type: (count) => maxValue }
// where `count(t)` reads the current count of any type. A capped counter can't
// exceed its max, and when its max is 0 (e.g. its parent stat is 0) the row
// locks — so you can't log made free throws with no attempts, goals allowed
// beyond shots allowed, etc. Lowering a parent trims excess child events.
// Define caps in dependency order (parents first).

function normalizeEvents(events, caps) {
  if (!caps) return events;
  let evs = events;
  for (const type of Object.keys(caps)) {
    const countOf = (t) => evs.filter((e) => e.type === t).length;
    let excess = countOf(type) - caps[type](countOf);
    if (excess > 0) {
      const kept = [];
      for (let i = evs.length - 1; i >= 0; i--) {
        if (excess > 0 && evs[i].type === type) { excess--; continue; }
        kept.push(evs[i]);
      }
      evs = kept.reverse();
    }
  }
  return evs;
}

export function eventLog(game, update, caps) {
  const events = game.data.events || [];
  const countOf = (type) => events.filter((e) => e.type === type).length;
  const write = (fn) => update((d) => ({ ...d, events: normalizeEvents(fn(d.events || []), caps) }));
  return {
    events,
    count: countOf,
    sum: (type, field) => events.filter((e) => e.type === type).reduce((n, e) => n + (e[field] || 0), 0),
    // Current cap for a counter (Infinity when uncapped). max<=0 means locked.
    capOf: (type) => (caps && caps[type] ? caps[type](countOf) : Infinity),
    append: (ev) => write((evs) => [...evs, { ...ev, t: new Date().toISOString() }]),
    removeLast: (type) => write((evs) => {
      const out = [...evs];
      for (let i = out.length - 1; i >= 0; i--) { if (out[i].type === type) { out.splice(i, 1); break; } }
      return out;
    }),
    undoLast: () => write((evs) => evs.slice(0, -1)),
  };
}

// Aggregate an event list across many games (for Stats views).
export function allEvents(games) {
  return games.flatMap((g) => g.data.events || []);
}
