import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cranList, cranAngles, bestCran, calibrateCran, angleFor } from '../js/engine/tangent.js';
import { solve } from '../js/engine/solver.js';
import { ICAO } from '../js/engine/atmo.js';

// K98k avec munition s.S. 198 gr (valeurs d'essai)
const args = { gun: { sightH: 0.028, zero: 100, twist: 240, twistDir: 'R' }, sight: { kind: 'iron' },
  load: { bc: 0.495, model: 'G1', v0: 760, refTemp: 15, sens: 0 }, met: ICAO, shot: { windSpeed: 0, windHour: 12 } };
const T = { min: 100, max: 2000, step: 100, crans: {} };

test('liste des crans', () => {
  assert.deepEqual(cranList({ min: 100, max: 500, step: 100 }), [100, 200, 300, 400, 500]);
  assert.deepEqual(cranList(null), []);
  assert.equal(cranList(T).length, 20);
});

test('crans calculés : chaque cran met la balle au point visé à sa distance, en atmosphère standard', () => {
  const A = cranAngles(args, { ...T, max: 800 });
  for (const c of [200, 500, 800]) {
    const r = solve({ ...args, alpha: A.get(c).alpha, distances: [c] }).rows[0];
    assert.ok(Math.abs(r.dropM) < 0.001, c + ' m : ' + r.dropM);
    assert.equal(A.get(c).st, 'calc');
  }
  assert.ok(A.get(800).alpha > A.get(200).alpha);
});

test('cran conseillé : celui qui laisse la plus petite tenue', () => {
  const A = cranAngles(args, { ...T, max: 1000 });
  assert.equal(bestCran(args, A, 400), 400);
  assert.equal(bestCran(args, A, 430), 400);
  assert.equal(bestCran(args, A, 480), 500);
});

test('étalonnage : retrouve l’angle réel d’un cran, puis interpole les voisins', () => {
  const t = { ...T, max: 600 };
  const A = cranAngles(args, t);
  const real300 = A.get(300).alpha + 0.0008; // le cran 300 est 0,8 mrad trop haut
  const e = solve({ ...args, alpha: real300, distances: [250] }).rows[0].dropM; // tir à 250 m avec le cran 300
  const cal = calibrateCran(args, A.get(300).alpha, 250, e);
  assert.ok(Math.abs(cal.mrad - real300 * 1000) < 0.002, cal.mrad + ' vs ' + real300 * 1000);
  assert.ok(Math.abs(cal.deltaMrad - 0.8) < 0.01);
  // cran 500 mesuré trop bas de 0,4 mrad : le 400 est ajusté à mi-chemin (+0,2 mrad)
  const t2 = { ...t, crans: { 300: { mrad: cal.mrad }, 500: { mrad: A.get(500).alpha * 1000 - 0.4 } } };
  const B = cranAngles(args, t2);
  assert.equal(B.get(300).st, 'meas'); assert.equal(B.get(400).st, 'adj'); assert.equal(B.get(600).st, 'adj');
  assert.ok(Math.abs((B.get(400).alpha - A.get(400).alpha) * 1000 - 0.2) < 0.01);
  assert.ok(Math.abs((B.get(600).alpha - A.get(600).alpha) * 1000 + 0.4) < 0.01, 'au-delà du dernier cran mesuré : même écart');
  assert.ok(Math.abs((B.get(100).alpha - A.get(100).alpha) * 1000 - 0.8) < 0.01);
});

test('un angle mesuré est mécanique : il ne change pas avec la munition', () => {
  const t = { ...T, max: 500, crans: { 300: { mrad: 5 } } };
  const other = { ...args, load: { ...args.load, v0: 820, bc: 0.4 } };
  assert.equal(cranAngles(args, t).get(300).alpha, 0.005);
  assert.equal(cranAngles(other, t).get(300).alpha, 0.005);
  assert.notEqual(cranAngles(args, t).get(200).alpha, cranAngles(other, t).get(200).alpha);
});

test('angle au zéro : plus grand par temps froid (air plus dense)', () => {
  assert.ok(angleFor(args, 600, { t: -10, p: 1013, rh: 0 }) > angleFor(args, 600, { t: 30, p: 1013, rh: 0 }));
});
