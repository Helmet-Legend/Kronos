import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powderFit } from '../js/engine/powder.js';
import * as M from '../js/data/model.js';

test('régression : pente, ordonnée et R²', () => {
  const f = powderFit([{ t: 0, v0: 780 }, { t: 10, v0: 785 }, { t: 20, v0: 790 }, { t: 30, v0: 795 }]);
  assert.ok(Math.abs(f.slope - 0.5) < 1e-9 && Math.abs(f.at(15) - 787.5) < 1e-9);
  assert.ok(Math.abs(f.r2 - 1) < 1e-9);
  assert.equal(f.ok, true);
});

test('pas de conclusion sans 3 mesures et 10 °C d’écart', () => {
  assert.equal(powderFit([{ t: 10, v0: 780 }]), null);
  assert.equal(powderFit([{ t: 5, v0: 780 }, { t: 25, v0: 790 }]).ok, false);
  assert.equal(powderFit([{ t: 10, v0: 780 }, { t: 12, v0: 781 }, { t: 15, v0: 783 }]).ok, false);
  const noisy = powderFit([{ t: 0, v0: 790 }, { t: 10, v0: 780 }, { t: 20, v0: 795 }]);
  assert.ok(noisy.ok && noisy.r2 < 0.5);
});

test('mesures chrono appliquées à la munition', () => {
  let g = M.activeGun(M.defaultState());
  const id = 'mun_f175';
  g = M.addChrono(g, id, { t: 5, v0: 786, n: 10, sd: 4.2 });
  let l = g.loads.find((x) => x.id === id);
  assert.equal(l.chronoLog.length, 1);
  g = M.applyChrono(g, id, null); // une seule mesure : ramenée à 15 °C avec la sensibilité actuelle (0,5)
  l = g.loads.find((x) => x.id === id);
  assert.equal(l.v0, 791); assert.equal(l.measured, true); assert.equal(l.sdV0, 4.2);
  g = M.addChrono(g, id, { t: 15, v0: 790 }); g = M.addChrono(g, id, { t: 25, v0: 798 });
  l = g.loads.find((x) => x.id === id);
  const f = powderFit(l.chronoLog);
  g = M.applyChrono(g, id, f);
  l = g.loads.find((x) => x.id === id);
  assert.equal(l.sens, 0.6); assert.equal(l.v0, Math.round(f.at(15)));
  g = M.removeChrono(g, id, l.chronoLog[0].id);
  assert.equal(g.loads.find((x) => x.id === id).chronoLog.length, 2);
});
