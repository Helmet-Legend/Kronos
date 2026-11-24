import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calibrePoing, checkPoing } from '../js/engine/poing.js';
import { EVENTS, TARGETS, eventScore, phaseTarget, score } from '../js/engine/targets.js';

const glock17 = { cal: '9 mm Luger', barrelMm: 114, sight: { kind: 'iron' }, hand: { type: 'pistolet', triggerKg: 2.65, cat: 'recente', interdits: {} } };

test('calibres de l’annexe A-830 et leurs noms usuels', () => {
  assert.equal(calibrePoing('9 mm Luger'), '9 mm Parabellum');
  assert.equal(calibrePoing('9x19'), '9 mm Parabellum');
  assert.equal(calibrePoing('.45 ACP'), '45 ACP');
  assert.equal(calibrePoing('45 Auto'), '45 ACP');
  assert.equal(calibrePoing('38 Special'), '38 Spécial');
  assert.equal(calibrePoing('.40 S&W'), null);
  assert.equal(calibrePoing('357 Magnum'), null);
  assert.equal(calibrePoing('.22 LR'), null);
});

test('Glock 17 et 30S admis en 830 et 831', () => {
  const a = checkPoing(glock17);
  assert.equal(a.ok, true); assert.deepEqual(a.events, ['830', '831']);
  const b = checkPoing({ ...glock17, cal: '.45 ACP', barrelMm: 96, hand: { ...glock17.hand, triggerKg: 2.85 } });
  assert.equal(b.ok, true);
});

test('Glock 34 refusé (canon de 13,5 cm), accessoires interdits, détente trop légère', () => {
  assert.equal(checkPoing({ ...glock17, barrelMm: 135 }).ok, false);
  const c = checkPoing({ ...glock17, hand: { ...glock17.hand, interdits: { fibre: true, magwell: true } } });
  assert.equal(c.ok, false); assert.equal(c.interdits.length, 2);
  assert.equal(checkPoing({ ...glock17, hand: { ...glock17.hand, triggerKg: 1.2 } }).ok, false);
  assert.equal(checkPoing({ ...glock17, cal: '357 Magnum', hand: { ...glock17.hand, ammo38: true } }).ok, true, '357 tirant du 38 Spécial');
  assert.equal(checkPoing({ ...glock17, hand: { ...glock17.hand, type: 'revolver' }, barrelMm: 150 }).ok, true, 'revolver : 15,5 cm');
});

test('épreuves de poing : 830 et 832 sur 200 (C50 + gongs), 831 sur 200 (cible vitesse)', () => {
  for (const id of ['830', '831', '832']) {
    const e = EVENTS.find((x) => x.id === id);
    assert.equal(e.kind, 'poing'); assert.equal(e.dist, 25);
    const per = e.phases.map((p, i) => (phaseTarget(e, i) === 'GONG' ? { gongs: [true, true, true, true, true] } : { shots: Array(p[2]).fill({ x: 0, y: 0 }) }));
    assert.equal(eventScore(e, per, 9).max, 200, id);
    assert.equal(eventScore(e, per, 9).total, 200, id + ' : tout au centre');
  }
  const e830 = EVENTS.find((x) => x.id === '830');
  const part = eventScore(e830, { 0: { shots: [{ x: 0, y: 0 }] }, 1: { shots: [{ x: 0, y: 0 }, { x: 0, y: 52 }] }, 2: { gongs: [true, false, true, false, false] } }, 9);
  assert.equal(part.total, 10 + 9 + 10, 'essais non comptés, 2 gongs = 10 points');
  assert.ok(EVENTS.filter((x) => x.kind === 'epaule').length >= 9);
});

test('cible vitesse 25 m : zones 10 à 5, mouche de 50 mm', () => {
  const T = TARGETS.VITESSE;
  assert.equal(score(T, 0, 0, 9), 10);
  assert.equal(score(T, 0, 54, 9), 10, 'touche la ligne du 10 (rayon 50)');
  assert.equal(score(T, 0, 120, 9), 8);
  assert.equal(score(T, 0, 260, 9), 0);
});

test('modèles d’armes de poing : calibres reconnus, Glock 34 refusé, revolvers 357 admis en 38 Spécial', async () => {
  const { HANDGUNS, AMMO } = await import('../js/data/catalog.js');
  const { calibrePoing, checkPoing } = await import('../js/engine/poing.js');
  const M = await import('../js/data/model.js');
  assert.equal(new Set(HANDGUNS.map((p) => p.id)).size, HANDGUNS.length, 'identifiants uniques');
  for (const p of HANDGUNS) {
    const g = M.newGun({ type: 'poing', name: p.name, cal: p.cal, barrelMm: p.barrelMm, twist: p.twist, twistDir: p.twistDir, sight: { kind: 'iron' }, sightH: p.sightH, zero: 25,
      hand: { type: p.type, triggerKg: p.triggerKg ?? 2, cat: p.cat, interdits: {}, ammo38: !!p.ammo38 } });
    assert.deepEqual(M.checkGun(g), [], p.name);
    assert.ok(calibrePoing(p.cal) || (p.ammo38 && /357/.test(p.cal)), p.name + ' : calibre de l’annexe A-830');
    assert.ok(p.verify || !p.src.includes('à vérifier sur votre arme'), p.name);
    const c = checkPoing(g);
    if (p.id === 'glock34') assert.equal(c.ok, false, 'Glock 34 : canon de 135 mm');
    else assert.deepEqual(c.events, p.cat === 'authentique' ? ['832', '831'] : ['830', '831'], p.name);
  }
  // un revolver 357 sans munitions de 38 Spécial n'est pas admis
  const mr = HANDGUNS.find((p) => p.id === 'mr73');
  assert.equal(checkPoing({ cal: mr.cal, barrelMm: mr.barrelMm, sight: { kind: 'iron' }, hand: { type: 'revolver', triggerKg: 2, cat: 'recente', interdits: {} } }).ok, false);
  // chaque calibre d'arme de poing a au moins une munition au catalogue, sauf les calibres anciens rares
  const rare = ['8 mm 1892', '455 Webley'];
  for (const p of HANDGUNS) if (!rare.includes(p.cal)) assert.ok(AMMO.some((a) => a.cal === (p.ammo38 ? '38 Spécial' : p.cal)), p.name + ' : munition au catalogue');
});

test('modèles d’armes d’épaule : données valides et munition au catalogue', async () => {
  const { RIFLES, AMMO } = await import('../js/data/catalog.js');
  const M = await import('../js/data/model.js');
  for (const p of RIFLES) {
    const g = M.newGun({ name: p.name, cal: p.cal, barrelMm: p.barrelMm, twist: p.twist, twistDir: p.twistDir, sightH: p.sightH,
      sight: p.tangent ? { kind: 'iron', tangent: { ...p.tangent, crans: {} } } : { kind: 'iron' } });
    assert.deepEqual(M.checkGun(g), [], p.name);
    assert.ok(AMMO.some((a) => a.cal === p.cal), p.name + ' : munition au catalogue');
    assert.ok(p.verify && p.src, p.name + ' : marqué à vérifier');
  }
});
