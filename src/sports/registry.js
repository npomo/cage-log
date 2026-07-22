import goalieTracker from "./lacrosse/goalie.jsx";

// ---- Sport / position registry ----------------------------------------------
// Each sport lists its positions. A position with `tracker` is playable; one
// without is shown as "coming soon" until its module is built. Adding a sport
// or position is purely additive here — the shell reads this and nothing else.

export const SPORTS = [
  {
    id: "lacrosse",
    label: "Lacrosse",
    emoji: "🥍",
    positions: [
      { id: "goalie", label: "Goalie", tracker: goalieTracker },
      { id: "attack", label: "Attack" },
      { id: "defender", label: "Defender / LSM" },
      { id: "fogo", label: "FOGO" },
    ],
  },
  {
    id: "basketball",
    label: "Basketball",
    emoji: "🏀",
    positions: [{ id: "player", label: "Player" }],
  },
  {
    id: "baseball",
    label: "Baseball",
    emoji: "⚾",
    positions: [
      { id: "pitcher", label: "Pitcher" },
      { id: "hitter", label: "Hitter" },
    ],
  },
  {
    id: "football",
    label: "Football",
    emoji: "🏈",
    positions: [
      { id: "qb", label: "Quarterback" },
      { id: "wr", label: "Wide Receiver" },
      { id: "dl", label: "Defensive Line" },
      { id: "db", label: "Safety / Corner" },
    ],
  },
  {
    id: "hockey",
    label: "Hockey",
    emoji: "🏒",
    positions: [
      { id: "goalie", label: "Goalie" },
      { id: "skater", label: "Skater" },
    ],
  },
];

export function getSport(sportId) {
  return SPORTS.find((s) => s.id === sportId) || null;
}

export function getPosition(sportId, positionId) {
  return getSport(sportId)?.positions.find((p) => p.id === positionId) || null;
}

export function getTracker(sportId, positionId) {
  return getPosition(sportId, positionId)?.tracker || null;
}

// A sport is playable if at least one of its positions has a tracker.
export function sportIsReady(sport) {
  return sport.positions.some((p) => p.tracker);
}

export function positionIsReady(sportId, positionId) {
  return !!getTracker(sportId, positionId);
}
