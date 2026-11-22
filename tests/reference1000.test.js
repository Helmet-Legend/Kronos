// Porte de la phase 1 du cahier des charges : chute et dérive à 0,1 mrad près d'un calculateur reconnu
// jusqu'à 1 000 m, en G1 et en G7. Référence : py-ballisticcalc 3.1.1 (voir tests/tools/reference.py).
// Les cas couvrent le supersonique, le transsonique et le subsonique, l'air humide, la chaleur,
// le froid, la basse pression et un angle de site de ±10°.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solve, trajectory } from '../js/engine/solver.js';
import { ICAO } from '../js/engine/atmo.js';
import { G1, G7 } from '../js/engine/drag.js';

const REF = JSON.parse(readFileSync(new URL('./data/reference1000.json', import.meta.url), 'utf8'));
const GATE_MRAD = 0.1;   // exigence du cahier des charges
const TOL_MRAD = 0.03;   // tolérance des tests : alerte bien avant la porte
const TOL_V = 1.5;       // m/s

for (const c of REF.cases) {
  const k = c.cond;
  test(`${c.model} ${c.name} · ${k.t} °C ${k.p} hPa ${k.rh} % site ${k.angle}°`, () => {
    const D = Object.keys(c.rows).map(Number);
    const rows = solve({
      gun: { sightH: REF.setup.sightHmm / 1000, zero: REF.setup.zeroM, twistDir: '?' },
      sight: { kind: 'scope', unit: 'MRAD', click: 0.1 },
      load: { bc: c.bc, model: c.model, v0: c.v0 },
      met: { t: k.t, p: k.p, rh: k.rh }, zeroMet: ICAO,
      shot: { windSpeed: REF.setup.windMps, windHour: 3, angleDeg: k.angle }, distances: D
    }).rows;
    rows.forEach((r) => {
      const f = c.rows[r.d];
      const dEl = Math.abs(r.elMrad - f.dropMrad);
      const dW = Math.abs(Math.abs(r.windM) / r.d * 1000 - f.windMrad);
      assert.ok(dEl <= TOL_MRAD, `${r.d} m chute ${r.elMrad.toFixed(3)} vs ${f.dropMrad} mrad`);
      assert.ok(dW <= TOL_MRAD, `${r.d} m vent ${(Math.abs(r.windM) / r.d * 1000).toFixed(3)} vs ${f.windMrad} mrad`);
      assert.ok(Math.abs(r.v - f.v) <= TOL_V, `${r.d} m vitesse ${r.v.toFixed(1)} vs ${f.v} m/s`);
      assert.ok(TOL_MRAD < GATE_MRAD);
    });
  });
}

test('tables G1 et G7 jusqu’à Mach 5, croissantes en Mach', () => {
  for (const T of [G1, G7]) {
    assert.equal(T.mach.length, T.cd.length);
    assert.equal(T.mach.at(-1), 5);
    for (let i = 1; i < T.mach.length; i++) assert.ok(T.mach[i] > T.mach[i - 1]);
  }
});

test('performance : zéro + table de 25 à 1 500 m en moins de 5 ms', () => {
  const D = []; for (let d = 25; d <= 1500; d += 25) D.push(d);
  const args = { gun: { sightH: 0.04, zero: 100, twist: 254, twistDir: 'R' }, sight: { kind: 'scope', unit: 'MRAD', click: 0.1 },
    load: { bc: 0.243, model: 'G7', v0: 790, grains: 175, dMm: 7.82, lenMm: 31.5 }, met: { t: 20, p: 980, rh: 50 },
    shot: { windSpeed: 4, windHour: 3, angleDeg: 5 }, distances: D };
  for (let i = 0; i < 10; i++) solve(args);
  const t0 = performance.now(); for (let i = 0; i < 50; i++) solve(args);
  const ms = (performance.now() - t0) / 50;
  assert.ok(ms < 5, `${ms.toFixed(2)} ms`);
});

test('le zéro se referme quand les conditions du tir sont celles du zéro', () => {
  const met = { t: 20, p: 980, rh: 50 };
  for (const z of [25, 50, 100, 300, 600]) {
    const r = solve({ gun: { sightH: 0.04, zero: z, twistDir: '?' }, sight: { kind: 'scope', unit: 'MRAD', click: 0.1 },
      load: { bc: 0.243, model: 'G7', v0: 790 }, met, zeroMet: met, shot: { windSpeed: 0, windHour: 12 }, distances: [z] }).rows[0];
    assert.ok(Math.abs(r.elMrad) < 0.001, `zéro ${z} m : ${r.elMrad}`);
  }
});

test('tirs en site : plus de chute qu’à plat, et l’air se raréfie quand la balle monte', () => {
  const base = { gun: { sightH: 0.04, zero: 100, twistDir: '?' }, sight: { kind: 'scope', unit: 'MRAD', click: 0.1 },
    load: { bc: 0.243, model: 'G7', v0: 790 }, met: ICAO, distances: [800] };
  const flat = solve({ ...base, shot: { angleDeg: 0 } }).rows[0].elMrad;
  for (const a of [20, -20]) assert.ok(solve({ ...base, shot: { angleDeg: a } }).rows[0].elMrad < flat);
  // Même tir en montée de 20°, avec et sans variation de densité : la balle garde plus de vitesse avec.
  const o = { v0: 790, bc: 0.243, model: 'G7', rho: 1.225, c: 340.3, h: 0.04, alpha: 0.002, theta: 20 * Math.PI / 180, marks: [800] };
  const sans = trajectory(o)[0], avec = trajectory({ ...o, tK: 288.15 })[0];
  assert.ok(avec.v > sans.v + 0.5, `${avec.v} vs ${sans.v}`);
});
