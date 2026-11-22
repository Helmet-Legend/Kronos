// Validation du moteur contre des tables publiées (G1, hausse 1,5 pouce).
// Federal publie en Army Standard Metro, Hornady en atmosphère ICAO.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../js/engine/solver.js';
import { ICAO, ASM } from '../js/engine/atmo.js';
import { YARD, INCH, FPS, MPH } from '../js/engine/units.js';

const REFS = [
  { name: 'Federal GM308M2 175 gr SMK', atm: ASM, bc: 0.505, v0: 2600, zero: 200,
    v: { 100: 2427, 200: 2262, 300: 2102, 400: 1949, 500: 1803 }, path: { 100: 2.2, 300: -9.1, 400: -25.8, 500: -51.8 }, wind10: { 400: 12.5, 500: 20.3 } },
  { name: 'Federal GM308M2, zéro 100 yd', atm: ASM, bc: 0.505, v0: 2600, zero: 100, v: {}, path: { 200: -4.4, 300: -15.7 } },
  { name: 'Hornady 178 gr ELD-X', atm: ICAO, bc: 0.545, v0: 2600, zero: 200,
    v: { 100: 2437, 200: 2281, 300: 2130, 400: 1984, 500: 1846 }, path: { 100: 2.2, 300: -8.9, 400: -25.5, 500: -50.9 } },
  { name: 'Hornady 168 gr BTHP Match', atm: ICAO, bc: 0.457, v0: 2700, zero: 200,
    v: { 100: 2503, 200: 2314, 300: 2133, 400: 1960, 500: 1797 }, path: { 100: 2.0, 300: -8.5, 400: -24.7, 500: -50.0 } },
  { name: 'Hornady 168 gr ELD Match', atm: ICAO, bc: 0.533, v0: 2700, zero: 200,
    v: { 100: 2530, 200: 2367, 300: 2210, 400: 2058, 500: 1913 }, path: { 100: 2.0, 300: -8.2, 400: -23.5, 500: -47.0 } }
];

const TOL_FPS = 3, TOL_IN = 0.2;

for (const r of REFS) {
  test(r.name, () => {
    const yd = [100, 200, 300, 400, 500];
    const base = { gun: { sightH: 1.5 * INCH, zero: r.zero * YARD, twistDir: '?' }, sight: { kind: 'scope', unit: 'MOA', click: 0.25 },
      load: { bc: r.bc, model: 'G1', v0: r.v0 * FPS }, met: r.atm, zeroMet: r.atm, distances: yd.map((d) => d * YARD) };
    const calm = solve({ ...base, shot: { windSpeed: 0, windHour: 12 } }).rows;
    const wind = solve({ ...base, shot: { windSpeed: 10 * MPH, windHour: 3 } }).rows;
    yd.forEach((d, i) => {
      if (r.v[d] !== undefined) assert.ok(Math.abs(calm[i].v / FPS - r.v[d]) <= TOL_FPS, `${d} yd vitesse ${(calm[i].v / FPS).toFixed(0)} vs ${r.v[d]}`);
      if (r.path[d] !== undefined) assert.ok(Math.abs(calm[i].dropM / INCH - r.path[d]) <= TOL_IN, `${d} yd trajectoire ${(calm[i].dropM / INCH).toFixed(2)} vs ${r.path[d]}`);
      if (r.wind10 && r.wind10[d] !== undefined) assert.ok(Math.abs(Math.abs(wind[i].windM) / INCH - r.wind10[d]) <= TOL_IN, `${d} yd vent ${(Math.abs(wind[i].windM) / INCH).toFixed(2)} vs ${r.wind10[d]}`);
    });
  });
}
