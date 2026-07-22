// Pure, component-free helpers shared across the app.

export const pct = (made, total) => (total === 0 ? "—" : `${Math.round((made / total) * 100)}%`);
