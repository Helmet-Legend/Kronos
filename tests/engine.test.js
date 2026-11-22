import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, zeroAngle, trajectory, windComponents, millerSg, spinDrift, muzzleVelocity } from '../js/engine/solver.js';
import { air, stationFromQnh, qnhFromStation, ICAO } from '../js/engine/atmo.js';
import { dragCoefficient } from '../js/engine/drag.js';
import { clicks, mradToMoa, energyJ } from '../js/engine/units.js';

const gun = { sightH: 0.045, zero: 100, twist: 279, twistDir: 'R' };
const sight = { kind: 'scope', unit: 'MRAD', click: 0.1 };
const load = { bc: 0.505, model: 'G1', v0: 792, refTemp: 15, sens: 0.5, grains: 175, dMm: 7.82, lenMm: 31.5 };
const met = { t: 15, p: 1013.25, rh: 50 };

test('air standard : 1,225 kg/m³ et 340 m/s', () => {
  const a = air(15, 1013.25, 0);
  assert.ok(Math.abs(a.rho - 1.225) < 0.002);
  assert.ok(Math.abs(a.c - 340.3) < 0.5);
});

test('l’air humide est moins dense que l’air sec', () => {
  assert.ok(air(25, 1000, 90).rho < air(25, 1000, 0).rho);
});

test('QNH et pression station sont réciproques', () => {
  const p = stationFromQnh(1020, 450);
  assert.ok(p < 1020 && p > 960);
  assert.ok(Math.abs(qnhFromStation(p, 450) - 1020) < 1e-6);
});

test('tables de traînée : bornes et interpolation', () => {
  assert.equal(dragCoefficient('G1', 0), 0.2629);
  assert.equal(dragCoefficient('G7', 10), 0.1618);
  const mid = dragCoefficient('G7', 1.0125);
  assert.ok(mid > 0.3803 && mid < 0.4015);
});

test('la trajectoire croise la ligne de visée à la distance de zéro', () => {
  const a = air(15, 1013.25, 0);
  const o = { v0: 792, bc: 0.505, model: 'G1', rho: a.rho, c: a.c, h: 0.045 };
  const al = zeroAngle(o, 100);
  const r = trajectory({ ...o, alpha: al, marks: [100] })[0];
  assert.ok(Math.abs(r.y) < 0.0005, `écart au zéro ${r.y}`);
});

test('pas de correction au zéro, correction croissante au-delà', () => {
  const s = solve({ gun, sight, load, met, zeroMet: met, shot: { windSpeed: 0, windHour: 12 }, distances: [100, 300, 600] });
  assert.ok(Math.abs(s.rows[0].elMrad) < 0.02);
  assert.ok(s.rows[1].elMrad > 0 && s.rows[2].elMrad > s.rows[1].elMrad);
});

test('ordre de grandeur .308 175 gr à 600 m : environ 5 à 6 mrad', () => {
  const s = solve({ gun, sight, load, met, shot: { windSpeed: 0, windHour: 12 }, distances: [600] });
  assert.ok(s.rows[0].elMrad > 4.5 && s.rows[0].elMrad < 7, String(s.rows[0].elMrad));
});

test('vent de 3 h : la balle part à gauche, il faut corriger à droite', () => {
  const s = solve({ gun: { ...gun, twistDir: '?' }, sight, load, met, shot: { windSpeed: 4, windHour: 3 }, distances: [500] });
  assert.ok(s.rows[0].windM < 0 && s.rows[0].wdMrad > 0);
  const s9 = solve({ gun: { ...gun, twistDir: '?' }, sight, load, met, shot: { windSpeed: 4, windHour: 9 }, distances: [500] });
  assert.ok(Math.abs(s9.rows[0].wdMrad + s.rows[0].wdMrad) < 1e-6);
});

test('composantes du vent', () => {
  const f = windComponents(5, 12), r = windComponents(5, 3);
  assert.ok(Math.abs(f.wx + 5) < 1e-9 && Math.abs(f.wz) < 1e-9);
  assert.ok(Math.abs(r.wz + 5) < 1e-9 && Math.abs(r.wx) < 1e-9);
});

