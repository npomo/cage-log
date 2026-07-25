export const css = `
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.wrap {
  --bg: #0f1413; --bg-1: #1a2220; --bg-2: #161d1b; --bg-3: #111817;
  --border: #2c3a36; --border-strong: #3a4a44; --accent-soft-border: #2f4226;
  --text: #e8efe9; --text-soft: #b9c6bd; --text-dim: #8a978f; --text-dimmer: #6f7c74; --text-faint: #5f6d65;
  --accent: #c6ff4f; --accent-text: #c6ff4f; --accent-on: #0f1413;
  --field-text: #cfe0d2; --field-tag: #4f6a55; --fcell-overlay: rgba(255,255,255,0.04);
  --field-grad-1: #14241a; --field-grad-2: #18301f; --stat-big-grad-1: #1f2c1a; --sel-bg: #1f2c14;
  --save-bg: #1f6f4a; --goal-bg: #a32a32;
  --danger-bg: #2c1518; --danger-border: #4a2126; --danger-text: #ff8087;
  --cool-bg: #15292c; --cool-border: #2e5a63; --cool-text: #6fd3e0;
  --hot-bg: #2c1518; --hot-border: #6b2a30; --hot-text: #ff8087;
  --ok-bg: #15291d; --ok-border: #2f6b42; --ok-text: #7fe0a0;
  --chip-on-border: #4a6a38;

  width: 100%; max-width: 760px; margin: 0 auto; min-height: 100vh;
  background: var(--bg); color: var(--text);
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  padding: 16px 16px 40px;
}
.wrap.light {
  --bg: #f3f6f3; --bg-1: #ffffff; --bg-2: #eaf0ea; --bg-3: #ffffff;
  --border: #d3ddd4; --border-strong: #b9c7bb; --accent-soft-border: #b9d6a8;
  --text: #15201a; --text-soft: #2f3b33; --text-dim: #57655c; --text-dimmer: #6b7a70; --text-faint: #8a978f;
  --accent-text: #4f7a18;
  --field-text: #2f4a33; --fcell-overlay: rgba(0,0,0,0.035);
  --field-grad-1: #eef7ea; --field-grad-2: #e3f3e2; --stat-big-grad-1: #eef7df; --sel-bg: #eef8d2;
  --danger-bg: #fbe2e4; --danger-border: #e3a7ac; --danger-text: #b3232c;
  --cool-bg: #dff1f4; --cool-border: #9cd2db; --cool-text: #136b78;
  --hot-bg: #fbe2e4; --hot-border: #e3a7ac; --hot-text: #b3232c;
  --ok-bg: #e1f5e6; --ok-border: #9ad6ad; --ok-text: #1f7a3f;
  --chip-on-border: #8fbf6e;
}
h1, h2 { margin: 0; }
.top { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.top-row { display: flex; align-items: center; justify-content: space-between; }
.top-actions { display: flex; align-items: center; gap: 8px; }
.theme-toggle { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); font-size: 15px; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.player-bar { display: flex; gap: 6px; }
.player-select { background: var(--bg-1); border: 1px solid var(--border); color: var(--accent-text); font-size: 14px; font-weight: 700; padding: 8px 14px; border-radius: 12px; cursor: pointer; outline: none; font-family: inherit; flex: 1; }
.player-select:focus { border-color: var(--accent); }
.player-edit-btn { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); font-size: 14px; padding: 8px 11px; border-radius: 10px; cursor: pointer; }
.player-edit-btn:disabled { opacity: 0.4; cursor: default; }
.player-delete-confirm { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.crest { display: flex; align-items: center; gap: 11px; min-width: 0; }
.crest-mark { display: inline-flex; width: 34px; height: 34px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.crest-mark img { width: 100%; height: 100%; object-fit: cover; }
.crest h1 { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
.back-btn { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-soft); font-size: 15px; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.sport-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.sport-heading .sport-emoji { font-size: 22px; }
.sport-heading h1 { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tabs { display: flex; gap: 4px; background: var(--bg-1); padding: 3px; border-radius: 11px; }
.tab { border: 0; background: transparent; color: var(--text-dim); font-size: 13px; font-weight: 600; padding: 7px 13px; border-radius: 8px; cursor: pointer; }
.tab.on { background: var(--border); color: var(--text); }

.empty { text-align: center; padding: 70px 20px; color: var(--text-dim); }
.empty p { margin: 0 0 16px; }

.primary { background: var(--accent); color: var(--accent-on); border: 0; font-weight: 700; font-size: 15px; padding: 13px 26px; border-radius: 12px; cursor: pointer; }

.section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-dim); margin: 2px 2px 12px; }

.sport-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sport-btn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--bg-1); border: 1px solid var(--border); border-radius: 16px; padding: 22px 12px; cursor: pointer; color: var(--text); transition: border-color .12s, transform .08s; }
.sport-btn:active { transform: scale(0.98); }
.sport-btn.ready:hover { border-color: var(--accent); }
.sport-btn.soon { opacity: 0.55; cursor: default; }
.sport-emoji { font-size: 40px; line-height: 1; }
.sport-name { font-size: 15px; font-weight: 700; }
.soon-tag { position: absolute; top: 9px; right: 9px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dimmer); background: var(--bg-2); border: 1px solid var(--border); border-radius: 6px; padding: 2px 6px; }

.position-grid { display: flex; flex-direction: column; gap: 10px; }
.position-btn { position: relative; display: flex; align-items: center; justify-content: space-between; background: var(--bg-1); border: 1px solid var(--border); border-radius: 13px; padding: 16px 18px; cursor: pointer; color: var(--text); font-size: 16px; font-weight: 700; text-align: left; }
.position-btn.ready:hover { border-color: var(--accent); }
.position-btn.soon { opacity: 0.55; cursor: default; }
.position-btn .chev { color: var(--text-dim); font-size: 15px; }

.gamebar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.gamebar-name { min-width: 0; }
.gname-edit { display: inline-flex; align-items: center; gap: 7px; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; }
.pencil { font-size: 13px; color: var(--text-dimmer); }
.name-input { background: var(--bg-2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); font-size: 16px; font-weight: 700; padding: 7px 10px; width: 200px; max-width: 60vw; font-family: inherit; outline: none; }
.name-input:focus { border-color: var(--accent); }
.gname { font-size: 16px; font-weight: 700; }
.gmeta { font-size: 12px; color: var(--text-dimmer); margin-top: 1px; }
.gpos { font-size: 11px; color: var(--text-dim); font-weight: 600; }
.confirm-q { font-size: 12px; color: var(--danger-text); font-weight: 600; align-self: center; margin-right: 2px; }

.scoreboard { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.stat { background: var(--bg-1); border-radius: 13px; padding: 12px 10px; text-align: center; }
.stat.big { background: linear-gradient(150deg, var(--stat-big-grad-1), var(--bg-1)); border: 1px solid var(--accent-soft-border); }
.stat-val { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.stat.big .stat-val { font-size: 28px; color: var(--accent-text); }
.stat-lbl { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }

.panel { margin-bottom: 22px; }
.panel-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-soft); margin-bottom: 11px; display: flex; align-items: baseline; gap: 8px; }
.hint { font-size: 10px; font-weight: 500; color: var(--text-dimmer); text-transform: none; letter-spacing: 0; }

.netframe { background: var(--bg-2); border: 2px solid var(--border); border-radius: 14px; padding: 10px; }
.net { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 6px; aspect-ratio: 1.3 / 1; }
.cell {
  position: relative; border: 1px dashed var(--border-strong); background: var(--bg-3); border-radius: 8px;
  color: var(--text-faint); font-size: 10px; cursor: pointer; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 3px; transition: all .12s;
}
.cell-lbl { font-weight: 600; letter-spacing: 0.04em; }
.cell-tally { font-size: 17px; font-weight: 800; color: var(--text); }
.cell-tally i { color: var(--text-faint); font-style: normal; margin: 0 1px; }
.cell.cool { background: var(--cool-bg); border-color: var(--cool-border); }
.cell.cool .cell-tally { color: var(--cool-text); }
.cell.hot { background: var(--hot-bg); border-color: var(--hot-border); }
.cell.hot .cell-tally { color: var(--hot-text); }
.cell.sel { border: 2px solid var(--accent); background: var(--sel-bg); }

.choice { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.choice-q { font-size: 13px; font-weight: 700; color: var(--text-soft); margin-right: 2px; }
.save { flex: 1; background: var(--save-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.goal { flex: 1; background: var(--goal-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.cancel { background: var(--border); color: var(--text-soft); border: 0; font-size: 18px; width: 44px; padding: 13px 0; border-radius: 11px; cursor: pointer; }

.legend { font-size: 11px; color: var(--text-dimmer); margin: 9px 2px 0; }
.legend b { color: var(--text-soft); }

.fieldframe { position: relative; background: linear-gradient(0deg, var(--field-grad-1), var(--field-grad-2)); border: 2px solid var(--accent-soft-border); border-radius: 14px; padding: 12px; }
.field { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.fcell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: var(--fcell-overlay); border: 1px solid var(--accent-soft-border); border-radius: 9px; color: var(--field-text); font-size: 12px; font-weight: 600; padding: 14px 6px; min-height: 64px; cursor: pointer; transition: all .12s; }
.fcell-lbl { letter-spacing: 0.02em; }
.fcell-tally { font-size: 17px; font-weight: 800; color: var(--text); }
.fcell-tally i { color: var(--text-faint); font-style: normal; margin: 0 1px; }
.fcell.cool { background: var(--ok-bg); border-color: var(--ok-border); }
.fcell.cool .fcell-tally { color: var(--ok-text); }
.fcell.hot { background: var(--hot-bg); border-color: var(--hot-border); }
.fcell.hot .fcell-tally { color: var(--hot-text); }
.fcell.sel { border: 2px solid var(--accent); background: var(--sel-bg); color: var(--accent-text); }
.field-tag { text-align: center; font-size: 10px; color: var(--field-tag); letter-spacing: 0.14em; text-transform: uppercase; margin-top: 9px; }

.footer-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.count { font-size: 11px; color: var(--text-dimmer); }

.ghost { background: var(--bg-1); color: var(--text-soft); border: 1px solid var(--border); font-weight: 600; font-size: 13px; padding: 9px 15px; border-radius: 10px; cursor: pointer; }
.ghost:disabled { opacity: 0.4; cursor: default; }
.ghost.sm, .danger.sm { padding: 7px 13px; font-size: 12px; }
.danger { background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); font-weight: 600; border-radius: 10px; cursor: pointer; }

.history { display: flex; flex-direction: column; gap: 11px; }
.backup-bar { display: flex; align-items: center; justify-content: space-between; background: var(--bg-2); border: 1px solid var(--border); border-radius: 13px; padding: 13px 15px; }
.backup-info { display: flex; flex-direction: column; gap: 2px; }
.backup-title { font-size: 13px; font-weight: 700; }
.backup-sub { font-size: 11px; color: var(--text-dimmer); }
.backup-actions { display: flex; gap: 7px; }
.import-btn { display: inline-flex; align-items: center; cursor: pointer; }
.import-err { background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger-text); font-size: 12px; border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.import-err button { background: none; border: 0; color: var(--danger-text); font-size: 16px; cursor: pointer; padding: 0 4px; }
.import-ok { background: var(--ok-bg); border: 1px solid var(--ok-border); color: var(--ok-text); font-size: 12px; border-radius: 10px; padding: 10px 12px; }
.hcard { background: var(--bg-1); border-radius: 14px; padding: 15px; }
.hhead { display: flex; align-items: flex-start; justify-content: space-between; }
.hpos { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 3px; }
.hpct { font-size: 22px; font-weight: 800; color: var(--accent-text); text-align: right; line-height: 1; }
.hpct span { display: block; font-size: 9px; color: var(--text-dimmer); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
.hstats { display: flex; gap: 14px; margin: 11px 0 13px; font-size: 13px; color: var(--text-soft); }
.hactions { display: flex; gap: 8px; }

.stats-view { display: flex; flex-direction: column; }
.stats-filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.period-chips { display: flex; gap: 6px; }
.chip { background: var(--bg-1); border: 1px solid var(--border); color: var(--text-dim); font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 20px; cursor: pointer; }
.chip.on { background: var(--border); color: var(--accent-text); border-color: var(--chip-on-border); }
.name-filter { width: 100%; background: var(--bg-2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; padding: 10px 13px; font-family: inherit; outline: none; }
.name-filter:focus { border-color: var(--accent); }
.name-filter::placeholder { color: var(--field-tag); }
.stats-meta { font-size: 11px; color: var(--text-dimmer); margin: -10px 0 18px 2px; }
.tracker-meta { font-size: 11px; color: var(--text-dimmer); margin: 0 0 14px 2px; }
.pos-section-label { font-size: 13px; font-weight: 700; color: var(--text-soft); margin: 6px 2px 14px; padding-top: 6px; border-top: 1px solid var(--border); }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-end; justify-content: center; z-index: 100; padding: 0 0 24px; }
.modal { background: var(--bg-1); border: 1px solid var(--border); border-radius: 18px; width: calc(100% - 32px); max-width: 480px; max-height: 65vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 13px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.modal-title { font-size: 15px; font-weight: 700; }
.modal-close { background: var(--border); border: 0; color: var(--text-soft); font-size: 20px; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; line-height: 1; }
.modal-empty { padding: 22px 18px; color: var(--text-dimmer); font-size: 13px; margin: 0; }
.modal-list { overflow-y: auto; padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 7px; }
.modal-row { display: flex; align-items: center; gap: 10px; background: var(--bg-2); border-radius: 10px; padding: 10px 12px; }
.modal-time { font-size: 12px; color: var(--text-dimmer); flex: 1; }
.modal-badge { border: 0; font-size: 12px; font-weight: 700; padding: 6px 13px; border-radius: 7px; cursor: pointer; }
.badge-save { background: var(--save-bg); color: #fff; }
.badge-goal { background: var(--goal-bg); color: #fff; }
.modal-del { background: none; border: 1px solid var(--danger-border); color: var(--danger-text); font-size: 14px; font-weight: 700; width: 32px; height: 32px; border-radius: 7px; cursor: pointer; }

/* ---- Attack tracker: half-field shot chart + counters ---- */
.hfield { position: relative; background: linear-gradient(0deg, var(--field-grad-1), var(--field-grad-2)); border: 2px solid var(--accent-soft-border); border-radius: 14px; padding: 12px; }
.cage-line { display: flex; justify-content: center; margin-bottom: 11px; }
.cage-line span { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--field-text); border: 2px solid var(--field-text); border-bottom-width: 4px; border-radius: 3px 3px 0 0; padding: 3px 26px; opacity: 0.75; }
.hshots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.szone { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; background: var(--fcell-overlay); border: 1px solid var(--accent-soft-border); border-radius: 9px; color: var(--field-text); font-size: 12px; font-weight: 600; padding: 14px 6px; min-height: 60px; cursor: pointer; transition: all .12s; }
.szone-lbl { letter-spacing: 0.02em; }
.szone-tally { font-size: 16px; font-weight: 800; color: var(--text); }
.szone-tally i { color: var(--text-faint); font-style: normal; margin: 0 1px; }
.szone.good { background: var(--ok-bg); border-color: var(--ok-border); }
.szone.good .szone-tally { color: var(--ok-text); }
.szone.bad { background: var(--hot-bg); border-color: var(--hot-border); }
.szone.bad .szone-tally { color: var(--hot-text); }
.szone.sel { border: 2px solid var(--accent); background: var(--sel-bg); color: var(--accent-text); }

.shot-goal { flex: 1; background: var(--save-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.shot-save { flex: 1; background: #b5852a; color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.shot-miss { flex: 1; background: var(--border); color: var(--text-soft); border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }

.counters { display: flex; flex-direction: column; gap: 8px; }
.counter-row { display: flex; align-items: center; justify-content: space-between; background: var(--bg-1); border: 1px solid var(--border); border-radius: 12px; padding: 9px 9px 9px 15px; }
.counter-name { font-size: 14px; font-weight: 600; }
.counter-ctl { display: flex; align-items: center; gap: 12px; }
.counter-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-2); color: var(--text); font-size: 20px; font-weight: 700; cursor: pointer; line-height: 1; }
.counter-btn:disabled { opacity: 0.35; cursor: default; }
.counter-val { min-width: 20px; text-align: center; font-size: 19px; font-weight: 800; }

.pen-opt { flex: 1; background: var(--bg-2); border: 1px solid var(--border); color: var(--text); font-weight: 700; font-size: 15px; padding: 13px 6px; border-radius: 11px; cursor: pointer; }

/* ---- Basketball half-court shot chart ---- */
.court { position: relative; width: 100%; aspect-ratio: 500 / 470; background: linear-gradient(0deg, var(--field-grad-1), var(--field-grad-2)); border: 2px solid var(--accent-soft-border); border-radius: 14px; overflow: hidden; cursor: crosshair; }
.court-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.court-svg line, .court-svg path, .court-svg rect, .court-svg circle.court-mark { fill: none; stroke: var(--field-text); stroke-width: 2; opacity: 0.55; }
.court-svg rect.paint { fill: var(--fcell-overlay); }
.court-svg .dot-made { fill: #3ddc84; stroke: rgba(0,0,0,0.6); stroke-width: 1.5; }
.court-svg .dot-miss { fill: #ff5a5f; stroke: rgba(0,0,0,0.6); stroke-width: 1.5; }
.court-svg .dot-pending { fill: none; stroke: var(--accent); stroke-width: 3; }
.made { flex: 1; background: var(--save-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }
.missed { flex: 1; background: var(--goal-bg); color: #fff; border: 0; font-weight: 700; font-size: 15px; padding: 13px; border-radius: 11px; cursor: pointer; }

.badge-att-goal { background: var(--save-bg); color: #fff; }
.badge-att-save { background: #b5852a; color: #fff; }
.badge-att-miss { background: var(--border); color: var(--text-soft); }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
