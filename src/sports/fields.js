// Shared helpers for field-style trackers whose data is a flat map of numeric
// stats: game.data = { [key]: number }. Used by football, where stats are a
// mix of +/- counters and typed values (yardage). Missing keys read as 0.
//
// `caps` optionally constrains fields: { key: (get) => maxValue }. A field
// with a cap can't exceed it, and when its cap is 0 (e.g. its parent stat is
// 0) the row locks entirely — so you can't log completions with no pass
// attempts, TDs beyond completions, etc. Lowering a parent clamps its
// children automatically. Define caps in dependency order (parents first).

function normalize(data, caps) {
  if (!caps) return data;
  const out = { ...data };
  const get = (k) => out[k] || 0;
  for (const key of Object.keys(caps)) {
    const cap = caps[key](get);
    if ((out[key] || 0) > cap) out[key] = Math.max(0, cap);
  }
  return out;
}

export function fieldLog(game, update, caps) {
  const data = game.data || {};
  const get = (key) => data[key] || 0;
  const write = (fn) => update((d) => normalize(fn(d), caps));
  return {
    data,
    get,
    // Current cap for a field (Infinity when uncapped). max<=0 means locked.
    capOf: (key) => (caps && caps[key] ? caps[key](get) : Infinity),
    set: (key, val) => write((d) => ({ ...d, [key]: Math.max(0, Math.round(val) || 0) })),
    adjust: (key, delta) => write((d) => ({ ...d, [key]: Math.max(0, (d[key] || 0) + delta) })),
  };
}

export function sumFields(games, key) {
  return games.reduce((n, g) => n + (g.data?.[key] || 0), 0);
}
