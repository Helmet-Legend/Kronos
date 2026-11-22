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

test('séance : impacts bruts, coups ajoutés aux deux compteurs', () => {
  let g = M.activeGun(M.defaultState());
  g = M.addShots(g, 10);
  g = M.addSession(g, { dist: 300, loadId: 'mun_h178', target: 'C200', coldFirst: true, met: { t: 12, p: 990, rh: 70, extra: 1 }, wind: { speed: 2, hour: 3 },
    shots: [{ x: 30.4, y: 40 }, { x: 1, y: 2 }, { x: -3, y: 0 }], d: '2026-11-20' });
  assert.equal(g.sessions.length, 1);
  const s = g.sessions[0];
  assert.equal(s.loadName, 'Hornady 178 gr ELD Match');
  assert.equal(s.shots[0].x, 30);
  assert.equal(s.coldFirst, true);
  assert.deepEqual(s.met, { t: 12, p: 990, rh: 70 });
  assert.equal(g.counter.total, 13); assert.equal(g.counter.since, 13);
  assert.equal(g.counter.log.at(-1).k, 'séance');
  g = M.removeSession(g, s.id);
  assert.equal(g.sessions.length, 0); assert.equal(g.counter.total, 13, 'le compteur ne baisse pas');
});

test('recalage appliqué, historisé, puis annulé', () => {
  let g = M.activeGun(M.defaultState());
  g = M.applyTruing(g, 'mun_f175', { param: 'v0', from: 792, to: 776.6, dist: 600, dyM: -0.084 });
  let l = g.loads.find((x) => x.id === 'mun_f175');
  assert.equal(l.v0, 777); assert.equal(l.trueLog.length, 1); assert.equal(l.trueLog[0].dyCm, -8.4);
  g = M.applyTruing(g, 'mun_f175', { param: 'bc', from: 0.505, to: 0.4912, dist: 800, dyM: -0.1 });
  l = g.loads.find((x) => x.id === 'mun_f175');
  assert.equal(l.bc, 0.491); assert.equal(l.bcTrued, true);
  g = M.undoTruing(g, 'mun_f175');
  l = g.loads.find((x) => x.id === 'mun_f175');
  assert.equal(l.bc, 0.505); assert.equal(l.bcTrued, false); assert.equal(l.v0, 777);
  assert.equal(l.trueLog[1].undone, true);
  g = M.undoTruing(g, 'mun_f175');
  assert.equal(g.loads.find((x) => x.id === 'mun_f175').v0, 792);
  assert.equal(M.undoTruing(g, 'mun_f175'), g, 'plus rien à annuler');
  assert.equal(M.applyTruing(g, 'mun_f175', { param: 'v0', from: 792, to: null }), g);
});

test('migration du schéma 1 : carnet et historique de recalage vides', () => {
  const old = M.defaultState();
  old.schema = 1; delete old.guns[0].sessions; delete old.guns[0].loads[0].trueLog;
  const r = M.parseBackup(JSON.stringify({ app: 'kronos', schema: 1, state: old }));
  assert.ok(r.ok);
  assert.equal(r.state.schema, M.SCHEMA);
  assert.deepEqual(r.state.guns[0].sessions, []);
  assert.deepEqual(r.state.guns[0].loads[0].trueLog, []);
});
