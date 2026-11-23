// Table de tir du profil actif, avec les conditions et le vent du moment.
import { h } from './dom.js';
import { num, abs, int } from './format.js';
import { app, set, compute, cranInfo, openSheet } from '../app.js';
import { solve } from '../engine/solver.js';
import { tipCard } from './aide.js';
import { compareSheet } from './compare.js';
import { cranAnglesCached, cranTable } from '../engine/tangent.js';

const setSettings = (o) => set((s) => ({ ...s, settings: { ...s.settings, ...o } }));

export function renderTable() {
  const s = app.state, st = s.settings;
  const ds = [];
  for (let d = st.tableFrom; d <= st.tableTo; d += st.tableStep) ds.push(d);
  const { gun, load, res, args } = compute(s, ds);
  const scope = gun.sight.kind === 'scope';
  const tg = !scope && gun.sight.tangent ? cranTable(args, cranAnglesCached(args, gun.sight.tangent), ds) : null;
  const unit = scope ? gun.sight.unit : '';
  const near = ds.reduce((b, d) => (Math.abs(d - s.shot.dist) < Math.abs(b - s.shot.dist) ? d : b), ds[0]);
  const dirV = (v) => (v >= 0 ? '↑' : '↓'), dirH = (v) => (v >= 0 ? '→' : '←');

  const head = scope
    ? ['m', 'Élév. ' + unit, 'clics', 'Dérive ' + unit, 'clics', 'cm', 'm/s', 's']
    : tg ? ['m', 'Cran', 'Viser cm', 'Latéral cm', 'm/s', 's'] : ['m', 'Viser cm', '', 'Latéral cm', '', 'chute cm', 'm/s', 's'];

  const rows = tg ? tg.map((b, i) => {
    const d = ds[i];
    if (!b) return h('tr', null, h('td', null, String(d)), h('td', { colspan: '5', class: 'muted' }, 'hors de portée'));
    const r = b.row;
    const cls = [d === near ? 'cur' : '', r.regime === 'trans' ? 'trans' : r.regime === 'sub' ? 'sub' : ''].join(' ').trim();
    return h('tr', { class: cls || null },
      h('td', { class: 'mono' }, String(d)),
      h('td', { class: 'mono' }, String(b.cran) + (b.st === 'meas' ? ' ✓' : '')),
      h('td', { class: 'mono el' }, Math.abs(r.dropM) < 0.005 ? '0' : abs(r.dropM * 100, 0) + ' ' + (r.dropM <= 0 ? '↑' : '↓')),
      h('td', { class: 'mono wd' }, abs(r.driftM * 100, 0) + ' ' + (r.driftM <= 0 ? '→' : '←')),
      h('td', { class: 'mono' }, int(r.v)),
      h('td', { class: 'mono' }, num(r.t, 2)));
  }) : res.rows.map((r) => {
    if (!r.reached) return h('tr', null, h('td', null, String(r.d)), h('td', { colspan: '7', class: 'muted' }, 'hors de portée'));
    const cls = [r.d === near ? 'cur' : '', r.regime === 'trans' ? 'trans' : r.regime === 'sub' ? 'sub' : ''].join(' ').trim();
    return scope
      ? h('tr', { class: cls || null },
        h('td', { class: 'mono' }, String(r.d)),
        h('td', { class: 'mono el' }, abs(r.el, 1) + ' ' + dirV(r.elMrad)),
        h('td', { class: 'mono el' }, String(Math.abs(r.elClicks))),
        h('td', { class: 'mono wd' }, abs(r.wd, 1) + ' ' + dirH(r.wdMrad)),
        h('td', { class: 'mono wd' }, String(Math.abs(r.wdClicks))),
        h('td', { class: 'mono' }, abs(r.dropM * 100, 0)),
        h('td', { class: 'mono' }, int(r.v)),
        h('td', { class: 'mono' }, num(r.t, 2)))
      : h('tr', { class: cls || null },
        h('td', { class: 'mono' }, String(r.d)),
        h('td', { class: 'mono el' }, abs(r.dropM * 100, 0) + ' ' + (r.dropM <= 0 ? '↑' : '↓')),
        h('td', null, ''),
        h('td', { class: 'mono wd' }, abs(r.driftM * 100, 0) + ' ' + (r.driftM <= 0 ? '→' : '←')),
        h('td', null, ''),
        h('td', { class: 'mono' }, abs(r.dropM * 100, 0)),
        h('td', { class: 'mono' }, int(r.v)),
        h('td', { class: 'mono' }, num(r.t, 2)));
  });

  const profile = profileCard(s, gun, args);
  const chip = (label, on, fn) => h('button', { class: 'chip', 'aria-pressed': String(on), onClick: fn }, label);
  return h('main', { class: 'table' },
    tipCard(['table']),
    h('div', { class: 'card' },
      h('div', { style: { fontWeight: '700' } }, gun.name + ' · ' + load.name),
      h('div', { class: 'muted', style: { fontSize: '13px', marginTop: '4px' } },
        'Zéro ' + gun.zero + ' m · V0 ' + int(res.v0) + ' m/s · ' + num(s.met.t, 0) + ' °C, ' + int(s.met.p) + ' hPa · vent ' + num(s.shot.windSpeed, 1) + ' m/s de ' + s.shot.windHour + ' h' + (s.shot.angleDeg ? ' · angle ' + s.shot.angleDeg + '°' : ''))),
    profile,
    h('button', { class: 'btn block', onClick: () => openSheet('compare', compareSheet) }, 'Comparer des munitions'),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Pas de la table' },
      [25, 50, 100].map((p) => chip('pas ' + p + ' m', st.tableStep === p, () => setSettings({ tableStep: p, tableFrom: p === 25 ? 25 : 100 }))),
      [600, 1000, 1500].map((p) => chip('→ ' + p + ' m', st.tableTo === p, () => setSettings({ tableTo: p })))),
    h('div', { class: 'card', style: { padding: '4px 6px', overflowX: 'auto' } },
      h('table', { class: 'ttable' },
        h('thead', null, h('tr', null, head.map((x) => h('th', { scope: 'col' }, x)))),
        h('tbody', null, rows))),
    h('p', { class: 'muted', style: { fontSize: '12px', margin: '0 2px', lineHeight: '1.5' } },
      'Ligne surlignée : distance de l’écran Tir. Repère orange : transsonique (Mach 1 à 1,2) ; rouge : subsonique. ' + (scope ? 'Flèches : sens de la correction à la tourelle.' : tg ? 'Cran conseillé pour chaque distance et tenue restante (flèche : où viser). ✓ : cran mesuré au tir.' : 'Flèches : où viser par rapport au centre.')));
}

