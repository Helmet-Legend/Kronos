import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confidence } from '../js/engine/confidence.js';

const base = {
  gun: { sightH: 0.045, zero: 100, twist: 279, twistDir: 'R' }, sight: { kind: 'scope', unit: 'MRAD', click: 0.1 },
  load: { bc: 0.505, model: 'G1', v0: 792, refTemp: 15, sens: 0.5, grains: 175, dMm: 7.82, lenMm: 31.5, measured: false },
  met: { t: 15, p: 1013.25, rh: 50 }, shot: { windSpeed: 3, windHour: 3, angleDeg: 0 }
};

test('la zone grandit avec la distance', () => {
  const a = confidence(base, 300), b = confidence(base, 800);
  assert.ok(b.sy > a.sy * 2 && b.sz > a.sz * 2);
  assert.equal(a.rows.reduce((x, r) => x + r.var, 0) > 0, true);
});

test('à 800 m par vent calme avec une V0 annoncée, le meilleur conseil est de mesurer la V0', () => {
  const c = confidence({ ...base, shot: { windSpeed: 0, windHour: 12, angleDeg: 0 } }, 800);
  assert.ok(['V0', 'Arme'].includes(c.main), c.main);
  assert.ok(c.rows.find((r) => r.k === 'V0').pct >= 20);
  assert.match(c.advice.hint, /chronographe/);
  assert.ok(c.advice.reduction >= 10, String(c.advice.reduction));
  assert.notEqual(c.level, 'HAUTE');
});

test('V0 mesurée et BC recalé : zone plus petite, l’arme ou le vent dominent', () => {
  const known = { ...base, load: { ...base.load, measured: true, bcTrued: true } };
  const a = confidence(base, 600), b = confidence(known, 600);
  assert.ok(b.sy < a.sy * 0.85, `${b.sy} vs ${a.sy}`);
  assert.ok(!b.rows.find((r) => r.k === 'V0').pct || b.rows.find((r) => r.k === 'V0').pct < a.rows.find((r) => r.k === 'V0').pct);
  assert.ok(['Arme', 'Vent'].includes(b.main), b.main);
});

test('à 100 m, la dispersion de l’arme domine : pas de conseil', () => {
  const c = confidence({ ...base, load: { ...base.load, measured: true } }, 100, 1.5);
  assert.equal(c.main, 'Arme');
  assert.equal(c.level, 'HAUTE');
});

test('sens des rayures inconnu : facteur gyroscopique', () => {
  const c = confidence({ ...base, gun: { ...base.gun, twistDir: '?' } }, 800);
  assert.ok(c.rows.some((r) => r.k === 'Gyro' && r.var > 0));
  const pct = c.rows.reduce((a, r) => a + r.pct, 0);
  assert.ok(pct >= 98 && pct <= 102, String(pct));
});

test('hors de portée : null', () => {
  assert.equal(confidence({ ...base, load: { ...base.load, v0: 250, bc: 0.1 } }, 2400), null);
});

test('coût : moins de 25 ms par zone (cahier des charges)', () => {
  for (let i = 0; i < 5; i++) confidence(base, 800);
  const t0 = performance.now(); for (let i = 0; i < 20; i++) confidence(base, 800);
  const ms = (performance.now() - t0) / 20;
  assert.ok(ms < 25, ms.toFixed(1) + ' ms');
});
