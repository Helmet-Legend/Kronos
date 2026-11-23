// Hausse graduée : tableau des crans et étalonnage d'un cran au tir.
import { h, fill } from './dom.js';
import { num, dateFr } from './format.js';
import { app, set, openSheet, toast, metForCalc, M } from '../app.js';
import { frame } from './sheets.js';
import { cranAnglesCached, calibrateCran, cranTable } from '../engine/tangent.js';
import { sessionStats } from './carnet.js';

const ST = { meas: ['MESURÉ', 'var(--cyan)'], adj: ['AJUSTÉ', 'var(--amber)'], calc: ['CALCULÉ', 'var(--muted)'] };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function argsFor(s, gun, met) {
  return { gun: { sightH: gun.sightH, zero: gun.zero, twist: gun.twist, twistDir: gun.twistDir }, sight: gun.sight, load: M.activeLoad(gun), met: met || metForCalc(s), shot: { windSpeed: 0, windHour: 12, angleDeg: 0 } };
}

/** Carte « Hausse graduée » de la fiche d'arme. */
export function hausseCard(g) {
  const s = app.state, t = g.sight.tangent;
  const A = cranAnglesCached(argsFor(s, g), t);
  const nMeas = [...A.values()].filter((a) => a.st === 'meas').length;
  return h('section', { class: 'card' },
    h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Hausse graduée · ' + t.min + ' à ' + t.max + ' m'), h('span', { class: 'muted', style: { fontSize: '12px' } }, nMeas ? nMeas + ' cran' + (nMeas > 1 ? 's' : '') + ' mesuré' + (nMeas > 1 ? 's' : '') : 'aucun cran mesuré')),
    h('p', { class: 'muted', style: { fontSize: '12px', margin: '6px 0', lineHeight: '1.45' } }, 'Chaque cran mesuré au tir corrige aussi les crans voisins (ajustés). Les autres restent calculés pour ' + M.activeLoad(g).name + '.'),
    h('div', { class: 'crans' }, [...A.entries()].map(([c, a]) => h('div', { class: 'kv' },
      h('span', { class: 'mono', style: { color: 'var(--fg)', fontWeight: '700' } }, c + ' m'),
      h('span', { class: 'mono muted' }, num(a.alpha * 1000, 2) + ' mrad'),
      h('span', { class: 'tag', style: { color: ST[a.st][1] } }, ST[a.st][0])))),
    h('button', { class: 'btn block', style: { marginTop: '10px' }, onClick: () => { if (s.gunId !== g.id) set((x) => ({ ...x, gunId: g.id })); openSheet('calib', () => calibSheet()); } }, 'Étalonner un cran'));
}