/** Profil de la trajectoire par rapport à la ligne de visée, tous les 25 m, avec le passage sous Mach 1,2. */
function profileCard(s, gun, args) {
  const maxD = Math.min(1500, Math.max(800, Math.ceil(s.shot.dist / 100) * 100));
  const marks = []; for (let x = 25; x <= maxD; x += 25) marks.push(x);
  const ci = cranInfo(s, args, gun, s.shot.dist);
  const res = solve({ ...args, ...(ci && ci.alpha !== null ? { alpha: ci.alpha } : {}), shot: { ...s.shot, windSpeed: 0 }, distances: marks });
  const pts = [[0, -gun.sightH * 100]].concat(res.rows.filter((r) => r.reached).map((r) => [r.d, r.dropM * 100]));
  if (pts.length < 3) return null;
  const ys = pts.map((p) => p[1]).concat([0]);
  const yMax = Math.max(...ys), yMin = Math.min(...ys), span = Math.max(1, yMax - yMin);
  const W = 340, H = 150, PX = (x) => 30 + x / maxD * (W - 40), PY = (y) => 12 + (yMax - y) / span * (H - 36);
  let apex = pts[0]; for (const p of pts) if (p[1] > apex[1]) apex = p;
  const trans = res.rows.find((r) => r.reached && r.mach < 1.2);
  const dist = res.rows.find((r) => r.d >= s.shot.dist);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + PX(p[0]).toFixed(1) + ' ' + PY(p[1]).toFixed(1)).join(' ');
  return h('section', { class: 'card' },
    h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Profil de la trajectoire'), h('span', { class: 'muted', style: { fontSize: '12px' } }, ci ? 'cran ' + ci.used + ' m' : 'zéro ' + gun.zero + ' m')),
    h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Trajectoire jusqu’à ' + maxD + ' m' },
      h('line', { x1: String(PX(0)), y1: String(PY(0)), x2: String(PX(maxD)), y2: String(PY(0)), stroke: 'var(--border)', 'stroke-dasharray': '4 4' }),
      h('text', { x: String(PX(maxD)), y: String(PY(0) - 4), fill: 'var(--muted)', 'font-size': '10', 'text-anchor': 'end' }, 'ligne de visée'),
      h('text', { x: '2', y: String(PY(yMax) + 4), fill: 'var(--muted)', 'font-size': '10' }, (yMax > 0 ? '+' : '') + num(yMax, Math.abs(yMax) < 10 ? 1 : 0)),
      h('text', { x: '2', y: String(PY(yMin)), fill: 'var(--muted)', 'font-size': '10' }, num(yMin, Math.abs(yMin) < 10 ? 1 : 0)),
      h('text', { x: String(PX(maxD)), y: String(H - 4), fill: 'var(--muted)', 'font-size': '10', 'text-anchor': 'end' }, maxD + ' m'),
      h('text', { x: String(PX(0)), y: String(H - 4), fill: 'var(--muted)', 'font-size': '10' }, 'cm'),
      dist ? h('line', { x1: String(PX(dist.d)), y1: '8', x2: String(PX(dist.d)), y2: String(H - 22), stroke: 'var(--cyan)', 'stroke-width': '1.5' }) : null,
      h('path', { d: path, fill: 'none', stroke: 'var(--amber)', 'stroke-width': '2.5', 'stroke-linejoin': 'round' }),
      trans ? h('circle', { cx: String(PX(trans.d)), cy: String(PY(trans.dropM * 100)), r: '5', fill: 'var(--red)' }) : null),
    h('div', { class: 'muted', style: { fontSize: '12px', lineHeight: '1.45' } },
      'Flèche maximale ' + (apex[1] > 0 ? '+' : '') + num(apex[1], 1) + ' cm à ' + apex[0] + ' m · ' + (trans ? 'passage sous Mach 1,2 vers ' + trans.d + ' m (point rouge)' : 'supersonique jusqu’à ' + maxD + ' m') + ' · trait bleu : distance de l’écran Tir.'));
}
