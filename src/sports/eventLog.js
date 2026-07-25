// Shared helpers for counter-style trackers whose data is a flat event log:
//   game.data = { events: [ { type, t, ...fields } ] }
// Call during render with the shell's (game, update); returns closures that
// append/remove events. Not a hook — safe to call anywhere in render.

export function eventLog(game, update) {
  const events = game.data.events || [];
  return {
    events,
    count: (type) => events.filter((e) => e.type === type).length,
    sum: (type, field) => events.filter((e) => e.type === type).reduce((n, e) => n + (e[field] || 0), 0),
    append: (ev) => update((d) => ({ ...d, events: [...(d.events || []), { ...ev, t: new Date().toISOString() }] })),
    removeLast: (type) => update((d) => {
      const evs = [...(d.events || [])];
      for (let i = evs.length - 1; i >= 0; i--) { if (evs[i].type === type) { evs.splice(i, 1); break; } }
      return { ...d, events: evs };
    }),
    undoLast: () => update((d) => ({ ...d, events: (d.events || []).slice(0, -1) })),
  };
}

// Aggregate an event list across many games (for Stats views).
export function allEvents(games) {
  return games.flatMap((g) => g.data.events || []);
}
