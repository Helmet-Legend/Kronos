import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMeteo, windHour, meteoUrl } from '../js/data/meteo.js';
import { parseNum, num } from '../js/ui/format.js';

test('lecture d’une réponse Open-Meteo', () => {
  const m = parseMeteo({ elevation: 152, current: { temperature_2m: 11.36, relative_humidity_2m: 81, surface_pressure: 998.4, wind_speed_10m: 3.27, wind_direction_10m: 251 } });
  assert.deepEqual(m, { t: 11.4, p: 998, rh: 81, alt: 152, wind: { speed: 3.3, dir: 251 } });
  assert.throws(() => parseMeteo({}));
});

test('URL Open-Meteo : pression station et vent en m/s', () => {
  const u = meteoUrl(45.75, 4.85);
  assert.match(u, /surface_pressure/);
  assert.match(u, /wind_speed_unit=ms/);
});

test('vent météo converti en heure d’horloge', () => {
  assert.equal(windHour(0, 0), 12);    // vent du nord, tir vers le nord : de face
  assert.equal(windHour(90, 0), 3);    // vent d’est, tir vers le nord : de droite
  assert.equal(windHour(250, 340), 9); // de gauche
  assert.equal(windHour(180, 0), 6);
});

test('saisie et affichage à la française', () => {
  assert.equal(parseNum('0,505'), 0.505);
  assert.equal(parseNum(' 1 013 '), 1013);
  assert.ok(isNaN(parseNum('abc')));
  assert.equal(num(-1.25, 1), '−1,3');
  assert.equal(num(-0.01, 1), '0,0');
});
