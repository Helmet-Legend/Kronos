// Comparateur de munitions : jusqu'à 4 munitions (les vôtres ou le catalogue) dans les mêmes conditions.
import { h, fill } from './dom.js';
import { num, int } from './format.js';
import { app, metForCalc, M } from '../app.js';
import { frame, catalogPicker, catalogPreset } from './sheets.js';
import { compareLoads, COMPARE_DISTS, MAX_COMPARE } from '../engine/compare.js';
import { AMMO } from '../data/catalog.js';

const COLORS = ['var(--amber)', 'var(--cyan)', 'var(--violet)', 'var(--fg)'];
const DASH = [null, '7 4', '2 4', '10 3 2 3'];

/** Courbes d'élévation (mrad) en fonction de la distance. */
function chart(results, maxD) {
  const W = 340, H = 170, PX = (d) => 34 + d / maxD * (W - 44), ys = [];
  results.forEach((r) => r.rows.forEach((x) => { if (x.reached && x.d <= maxD) ys.push(x.elMrad); }));
  const yMax = Math.max(1, ...ys), PY = (y) => 10 + y / yMax * (H - 36);
  const grid = [];
  for (let d = 200; d <= maxD; d += 200) grid.push(h('line', { x1: String(PX(d)), y1: '10', x2: String(PX(d)), y2: String(H - 26), stroke: 'var(--border)' }), h('text', { x: String(PX(d)), y: String(H - 12), fill: 'var(--muted)', 'font-size': '10', 'text-anchor': d === maxD ? 'end' : 'middle' }, d + ' m'));
  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Élévation en mrad selon la distance' },
    grid,
    h('text', { x: '2', y: '14', fill: 'var(--muted)', 'font-size': '10' }, '0'),
    h('text', { x: '2', y: String(H - 26), fill: 'var(--muted)', 'font-size': '10' }, num(yMax, 0)),
    h('text', { x: '2', y: String(H - 4), fill: 'var(--muted)', 'font-size': '10' }, 'mrad'),
    results.map((r, i) => {
      const pts = [[0, 0]].concat(r.rows.filter((x) => x.reached && x.d <= maxD).map((x) => [x.d, Math.max(0, x.elMrad)]));
      return h('path', { d: pts.map((p, k) => (k ? 'L' : 'M') + PX(p[0]).toFixed(1) + ' ' + PY(p[1]).toFixed(1)).join(' '), fill: 'none', stroke: COLORS[i], 'stroke-width': '2.5', 'stroke-dasharray': DASH[i] });
    }));
}

