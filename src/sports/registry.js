import goalieTracker from "./lacrosse/goalie.jsx";
import attackTracker from "./lacrosse/attack.jsx";
import defenderTracker from "./lacrosse/defender.jsx";
import fogoTracker from "./lacrosse/fogo.jsx";
import basketballTracker from "./basketball/player.jsx";
import pitcherTracker from "./baseball/pitcher.jsx";
import hitterTracker from "./baseball/hitter.jsx";
import hockeyGoalieTracker from "./hockey/goalie.jsx";
import skaterTracker from "./hockey/skater.jsx";
import quarterbackTracker from "./football/quarterback.jsx";
import defenseTracker from "./football/defense.jsx";
import offenseTracker from "./football/offense.jsx";

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
      { id: "attack", label: "Attack", tracker: attackTracker },
      { id: "defender", label: "Defender / LSM", tracker: defenderTracker },
      { id: "fogo", label: "FOGO", tracker: fogoTracker },
    ],
  },
  {
    id: "basketball",
    label: "Basketball",
    emoji: "🏀",
    positions: [{ id: "player", label: "Player", tracker: basketballTracker }],
  },
  {
    id: "baseball",
    label: "Baseball",
    emoji: "⚾",
    positions: [
      { id: "pitcher", label: "Pitcher", tracker: pitcherTracker },
      { id: "hitter", label: "Hitter", tracker: hitterTracker },
    ],
  },
  {
    id: "football",
    label: "Football",
    emoji: "🏈",
    positions: [
      { id: "quarterback", label: "Quarterback", tracker: quarterbackTracker },
      { id: "offense", label: "Offensive Player", tracker: offenseTracker },
      { id: "defense", label: "Defensive Player", tracker: defenseTracker },
    ],
  },
  {
    id: "hockey",
    label: "Hockey",
    emoji: "🏒",
    positions: [
      { id: "goalie", label: "Goalie", tracker: hockeyGoalieTracker },
      { id: "skater", label: "Skater", tracker: skaterTracker },
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
