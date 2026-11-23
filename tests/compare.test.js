import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareLoads } from '../js/engine/compare.js';
import { ICAO } from '../js/engine/atmo.js';
import { AMMO, DISCIPLINES } from '../js/data/catalog.js';
import { checkLoad } from '../js/data/model.js';

const opts = { met: ICAO, zero: 100, sightH: 0.045, windSpeed: 4 };

test('comparateur : valeurs de référence (vérification des tableaux du 23/11/2026)', () => {
  const [cm, m308] = compareLoads([
    { name: '6,5 CM 140 ELD-M', bc: 0.326, model: 'G7', v0: 825, grains: 140 },
    { name: '.308 175', bc: 0.255, model: 'G7', v0: 800, grains: 175 }], opts);
  const at = (x, d) => x.rows.find((r) => r.d === d);
  assert.ok(Math.abs(at(cm, 1000).elMrad - 10.3) < 0.15, String(at(cm, 1000).elMrad));
  assert.ok(Math.abs(at(m308, 1000).windMrad - 2.9) < 0.1, String(at(m308, 1000).windMrad));
  assert.ok(Math.abs(cm.e0 - 3087) < 5);
  assert.ok(cm.superRange >= 1025 && cm.superRange <= 1075, String(cm.superRange));
  assert.ok(m308.superRange >= 750 && m308.superRange <= 800, String(m308.superRange));
  assert.ok(Math.abs(at(cm, 100).elMrad) < 0.01, 'zéro à 100 m');
});

test('comparateur : sans masse, pas d’énergie ; hors de portée signalé', () => {
  const [x] = compareLoads([{ name: '.22 LR', bc: 0.13, model: 'G1', v0: 325 }], { ...opts, zero: 50, distances: [100, 2400] });
  assert.equal(x.e0, null);
  assert.equal(x.rows[0].e, null);
  assert.equal(x.superRange, null, 'subsonique dès la bouche');
});

test('catalogue : fiches complètes, identifiants uniques, données nouvelles marquées à vérifier', () => {
  const ids = new Set();
  for (const a of AMMO) {
    assert.ok(!ids.has(a.id), 'doublon ' + a.id); ids.add(a.id);
    assert.ok(a.g1 > 0 || a.g7 > 0, a.id);
    const model = a.g7 > 0 ? 'G7' : 'G1';
    assert.deepEqual(checkLoad({ name: a.name, bc: model === 'G7' ? a.g7 : a.g1, model, v0: a.v0, sens: 0 }), [], a.id);
    assert.ok(a.grains > 0 && a.dMm > 0, a.id);
    assert.ok(Array.isArray(a.disc) && a.disc.every((d) => DISCIPLINES[d]), a.id);
    if (a.verify) assert.ok(a.src, a.id + ' : source manquante');
  }
  assert.ok(AMMO.length >= 35);
});
