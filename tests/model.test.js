import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/data/model.js';

test('état par défaut cohérent', () => {
  const s = M.defaultState();
  assert.equal(M.activeGun(s).id, 'arme_tld');
  assert.equal(M.activeLoad(M.activeGun(s)).name, 'Federal GMM 175 gr SMK');
  s.guns.forEach((g) => { assert.deepEqual(M.checkGun(g), []); g.loads.forEach((l) => assert.deepEqual(M.checkLoad(l), [])); });
});

test('compteur : total jamais effacé par le nettoyage', () => {
  let g = M.activeGun(M.defaultState());
  g = M.addShots(g, 20, 'tir', '2026-11-01');
  g = M.addShots(g, 15, 'tir', '2026-11-08');
  g = M.cleaned(g, '2026-11-08');
  assert.equal(g.counter.total, 35);
  assert.equal(g.counter.since, 0);
  g = M.addShots(g, 5);
  assert.equal(g.counter.since, 5);
  assert.equal(M.addShots(g, -3), g);
});

test('annuler la dernière saisie', () => {
  let g = M.activeGun(M.defaultState());
  g = M.addShots(g, 10); g = M.addShots(g, 50);
  g = M.undoLast(g);
  assert.equal(g.counter.total, 10);
  assert.equal(g.counter.log[1].k, 'annulé');
});

test('on ne peut pas supprimer la dernière arme ni la dernière munition', () => {
  const s = M.defaultState();
  const s1 = M.removeGun(s, 'arme_tld');
  assert.equal(s1.gunId, 'arme_k98');
  assert.equal(M.removeGun(s1, 'arme_k98'), s1);
  const k98 = s.guns[1];
  assert.equal(M.removeLoad(k98, k98.loads[0].id), k98);
});

test('contrôles de saisie', () => {
  assert.ok(M.checkLoad(M.newLoad({ bc: 3 })).length);
  assert.ok(M.checkGun(M.newGun({ zero: 2 })).length);
  assert.deepEqual(M.checkLoad(M.newLoad()), []);
});

test('sauvegarde : aller-retour et fichiers invalides', () => {
  const s = M.defaultState();
  const r = M.parseBackup(M.makeBackup(s));
  assert.ok(r.ok);
  assert.equal(r.state.guns.length, 2);
  assert.equal(M.parseBackup('pas du json').ok, false);
  assert.equal(M.parseBackup('{"guns":[]}').ok, false);
  const bad = JSON.parse(M.makeBackup(s)); bad.state.guns[0].loads[0].bc = 9;
  assert.match(M.parseBackup(JSON.stringify(bad)).error, /BC/);
});
