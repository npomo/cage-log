// Shared helpers for field-style trackers whose data is a flat map of numeric
// stats: game.data = { [key]: number }. Used by football, where stats are a
// mix of +/- counters and typed values (yardage). Missing keys read as 0.

export function fieldLog(game, update) {
  const data = game.data || {};
  return {
    data,
    get: (key) => data[key] || 0,
    set: (key, val) => update((d) => ({ ...d, [key]: Math.max(0, Math.round(val) || 0) })),
    adjust: (key, delta) => update((d) => ({ ...d, [key]: Math.max(0, (d[key] || 0) + delta) })),
  };
}

export function sumFields(games, key) {
  return games.reduce((n, g) => n + (g.data?.[key] || 0), 0);
}
