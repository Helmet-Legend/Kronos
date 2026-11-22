import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSteps, analyzeLadder, MAX_STEPS } from '../js/engine/ladder.js';
import * as M from '../js/data/model.js';

test('échelle : paliers réguliers, jamais au-delà du maximum saisi', () => {
  assert.deepEqual(buildSteps(40, 41, 0.2), [40, 40.2, 40.4, 40.6, 40.8, 41]);
  assert.deepEqual(buildSteps(40, 40.9, 0.3), [40, 40.3, 40.6, 40.9]);
  assert.deepEqual(buildSteps(40, 41, 0.3), [40, 40.3, 40.6, 40.9], '41,2 dépasserait le maximum');
  assert.equal(buildSteps(40, 45, 0.2), null, 'plus de ' + MAX_STEPS + ' paliers');
  assert.equal(buildSteps(41, 40, 0.2), null);
  assert.equal(buildSteps(0, 40, 0.2), null);
});

test('analyse : fenêtre de 3 paliers où la V0 varie le moins', () => {
  const st = [[40, 790], [40.3, 798], [40.6, 806], [40.9, 809], [41.2, 811], [41.5, 820]].map(([gr, v0]) => ({ gr, v0 }));
  const a = analyzeLadder(st);
  assert.equal(a.stopAt, null);
  assert.equal(a.candidate.gr, 40.9); assert.equal(a.candidate.spread, 5);
});

test('un signe de pression arrête l’échelle : rien au-delà n’est retenu', () => {
  const st = [[40, 790], [40.3, 798], [40.6, 806], [40.9, 809], [41.2, 811], [41.5, 812], [41.8, 813]].map(([gr, v0]) => ({ gr, v0, signs: [] }));
  st[4].signs = ['ejectorMark'];
  const a = analyzeLadder(st);
  assert.equal(a.stopAt, 4);
  assert.ok(a.candidate.to < 41.2, 'la fenêtre s’arrête avant le palier du signe');
  assert.equal(a.candidate.gr, 40.6);
  const first = analyzeLadder([{ gr: 40, v0: 790, signs: ['primerPierced'] }, { gr: 40.3, v0: 795 }]);
  assert.equal(first.stopAt, 0); assert.equal(first.candidate, null); assert.match(first.reason, /dès la charge de départ/);
  assert.equal(analyzeLadder([{ gr: 40, v0: 790 }, { gr: 40.3 }, { gr: 40.6, v0: 800 }]).candidate, null);
});

test('recette : la candidate met à jour charge, source et V0 de la munition', () => {
  let g = M.activeGun(M.defaultState());
  g = M.setLadder(g, 'mun_f175', { source: 'Manuel X, éd. 2020, p. 112', powder: 'Poudre Y', start: 40, max: 41, step: 0.5, t: 20 });
  let l = g.loads.find((x) => x.id === 'mun_f175');
  assert.deepEqual(l.ladder.steps.map((s) => s.gr), [40, 40.5, 41]);
  g = M.updateLadderStep(g, 'mun_f175', 1, { v0: 800 });
  assert.equal(g.loads.find((x) => x.id === 'mun_f175').ladder.steps[1].v0, 800);
  g = M.applyLadder(g, 'mun_f175', 40.5, 800);
  l = g.loads.find((x) => x.id === 'mun_f175');
  assert.equal(l.chargeGr, 40.5); assert.equal(l.powder, 'Poudre Y'); assert.equal(l.chargeSource, 'Manuel X, éd. 2020, p. 112');
  assert.equal(l.v0, Math.round(800 - 0.5 * (20 - 15))); assert.equal(l.measured, true);
  assert.equal(M.setLadder(g, 'mun_f175', { source: '', start: 40, max: 41, step: 0.5 }), g, 'source obligatoire');
});