test('dérive gyroscopique : à droite pour un pas à droite, nulle si inconnu', () => {
  const R = solve({ gun, sight, load, met, shot: { windSpeed: 0 }, distances: [800] }).rows[0];
  const L = solve({ gun: { ...gun, twistDir: 'L' }, sight, load, met, shot: { windSpeed: 0 }, distances: [800] }).rows[0];
  const U = solve({ gun: { ...gun, twistDir: '?' }, sight, load, met, shot: { windSpeed: 0 }, distances: [800] }).rows[0];
  assert.ok(R.spinM > 0.05 && R.spinM < 0.5, String(R.spinM));
  assert.ok(Math.abs(L.spinM + R.spinM) < 1e-9);
  assert.equal(U.spinM, 0);
});

test('Sg de Miller plausible pour 175 gr au pas de 11 pouces', () => {
  const sg = millerSg({ grains: 175, dMm: 7.82, lenMm: 31.5, twistMm: 279.4, v: 792, t: 15, p: 1013.25 });
  assert.ok(sg > 1.5 && sg < 2.5, String(sg));
  assert.equal(millerSg({ grains: 175 }), null);
  assert.equal(spinDrift(null, 1), 0);
});

test('tir en montée ou en descente : moins de correction qu’à plat', () => {
  const flat = solve({ gun, sight, load, met, shot: { angleDeg: 0 }, distances: [600] }).rows[0];
  const up = solve({ gun, sight, load, met, shot: { angleDeg: 20 }, distances: [600] }).rows[0];
  const down = solve({ gun, sight, load, met, shot: { angleDeg: -20 }, distances: [600] }).rows[0];
  assert.ok(up.elMrad < flat.elMrad && down.elMrad < flat.elMrad);
});

test('chaleur : V0 plus élevée, moins de chute', () => {
  assert.equal(muzzleVelocity(load, 25), 797);
  const cold = solve({ gun, sight, load, met: { t: -5, p: 1013, rh: 50 }, zeroMet: ICAO, shot: {}, distances: [600] }).rows[0];
  const hot = solve({ gun, sight, load, met: { t: 30, p: 1013, rh: 50 }, zeroMet: ICAO, shot: {}, distances: [600] }).rows[0];
  assert.ok(hot.elMrad < cold.elMrad);
});

test('G7 et G1 équivalents donnent des trajectoires proches à 500 m', () => {
  const g1 = solve({ gun, sight, load, met, shot: {}, distances: [500] }).rows[0];
  const g7 = solve({ gun, sight, load: { ...load, model: 'G7', bc: 0.250 }, met, shot: {}, distances: [500] }).rows[0];
  assert.ok(Math.abs(g1.dropM - g7.dropM) < 0.06, `${g1.dropM} vs ${g7.dropM}`);
});

test('régime transsonique signalé', () => {
  const s = solve({ gun, sight, load, met, shot: {}, distances: [300, 900, 1200] }).rows;
  assert.equal(s[0].regime, 'super');
  assert.ok(s[2].regime !== 'super');
});

test('clics et unités', () => {
  assert.equal(clicks(1.04, 'MRAD', 0.1), 10);
  assert.equal(clicks(1, 'MOA', 0.25), 14);
  assert.ok(Math.abs(mradToMoa(1) - 3.4377) < 1e-3);
  assert.ok(Math.abs(energyJ(175, 792) - 3557) < 5);
});

test('lunette MOA : valeurs dans l’unité de la lunette', () => {
  const r = solve({ gun, sight: { kind: 'scope', unit: 'MOA', click: 0.25 }, load, met, shot: {}, distances: [400] }).rows[0];
  assert.ok(Math.abs(r.el - mradToMoa(r.elMrad)) < 1e-9);
  assert.equal(r.elClicks, Math.round(r.el / 0.25));
});

test('visée mécanique : pas de clics', () => {
  const r = solve({ gun, sight: { kind: 'iron' }, load, met, shot: {}, distances: [300] }).rows[0];
  assert.equal(r.elClicks, null);
});

test('distance hors de portée signalée', () => {
  const r = solve({ gun, sight, load: { ...load, v0: 300, bc: 0.1 }, met, shot: {}, distances: [6000] }).rows[0];
  assert.equal(r.reached, false);
});
