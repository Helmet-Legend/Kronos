// Table de tir du profil actif, avec les conditions et le vent du moment.
import { h } from './dom.js';
import { num, abs, int } from './format.js';
import { app, set, compute } from '../app.js';
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

  const chip = (label, on, fn) => h('button', { class: 'chip', 'aria-pressed': String(on), onClick: fn }, label);
  return h('main', { class: 'table' },
    h('div', { class: 'card' },
      h('div', { style: { fontWeight: '700' } }, gun.name + ' · ' + load.name),
      h('div', { class: 'muted', style: { fontSize: '13px', marginTop: '4px' } },
        'Zéro ' + gun.zero + ' m · V0 ' + int(res.v0) + ' m/s · ' + num(s.met.t, 0) + ' °C, ' + int(s.met.p) + ' hPa · vent ' + num(s.shot.windSpeed, 1) + ' m/s de ' + s.shot.windHour + ' h' + (s.shot.angleDeg ? ' · angle ' + s.shot.angleDeg + '°' : ''))),
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
