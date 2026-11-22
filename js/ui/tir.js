// Écran Tir : corrections pour la distance et le vent du moment.
import { h } from './dom.js';
import { num, abs, int, timeFr, parseNum } from './format.js';
import { app, set, compute, openSheet, ui } from '../app.js';
import { meteoSheet, shotsSheet } from './sheets.js';
import { sessionSheet, coldAdvice } from './carnet.js';

const setShot = (o) => set((s) => ({ ...s, shot: { ...s.shot, ...o } }));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function renderTir() {
  const s = app.state, sh = s.shot;
  const { gun, load, res } = compute(s, [sh.dist]);
  const r = res.rows[0];
  const scope = gun.sight.kind === 'scope';
  const unit = scope ? gun.sight.unit : 'mrad';
  const m = s.met;

  const metPill = h('button', { class: 'pill', onClick: () => openSheet('meteo', meteoSheet), 'aria-label': 'Météo : modifier ou mettre à jour' },
    h('span', { class: 'dot' + (m.source === 'auto' ? '' : ' manual') }),
    h('span', { class: 'grow mono' }, num(m.t, 0) + ' °C · ' + int(m.p) + ' hPa' + (m.pMode === 'qnh' ? ' (QNH)' : '') + ' · ' + int(m.rh) + ' %'),
    h('small', { class: 'muted' }, m.source === 'auto' ? 'auto ' + timeFr(m.at) : 'manuel'));

  let hero;
  if (!r || !r.reached) {
    hero = h('div', { class: 'notice c-hero' }, 'Distance hors de portée pour cette munition.');
  } else if (scope) {
    const elDir = r.elMrad >= 0 ? 'HAUT' : 'BAS', wdDir = r.wdMrad >= 0 ? 'DROITE' : 'GAUCHE';
    const alt = (mr) => (unit === 'MOA' ? num(Math.abs(mr), 2) + ' mrad' : num(Math.abs(mr) / 0.290888, 1) + ' MOA');
    hero = h('div', { class: 'hero c-hero' },
      h('section', { class: 'corr', 'aria-label': 'Élévation' },
        h('span', { class: 'label' }, 'Élévation'),
        h('span', { class: 'val mono' }, abs(r.el, unit === 'MOA' ? 1 : 1), h('small', null, ' ' + unit)),
        h('span', { class: 'clk mono' }, Math.abs(r.elClicks) + ' clics ' + elDir),
        h('span', { class: 'alt' }, alt(r.elMrad) + ' · chute ' + abs(r.dropM * 100, 0) + ' cm')),
      h('section', { class: 'corr wd', 'aria-label': 'Dérive' },
        h('span', { class: 'label' }, 'Dérive'),
        h('span', { class: 'val mono' }, abs(r.wd, 1), h('small', null, ' ' + unit)),
        h('span', { class: 'clk mono' }, Math.abs(r.wdClicks) + ' clics ' + wdDir),
        h('span', { class: 'alt' }, 'vent ' + abs(r.windM * 100, 0) + ' cm' + (res.spinKnown ? ' · gyro ' + abs(r.spinM * 100, 0) + ' cm' : ' · pas inconnu'))));
  } else {
    const up = -r.dropM * 100, side = -r.driftM * 100;
    hero = h('div', { class: 'hero c-hero' },
      h('section', { class: 'corr' },
        h('span', { class: 'label' }, 'Tenue verticale'),
        h('span', { class: 'val mono' }, abs(up, 0), h('small', null, ' cm')),
        h('span', { class: 'clk' }, Math.abs(up) < 1 ? 'au point' : 'viser ' + (up > 0 ? 'HAUT' : 'BAS')),
        h('span', { class: 'alt' }, 'avec le zéro à ' + gun.zero + ' m')),
      h('section', { class: 'corr wd' },
        h('span', { class: 'label' }, 'Tenue latérale'),
        h('span', { class: 'val mono' }, abs(side, 0), h('small', null, ' cm')),
        h('span', { class: 'clk' }, Math.abs(side) < 1 ? 'au point' : 'viser à ' + (side > 0 ? 'DROITE' : 'GAUCHE')),
        h('span', { class: 'alt' }, 'vent ' + abs(r.windM * 100, 0) + ' cm')));
  }

  const regime = r && r.reached ? r.regime : 'super';
  const stats = r && r.reached ? h('div', { class: 'grid4 c-stats' },
    h('div', { class: 'stat' }, h('span', null, 'Vitesse'), h('b', { class: 'mono' }, int(r.v)), h('span', { class: 'muted', style: { fontSize: '11px' } }, 'm/s')),
    h('div', { class: 'stat' }, h('span', null, 'Énergie'), h('b', { class: 'mono' }, r.energy ? int(r.energy) : '—'), h('span', { class: 'muted', style: { fontSize: '11px' } }, 'J')),
    h('div', { class: 'stat' }, h('span', null, 'Vol'), h('b', { class: 'mono' }, num(r.t, 2)), h('span', { class: 'muted', style: { fontSize: '11px' } }, 's')),
    h('div', { class: 'stat' + (regime === 'trans' ? ' warn' : regime === 'sub' ? ' bad' : '') }, h('span', null, 'Mach'), h('b', { class: 'mono' }, num(r.mach, 2)), h('span', { class: 'muted', style: { fontSize: '11px' } }, regime === 'super' ? 'supersonique' : regime === 'trans' ? 'transsonique' : 'subsonique'))) : null;

  const distInput = h('input', { class: 'dist-val mono', type: 'number', inputmode: 'numeric', min: '10', max: '2500', step: '10', value: String(sh.dist), 'aria-label': 'Distance en mètres',
    onChange: (e) => { const v = parseNum(e.target.value); if (isFinite(v)) setShot({ dist: clamp(Math.round(v), 10, 2500) }); } });
  const dist = h('section', { class: 'card c-dist' },
    h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Distance (m)'), h('span', { class: 'muted', style: { fontSize: '12px' } }, 'touchez le chiffre pour saisir')),
    distInput,
    h('div', { class: 'grid4' }, [-50, -10, 10, 50].map((d) => h('button', { class: 'step mono', onClick: () => setShot({ dist: clamp(sh.dist + d, 10, 2500) }), 'aria-label': (d > 0 ? 'Plus ' : 'Moins ') + Math.abs(d) + ' mètres' }, (d > 0 ? '+' : '−') + Math.abs(d)))));

  const hours = [];
  for (let k = 1; k <= 12; k++) {
    const a = k * Math.PI / 6;
    hours.push(h('button', { class: 'h mono', style: { left: (118 + 96 * Math.sin(a) - 22) + 'px', top: (118 - 96 * Math.cos(a) - 22) + 'px' }, 'aria-pressed': String(sh.windHour === k), 'aria-label': 'Vent venant de ' + k + ' heures', onClick: () => setShot({ windHour: k }) }, String(k)));
  }
  const rot = sh.windHour * 30;
  const wind = h('section', { class: 'card c-wind' },
    h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Vent'), h('span', { class: 'muted', style: { fontSize: '12px' } }, 'd’où il vient')),
    h('div', { class: 'clock' },
      h('svg', { viewBox: '0 0 236 236', width: '236', height: '236', 'aria-hidden': 'true' },
        h('circle', { cx: '118', cy: '118', r: '96', fill: 'none', stroke: 'var(--border)', 'stroke-width': '1.5' }),
        h('circle', { cx: '118', cy: '118', r: '40', fill: 'var(--panel2)' }),
        h('g', { transform: 'rotate(' + rot + ' 118 118)' },
          h('line', { x1: '118', y1: '50', x2: '118', y2: '66', stroke: 'var(--amber)', 'stroke-width': '4', 'stroke-linecap': 'round' }),
          h('polygon', { points: '118,76 110,63 126,63', fill: 'var(--amber)' }))),
      hours,
      h('div', { class: 'center' }, h('b', { class: 'mono' }, num(sh.windSpeed, 1)), h('span', { class: 'muted', style: { fontSize: '12px' } }, 'm/s'))),
    h('div', { class: 'grid4' },
      h('button', { class: 'step mono', onClick: () => setShot({ windSpeed: clamp(Math.round((sh.windSpeed - 1) * 10) / 10, 0, 30) }), 'aria-label': 'Moins 1 m/s' }, '−1'),
      h('button', { class: 'step mono', onClick: () => setShot({ windSpeed: clamp(Math.round((sh.windSpeed - 0.5) * 10) / 10, 0, 30) }), 'aria-label': 'Moins 0,5 m/s' }, '−0,5'),
      h('button', { class: 'step mono', onClick: () => setShot({ windSpeed: clamp(Math.round((sh.windSpeed + 0.5) * 10) / 10, 0, 30) }), 'aria-label': 'Plus 0,5 m/s' }, '+0,5'),
      h('button', { class: 'step mono', onClick: () => setShot({ windSpeed: clamp(Math.round((sh.windSpeed + 1) * 10) / 10, 0, 30) }), 'aria-label': 'Plus 1 m/s' }, '+1')));

  const angle = h('section', { class: 'card row c-angle' },
    h('div', { class: 'grow' }, h('span', { class: 'label' }, 'Angle de tir'), h('div', { class: 'mono', style: { fontSize: '20px', fontWeight: '700' } }, (sh.angleDeg > 0 ? '+' : '') + num(sh.angleDeg, 0) + '°')),
    h('button', { class: 'step', onClick: () => setShot({ angleDeg: clamp(sh.angleDeg - 5, -60, 60) }), 'aria-label': 'Angle moins 5 degrés' }, '−5°'),
    h('button', { class: 'step', onClick: () => setShot({ angleDeg: clamp(sh.angleDeg + 5, -60, 60) }), 'aria-label': 'Angle plus 5 degrés' }, '+5°'));

  const notes = [];
  if (r && r.reached && regime !== 'super') notes.push(h('div', { class: 'notice' }, regime === 'trans' ? 'Zone transsonique : la balle ralentit vers Mach 1, la précision du calcul baisse. Recalez sur vos impacts.' : 'Balle subsonique : calcul indicatif.'));
  const v0Trued = (load.trueLog || []).some((e) => e.param === 'v0' && !e.undone);
  if (!load.measured && !v0Trued) notes.push(h('div', { class: 'notice info' }, 'V0 non mesurée (' + int(load.v0) + ' m/s annoncés) : au-delà de 300 m, mesurez-la au chrono ou recalez-la sur une séance.'));

  const cold = coldAdvice(gun, sh.dist);
  if (cold && cold.tir) notes.unshift(h('div', { class: 'notice info' }, h('b', { style: { color: 'var(--violet)' } }, 'Coup à froid · '), cold.tir + ' (' + cold.n + ' séances)'));

  const actions = h('div', { class: 'grid3 c-actions' },
    h('button', { class: 'btn', 'aria-label': 'Table de tir', onClick: () => ui({ view: 'table' }) }, h('span', { class: 'lg' }, 'Table de tir'), h('span', { class: 'sm' }, 'Table')),
    h('button', { class: 'btn', 'aria-label': 'Saisir une séance', style: { borderColor: 'var(--amber)', color: 'var(--amber)' }, onClick: () => openSheet('session', sessionSheet) }, h('span', { class: 'lg' }, 'Saisir une séance'), h('span', { class: 'sm' }, 'Séance')),
    h('button', { class: 'btn', 'aria-label': 'Compter des coups', onClick: () => openSheet('shots', shotsSheet) }, h('span', { class: 'lg' }, 'Compter des coups'), h('span', { class: 'sm' }, 'Coups')));

  return h('main', { class: 'tir' }, metPill, hero, stats, dist, wind, angle, notes.length ? h('div', { class: 'c-notes', style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, notes) : null, actions);
}
