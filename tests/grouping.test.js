import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupStats, mpiUncertainty, turretClicks, coldBoreSummary, mmToMoa, tapToMm } from '../js/engine/grouping.js';
import { trueLoad } from '../js/engine/truing.js';
import { solve } from '../js/engine/solver.js';
import { TARGETS, score } from '../js/engine/targets.js';

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('groupe : point moyen, rayon moyen, groupement extrême', () => {
  const st = groupStats([{ x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 30 }]);
  assert.equal(st.n, 3); assert.equal(st.nHot, 3);
  assert.ok(near(st.mx, 0) && near(st.my, 10));
  assert.ok(near(st.es, Math.hypot(10, 30)));
  assert.ok(near(st.mr, (2 * Math.hypot(10, 10) + 20) / 3));
  assert.equal(st.cold, null);
});

test('coup à froid : exclu du point moyen, compté dans le groupement', () => {
  const shots = [{ x: 40, y: 50 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
  const st = groupStats(shots, true);
  assert.equal(st.nHot, 3);
  assert.ok(near(st.mx, 10 / 3) && near(st.my, 10 / 3));
  assert.ok(near(st.es, Math.hypot(40, 50)));
  assert.ok(near(st.cold.x, 40 - 10 / 3) && near(st.cold.y, 50 - 10 / 3));
  assert.equal(groupStats([{ x: 1, y: 1 }], true).cold, null, 'un seul impact : pas de coup à froid');
  assert.equal(groupStats([], true), null);
});

test('MOA et incertitude du point moyen', () => {
  assert.ok(near(mmToMoa(29.0888, 100), 1, 1e-6));
  const st = groupStats([{ x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 10 }, { x: 0, y: -10 }]);
  assert.ok(near(mpiUncertainty(st), 10 / 2));
});

test('clics de tourelle : groupe bas et à droite → monter et aller à gauche', () => {
  const c = turretClicks(20, -50, 100, { kind: 'scope', unit: 'MRAD', click: 0.1 });
  assert.deepEqual(c, { up: 5, right: -2 });
  const m = turretClicks(0, 29.0888, 100, { kind: 'scope', unit: 'MOA', click: 0.25 });
  assert.deepEqual(m, { up: -4, right: 0 });
  assert.deepEqual(turretClicks(10, 10, 100, { kind: 'iron' }), { up: 0, right: 0 });
});

test('coup à froid sur plusieurs séances : conclusion au bout de 3', () => {
  const s = (d, y) => ({ dist: d, cold: { x: 0, y } });
  assert.equal(coldBoreSummary([]), null);
  const two = coldBoreSummary([s(100, 15), s(200, 30)]);
  assert.equal(two.regular, false); assert.equal(two.missing, 1);
  const reg = coldBoreSummary([s(100, 15), s(200, 34), s(300, 40)]);
  assert.ok(reg.regular && reg.my > 0.1);
  const noisy = coldBoreSummary([s(100, 30), s(100, -25), s(100, 5)]);
  assert.equal(noisy.regular, false);
  const tiny = coldBoreSummary([s(100, 3), s(100, 3), s(100, 4)]);
  assert.equal(tiny.regular, false, 'moins de 0,05 mrad');
});

test('cibles TAR : zones et points (règle de la ligne)', () => {
  const t = TARGETS.C200;
  assert.equal(score(t, 0, 0), 10);
  assert.equal(score(t, 0, 43), 10, 'à 43 mm du centre, l’ogive de 7,8 mm touche la ligne du 10 (rayon 40)');
  assert.equal(score(t, 0, 50), 9);
  assert.equal(score(t, 0, 500), 0);
  assert.equal(score(TARGETS.GRID, 0, 0), null);
  for (const k of ['C200', 'C200_50', 'C50']) assert.equal(TARGETS[k].zones.length, 10);
});

test('toucher sur le dessin → mm sur la cible', () => {
  assert.deepEqual(tapToMm(150, 150, 300, 300, 850, 850), { x: 0, y: 0 });
  assert.deepEqual(tapToMm(300, 0, 300, 300, 850, 850), { x: 425, y: 425 });
});

/* ---------- Recalage ---------- */
const gun = { sightH: 0.045, zero: 100, twist: 254, twistDir: '?' };
const sight = { kind: 'scope', unit: 'MRAD', click: 0.1 };
const met = { t: 15, p: 1013.25, rh: 50 };
const dyFor = (nominal, real, d) => {
  const y = (l) => solve({ gun, sight, load: l, met, zeroMet: met, shot: {}, distances: [d] }).rows[0].dropM;
  return y(real) - y(nominal);
};

test('recalage V0 : retrouve la vraie vitesse à partir de l’écart observé', () => {
  const load = { bc: 0.243, model: 'G7', v0: 800, refTemp: 15, sens: 0, measured: false };
  const dy = dyFor(load, { ...load, v0: 780 }, 600);
  assert.ok(dy < -0.05, 'une V0 plus faible fait tomber les impacts plus bas');
  const r = trueLoad({ gun, sight, load, met, zeroMet: met, dist: 600, dyM: dy });
  assert.equal(r.param, 'v0'); assert.equal(r.warn, null);
  assert.ok(Math.abs(r.to - 780) < 0.5, String(r.to));
  assert.ok(r.effect.d === 800 && r.effect.el2 > r.effect.el1);
});

test('recalage BC quand la V0 est mesurée', () => {
  const load = { bc: 0.243, model: 'G7', v0: 800, refTemp: 15, sens: 0, measured: true };
  const dy = dyFor(load, { ...load, bc: 0.225 }, 800);
  const r = trueLoad({ gun, sight, load, met, zeroMet: met, dist: 800, dyM: dy });
  assert.equal(r.param, 'bc'); assert.equal(r.auto, 'bc');
  assert.ok(Math.abs(r.to - 0.225) < 0.001, String(r.to));
});

test('recalage : garde-fous', () => {
  const load = { bc: 0.243, model: 'G7', v0: 800, refTemp: 15, sens: 0, measured: false };
  assert.match(trueLoad({ gun, sight, load, met, dist: 200, dyM: -0.05 }).warn, /300 m/);
  assert.match(trueLoad({ gun: { ...gun, zero: 200 }, sight, load, met, dist: 350, dyM: -0.05 }).warn, /400 m/);
  assert.match(trueLoad({ gun, sight, load, met, dist: 600, dyM: 0 }).warn, /Aucun écart/);
  assert.match(trueLoad({ gun, sight, load, met, dist: 600, dyM: -0.02, mpiErrM: 0.015 }).warn, /peu significatif/);
  const far = trueLoad({ gun, sight, load, met, dist: 600, dyM: -5 });
  assert.equal(far.to, null); assert.match(far.warn, /hors des bornes/);
  const forced = trueLoad({ gun, sight, load, met, dist: 600, dyM: -0.1, param: 'bc' });
  assert.equal(forced.param, 'bc'); assert.equal(forced.auto, 'v0');
});

test('recalage avec une hausse graduée : l’angle du cran reste fixe', () => {
  const load = { bc: 0.495, model: 'G1', v0: 760, refTemp: 15, sens: 0, measured: false };
  const g = { sightH: 0.028, zero: 100, twist: 240, twistDir: '?' }, iron = { kind: 'iron' };
  const alpha = solve({ gun: { ...g, zero: 500 }, sight: iron, load, met, zeroMet: met, distances: [500] }).alpha; // cran 500
  const y = (l) => solve({ gun: g, sight: iron, load: l, met, alpha, distances: [500] }).rows[0].dropM;
  const dy = y({ ...load, v0: 740 }) - y(load);
  const fixed = trueLoad({ gun: g, sight: iron, load, met, dist: 500, dyM: dy, alpha });
  assert.ok(Math.abs(fixed.to - 740) < 0.5, String(fixed.to));
  const rezero = trueLoad({ gun: g, sight: iron, load, met, dist: 500, dyM: dy });
  assert.ok(Math.abs(rezero.to - 740) > 2, 'sans angle fixe, le recalage se trompe : ' + rezero.to);
});
