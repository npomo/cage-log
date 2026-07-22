// Shared presentational components used across sport trackers and the shell.

export function Stat({ label, value, big }) {
  return (
    <div className={big ? "stat big" : "stat"}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}
