import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptBackup, decryptBackup, isEncrypted, KDF_ITER } from '../js/data/crypto.js';
import * as M from '../js/data/model.js';

test('sauvegarde chiffrée : aller-retour sans perte', async () => {
  let s = M.defaultState();
  s = M.replaceGun(s, M.addSession(M.activeGun(s), { dist: 300, shots: [{ x: 1, y: 2 }, { x: 3, y: -4 }, { x: 0, y: 0 }], coldFirst: true }));
  const plain = M.makeBackup(s);
  const file = await encryptBackup(plain, 'cible C200 à 200 m', { schema: M.SCHEMA }, 1000);
  assert.ok(isEncrypted(file)); assert.ok(!isEncrypted(plain));
  assert.ok(!file.includes('Carabine'), 'aucune donnée en clair');
  const o = JSON.parse(file);
  assert.equal(o.enc.alg, 'AES-GCM-256'); assert.equal(o.schema, M.SCHEMA);
  const back = await decryptBackup(file, 'cible C200 à 200 m');
  assert.equal(back, plain);
  const r = M.parseBackup(back);
  assert.ok(r.ok); assert.deepEqual(r.state.guns, JSON.parse(plain).state.guns);
});

test('mauvais mot de passe ou fichier modifié : refus', async () => {
  const file = await encryptBackup('{"a":1}', 'bon', {}, 1000);
  await assert.rejects(decryptBackup(file, 'mauvais'), /Mot de passe incorrect/);
  const o = JSON.parse(file); o.data = o.data.slice(0, -4) + (o.data.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  await assert.rejects(decryptBackup(JSON.stringify(o), 'bon'), /Mot de passe incorrect/);
  await assert.rejects(decryptBackup('{"app":"kronos"}', 'bon'), /pas chiffré/);
});

test('dérivation de clé : 600 000 itérations par défaut', () => { assert.equal(KDF_ITER, 600000); });

test('aller-retour export puis import en clair, après migration', () => {
  const s = M.defaultState();
  const r = M.parseBackup(M.makeBackup(s));
  assert.ok(r.ok);
  assert.deepEqual(r.state.guns, s.guns);
  assert.deepEqual(r.state.settings, s.settings);
});