/** Panneau d'étalonnage : cran, distance, écart mesuré du point moyen. */
export function calibSheet() {
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
  const s0 = app.state, g0 = M.activeGun(s0);
  const A0 = cranAnglesCached(argsFor(s0, g0), g0.sight.tangent);
  const rec = cranTable(argsFor(s0, g0), A0, [s0.shot.dist])[0];
  const st = { cran: s0.shot.cran || (rec ? rec.cran : g0.sight.tangent.min), dist: s0.shot.dist, offCm: 0, sessionId: null, met: null };

  function draw() {
    const s = app.state, gun = M.activeGun(s), t = gun.sight.tangent;
    if (!t) { fill(body, h('p', null, 'Cette arme n’a pas de hausse graduée.')); return; }
    const args = argsFor(s, gun, st.met);
    const A = cranAnglesCached(argsFor(s, gun), t);
    const list = [...A.keys()];
    if (!A.has(st.cran)) st.cran = list[0];
    const a = A.get(st.cran);
    const cal = calibrateCran(args, a.alpha, st.dist, st.offCm / 100);
    const sessions = (gun.sessions || []).filter((x) => x.loadId === M.activeLoad(gun).id).slice(-4).reverse();
    const i = list.indexOf(st.cran);
    const meas = t.crans || {};
    const save = () => {
      if (!cal) { toast('Distance hors de portée'); return; }
      set((x) => M.replaceGun(x, M.setCranAngle(M.activeGun(x), st.cran, { mrad: cal.mrad, dist: st.dist, offCm: st.offCm })));
      toast('Cran ' + st.cran + ' m étalonné : angle réel enregistré');
      draw();
    };
    fill(body, 
      h('p', { style: { margin: '0', fontSize: '14px', lineHeight: '1.5' } }, '1. Réglez le cran et tirez au moins 5 coups en visant le même point (plein centre). 2. Indiquez l’écart vertical du point moyen. 3. Enregistrez : Kronos calcule l’angle réel du cran.'),
      sessions.length ? h('div', null, h('span', { class: 'label' }, 'Reprendre une séance du carnet'),
        h('div', { class: 'chips', style: { marginTop: '6px' } }, sessions.map((x) => {
          const gs = sessionStats(x);
          return h('button', { class: 'chip', 'aria-pressed': String(st.sessionId === x.id), onClick: () => { st.sessionId = x.id; st.dist = x.dist; st.offCm = Math.round(gs.my) / 10; st.met = x.met; draw(); } }, dateFr(x.d).slice(0, 5) + ' · ' + x.dist + ' m · ' + (gs.my > 0 ? '+' : '') + num(gs.my / 10, 1) + ' cm');
        }))) : null,
      stepper('Cran utilisé', st.cran + ' m', i > 0 ? () => { st.cran = list[i - 1]; draw(); } : null, i < list.length - 1 ? () => { st.cran = list[i + 1]; draw(); } : null),
      stepper('Distance du tir', st.dist + ' m', () => { st.dist = clamp(st.dist - 25, 25, 2500); st.sessionId = null; draw(); }, () => { st.dist = clamp(st.dist + 25, 25, 2500); st.sessionId = null; draw(); }),
      h('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Écart vertical du point moyen'), h('b', { class: 'mono', style: { fontSize: '20px' } }, (st.offCm > 0 ? '+' : '') + num(st.offCm, 1) + ' cm')),
        h('div', { class: 'grid4' }, [-5, -1, 1, 5].map((d) => h('button', { class: 'step mono', 'aria-label': (d > 0 ? 'Plus ' : 'Moins ') + Math.abs(d) + ' cm', onClick: () => { st.offCm = Math.round((st.offCm + d) * 10) / 10; st.sessionId = null; draw(); } }, (d > 0 ? '+' : '−') + Math.abs(d))))),
      h('div', { class: 'card', style: { borderColor: ST[a.st][1], display: 'flex', flexDirection: 'column', gap: '4px' } },
        cal ? h('span', null, 'Prévu par le calcul : ', h('b', { class: 'mono' }, (cal.predM >= 0 ? '+' : '') + num(cal.predM * 100, 1) + ' cm'), ' · mesuré : ', h('b', { class: 'mono' }, (st.offCm > 0 ? '+' : '') + num(st.offCm, 1) + ' cm')) : h('span', null, 'Distance hors de portée.'),
        cal ? h('span', { class: 'muted', style: { fontSize: '13px' } }, 'Correction d’angle : ' + (cal.deltaMrad >= 0 ? '+' : '') + num(cal.deltaMrad, 2) + ' mrad → ' + num(cal.mrad, 2) + ' mrad · état actuel : ' + ST[a.st][0].toLowerCase()) : null),
      h('button', { class: 'btn primary block', onClick: save }, 'Enregistrer l’angle réel du cran'),
      Object.keys(meas).length ? h('div', null, h('h2', null, 'Crans mesurés'),
        Object.keys(meas).map(Number).sort((x, y) => x - y).map((c) => h('div', { class: 'row', style: { padding: '6px 0', borderBottom: '1px solid var(--border)' } },
          h('span', { class: 'grow' }, h('b', { class: 'mono' }, c + ' m'), h('span', { class: 'muted', style: { fontSize: '12px' } }, ' · ' + num(meas[c].mrad, 2) + ' mrad · ' + dateFr(meas[c].d) + (meas[c].dist ? ' à ' + meas[c].dist + ' m' : ''))),
          h('button', { class: 'btn small ghost', onClick: () => { set((x) => M.replaceGun(x, M.clearCranAngle(M.activeGun(x), c))); toast('Cran ' + c + ' m remis en calculé'); draw(); } }, 'Remettre en calculé')))) : null,
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '0', lineHeight: '1.45' } }, 'Un angle mesuré est mécanique : il reste valable avec une autre munition. Mesurez plusieurs crans éloignés (par exemple 200 et 500 m) pour ajuster les crans entre eux.'));
  }
  draw();
  return frame('Étalonner un cran', body);
}

function stepper(label, value, dec, inc) {
  return h('div', { class: 'card row' },
    h('div', { class: 'grow' }, h('span', { class: 'label' }, label), h('div', { class: 'mono', style: { fontSize: '22px', fontWeight: '700' } }, value)),
    h('button', { class: 'step mono', 'aria-label': 'Diminuer ' + label.toLowerCase(), disabled: dec ? null : true, onClick: dec || (() => {}) }, '−'),
    h('button', { class: 'step mono', 'aria-label': 'Augmenter ' + label.toLowerCase(), disabled: inc ? null : true, onClick: inc || (() => {}) }, '+'));
}