export function compareSheet() {
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
  const s0 = app.state, g0 = M.activeGun(s0);
  const st = { picks: [{ kind: 'mine', gunId: g0.id, loadId: M.activeLoad(g0).id }], zero: 100, wind: 4, maxD: 1000, add: null };
  const key = (p) => p.kind === 'mine' ? 'm:' + p.loadId : 'c:' + p.id;
  const toggle = (p) => {
    const i = st.picks.findIndex((x) => key(x) === key(p));
    if (i >= 0) st.picks.splice(i, 1); else if (st.picks.length < MAX_COMPARE) st.picks.push(p);
    draw();
  };
  const resolve = (p) => {
    if (p.kind === 'cat') { const a = AMMO.find((x) => x.id === p.id); return a && { ...catalogPreset(a), short: a.cal, verify: a.verify }; }
    const g = app.state.guns.find((x) => x.id === p.gunId), l = g && g.loads.find((x) => x.id === p.loadId);
    return l && { name: l.name, bc: l.bc, model: l.model, v0: l.v0 + (l.sens || 0) * ((app.state.met.t ?? 15) - (l.refTemp ?? 15)), grains: l.grains, short: l.name, mine: g.name };
  };
  const picker = catalogPicker((a) => toggle({ kind: 'cat', id: a.id }), { selected: (a) => st.picks.some((x) => x.kind === 'cat' && x.id === a.id) });

  function draw() {
    const s = app.state, met = metForCalc(s);
    const loads = st.picks.map(resolve).filter(Boolean);
    const res = loads.length ? compareLoads(loads, { met, zero: st.zero, sightH: 0.045, windSpeed: st.wind, distances: COMPARE_DISTS.filter((d) => d <= st.maxD) }) : [];
    const seg = (label, val, opts, set) => h('div', { class: 'row', style: { flexWrap: 'wrap' } }, h('span', { class: 'label', style: { minWidth: '64px' } }, label),
      opts.map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': String(val === v), onClick: () => { set(v); draw(); } }, l)));
    const mine = [];
    for (const g of s.guns) for (const l of g.loads) mine.push({ g, l });
    const head = h('tr', null, h('th', { scope: 'col' }, ''), res.map((r, i) => h('th', { scope: 'col', style: { color: COLORS[i] } }, (loads[i].short || r.name))));
    // cellule sur deux lignes : valeur principale, puis complément discret
    const cell = (a, b) => [h('span', null, a), b ? h('small', null, b) : null];
    const row = (label, f, cls) => h('tr', { class: cls || null }, h('th', { scope: 'row' }, label), res.map((r, i) => h('td', { class: 'mono' }, f(r, i))));
    const rows = [
      row('V0', (r) => int(r.v0) + ' m/s'),
      row('Énergie', (r) => r.e0 ? int(r.e0) + ' J' : '—'),
      row('Mach 1,2', (r) => r.superRange === null ? 'dès la bouche' : (r.superMax ? '> ' : '≈ ') + r.superRange + ' m')
    ];
    for (const d of COMPARE_DISTS.filter((x) => x <= st.maxD)) {
      rows.push(h('tr', { class: 'sub' }, h('th', { scope: 'rowgroup', colspan: String(res.length + 1) }, d + ' m')));
      const at = (r) => r.rows.find((x) => x.d === d);
      rows.push(row('Élévation', (r) => { const x = at(r); return x && x.reached ? cell(num(x.elMrad, 1) + ' mrad', 'chute ' + num(x.dropCm, 0) + ' cm') : 'hors portée'; }));
      if (st.wind) rows.push(row('Vent', (r) => { const x = at(r); return x && x.reached ? cell(num(x.windMrad, 1) + ' mrad', num(x.windCm, 0) + ' cm') : '—'; }));
      rows.push(row('Énergie', (r) => { const x = at(r); return x && x.reached && x.e ? int(x.e) + ' J' : '—'; }));
    }
    fill(body,
      h('div', { class: 'chips' }, st.picks.map((p, i) => { const l = resolve(p); return l ? h('button', { class: 'chip pick', style: { borderColor: COLORS[i] }, 'aria-label': 'Retirer ' + l.name, onClick: () => toggle(p) }, h('span', { class: 'dot', style: { background: COLORS[i] } }), l.name + ' ×') : null; }),
        st.picks.length < MAX_COMPARE ? h('span', { class: 'muted', style: { fontSize: '12px', alignSelf: 'center' } }, 'jusqu’à ' + MAX_COMPARE + ' munitions') : null),
      seg('Zéro', st.zero, [[100, '100 m'], [200, '200 m'], [300, '300 m']], (v) => { st.zero = v; }),
      seg('Vent', st.wind, [[0, 'aucun'], [2, '2 m/s'], [4, '4 m/s'], [6, '6 m/s']], (v) => { st.wind = v; }),
      seg('Jusqu’à', st.maxD, [[600, '600 m'], [1000, '1 000 m']], (v) => { st.maxD = v; }),
      h('div', { class: 'muted', style: { fontSize: '12px', lineHeight: '1.45' } }, 'Mêmes conditions pour toutes : hausse 4,5 cm, météo de l’écran Tir (' + num(s.met.t, 0) + ' °C), vent plein travers, pas de dérive gyroscopique. Vos munitions gardent leur V0 corrigée de la température.'),
      res.length ? h('div', { class: 'card' }, chart(res, st.maxD)) : h('p', { class: 'muted', style: { margin: '0' } }, 'Ajoutez des munitions ci-dessous.'),
      res.length ? h('div', { class: 'card', style: { padding: '4px 6px', overflowX: 'auto' } }, h('table', { class: 'ctable' }, h('thead', null, head), h('tbody', null, rows))) : null,
      loads.some((l) => l.verify) ? h('div', { class: 'notice' }, 'Certaines fiches du catalogue sont à vérifier : les résultats dépendent du BC et de la V0 saisis.') : null,
      h('h2', null, 'Mes munitions'),
      mine.map(({ g, l }) => { const p = { kind: 'mine', gunId: g.id, loadId: l.id }, on = st.picks.some((x) => key(x) === key(p));
        return h('button', { class: 'item' + (on ? ' on' : ''), 'aria-pressed': String(on), onClick: () => toggle(p) }, h('span', { class: 'grow' }, h('b', null, l.name), h('small', null, g.name + ' · ' + l.model + ' ' + num(l.bc, 3) + ' · ' + int(l.v0) + ' m/s'))); }),
      h('h2', null, 'Catalogue'),
      picker);
    picker.refresh();
  }
  draw();
  return frame('Comparer des munitions', body);
}
