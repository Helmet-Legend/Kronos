// Réglages : thème, écran allumé, sauvegarde, à propos et validation du moteur.
import { h } from './dom.js';
import { app, set, toast, confirm, openSheet, closeSheet, requestWake, releaseWake, M } from '../app.js';
import { frame, field } from './sheets.js';
import { encryptBackup, decryptBackup, isEncrypted, cryptoAvailable } from '../data/crypto.js';
import { dateFr } from './format.js';

const setSettings = (o) => set((s) => ({ ...s, settings: { ...s.settings, ...o } }));

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/** Propose la restauration d'une sauvegarde lue (aperçu du contenu avant validation). */
function offerRestore(text) {
  const s = app.state;
  const r = M.parseBackup(text);
  if (!r.ok) { toast(r.error); return; }
  const n = (k) => r.state.guns.reduce((a, g) => a + (g[k] || []).length, 0);
  confirm({ title: 'Restaurer la sauvegarde ?', text: 'Le fichier contient ' + r.state.guns.length + ' arme(s), ' + n('loads') + ' munition(s) et ' + n('sessions') + ' séance(s). Il remplace les ' + s.guns.length + ' armes actuelles.', ok: 'Restaurer',
    onOk: () => { app.armeId = null; set(() => M.backupDone(r.state)); toast('Sauvegarde restaurée'); } });
}

/** Panneau du mot de passe pour une sauvegarde chiffrée. */
function passwordSheet(text) {
  const pw = field('Mot de passe de la sauvegarde', '', { text: true });
  pw.input.type = 'password'; pw.input.autocomplete = 'current-password';
  const err = h('div', { class: 'errors', role: 'alert' });
  const btn = h('button', { class: 'btn primary block', onClick: async () => {
    btn.disabled = true; btn.textContent = 'Déchiffrement…'; err.textContent = '';
    try { const plain = await decryptBackup(text, pw.get()); closeSheet(); offerRestore(plain); } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = 'Déchiffrer'; }
  } }, 'Déchiffrer');
  return frame('Sauvegarde chiffrée', h('p', { style: { margin: '0', fontSize: '14px' } }, 'Ce fichier est protégé par un mot de passe.'), pw.el, err, btn);
}

/** Panneau d'export : en clair ou chiffré par mot de passe. */
function exportSheet() {
  const p1 = field('Mot de passe (facultatif)', '', { text: true, help: 'Au moins 8 caractères. Sans lui, la sauvegarde chiffrée est illisible : notez-le.' });
  const p2 = field('Confirmer le mot de passe', '', { text: true });
  for (const f of [p1, p2]) { f.input.type = 'password'; f.input.autocomplete = 'new-password'; }
  const err = h('div', { class: 'errors', role: 'alert' });
  const go = async (btn, share) => {
    const pw = p1.get();
    if (pw && pw.length < 8) { err.textContent = 'Mot de passe trop court (8 caractères au moins)'; return; }
    if (pw !== p2.get()) { err.textContent = 'Les deux mots de passe diffèrent'; return; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = pw ? 'Chiffrement…' : 'Préparation…';
    try {
      const plain = M.makeBackup(app.state);
      const text = pw ? await encryptBackup(plain, pw, { schema: M.SCHEMA, exportedAt: new Date().toISOString() }) : plain;
      const name = 'kronos-sauvegarde-' + M.todayIso() + (pw ? '-chiffree' : '') + '.json';
      if (share) {
        const file = new File([text], name, { type: 'application/json' });
        await navigator.share({ files: [file], title: 'Sauvegarde Kronos' });
      } else download(name, text);
      set((s) => M.backupDone(s));
      closeSheet(); toast(pw ? 'Sauvegarde chiffrée exportée' : 'Sauvegarde exportée');
    } catch (e) {
      btn.disabled = false; btn.textContent = label;
      if (e && e.name !== 'AbortError') err.textContent = e.message || 'Export impossible';
    }
  };
  const canShare = typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'k.json', { type: 'application/json' })] });
  return frame('Exporter une sauvegarde',
    h('p', { style: { margin: '0', fontSize: '14px', lineHeight: '1.5' } }, 'Le fichier contient toutes vos armes, munitions, compteurs, séances et recalages. Avec un mot de passe, il est chiffré (AES-GCM 256 bits).'),
    cryptoAvailable() ? [p1.el, p2.el] : h('div', { class: 'notice' }, 'Chiffrement indisponible dans ce navigateur : export en clair seulement.'),
    err,
    h('div', { class: canShare ? 'grid2' : '' },
      h('button', { class: 'btn primary block', onClick: (e) => go(e.currentTarget, false) }, 'Télécharger'),
      canShare ? h('button', { class: 'btn block', onClick: (e) => go(e.currentTarget, true) }, 'Partager') : null));
}

/** Bandeau de rappel de sauvegarde (null si rien à rappeler). */
export function backupBanner() {
  const why = M.backupDue(app.state.settings);
  if (!why) return null;
  return h('div', { class: 'notice row' },
    h('span', { class: 'grow' }, h('b', null, 'Pensez à sauvegarder · '), why + '.'),
    h('button', { class: 'btn small', onClick: () => openSheet('export', exportSheet) }, 'Exporter'));
}

export function renderReglages() {
  const s = app.state, st = s.settings;
  const chip = (label, on, fn) => h('button', { class: 'chip', 'aria-pressed': String(on), onClick: fn }, label);
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', 'aria-label': 'Fichier de sauvegarde', onChange: async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const text = await f.text();
    e.target.value = '';
    if (isEncrypted(text)) openSheet('password', () => passwordSheet(text)); else offerRestore(text);
  } });
  const wakeOk = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  return h('main', null,
    h('section', { class: 'card' },
      h('div', { class: 'label', style: { marginBottom: '8px' } }, 'Thème'),
      h('div', { class: 'chips' },
        chip('Sombre', st.theme === 'dark', () => setSettings({ theme: 'dark' })),
        chip('Clair (plein soleil)', st.theme === 'light', () => setSettings({ theme: 'light' })),
        chip('Nuit (rouge)', st.theme === 'night', () => setSettings({ theme: 'night' }))),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '8px 0 0' } }, 'Le mode nuit n’utilise que du rouge sur fond noir pour préserver la vision nocturne.')),

    h('section', { class: 'card row' },
      h('div', { class: 'grow' }, h('div', { style: { fontWeight: '700' } }, 'Écran toujours allumé au poste de tir'),
        h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '3px' } }, wakeOk ? 'Seulement sur l’écran Tir.' : 'Non pris en charge par ce navigateur (iPhone : iOS 18.4 et app installée).')),
      h('button', { class: 'chip', role: 'switch', 'aria-checked': String(st.wakeLock), 'aria-pressed': String(st.wakeLock), onClick: () => { setSettings({ wakeLock: !st.wakeLock }); st.wakeLock ? releaseWake() : requestWake(); } }, st.wakeLock ? 'Activé' : 'Désactivé')),

    h('section', { class: 'card' },
      h('div', { class: 'label', style: { marginBottom: '6px' } }, 'Sauvegarde'),
      h('p', { class: 'muted', style: { fontSize: '13px', margin: '0 0 10px', lineHeight: '1.45' } }, 'Vos données restent sur ce téléphone, sans compte ni serveur. Exportez une sauvegarde de temps en temps (changement de téléphone, nettoyage du navigateur).'),
      h('div', { class: 'kv' }, h('span', null, 'Dernière sauvegarde'), h('span', null, st.lastBackupIso ? dateFr(st.lastBackupIso) : 'jamais')),
      h('div', { class: 'kv' }, h('span', null, 'Modifications depuis'), h('span', { class: 'mono' }, String(st.changesSinceBackup || 0))),
      h('div', { class: 'kv' }, h('span', null, 'Stockage protégé'), h('span', null, app.persisted === null ? '—' : app.persisted ? 'oui' : 'non : installez l’app sur l’écran d’accueil')),
      backupBanner(),
      h('div', { class: 'grid2', style: { marginTop: '10px' } },
        h('button', { class: 'btn', onClick: () => openSheet('export', exportSheet) }, 'Exporter'),
        h('label', { class: 'btn', style: { display: 'grid', placeItems: 'center' } }, 'Importer', fileInput))),

    h('section', { class: 'card' },
      h('div', { class: 'label', style: { marginBottom: '6px' } }, 'Fiabilité du calcul'),
      h('p', { style: { fontSize: '13px', margin: '0', lineHeight: '1.5' } }, 'Moteur point-masse (Runge-Kutta 4, traînée G1 ou G7, air humide qui suit l’altitude de la balle, vent, angle de site, dérive gyroscopique de Litz). Comparé à 31 valeurs publiées par Federal et Hornady jusqu’à 457 m (écart maximal 0,7 m/s et 3 mm), puis à un calculateur de référence jusqu’à 1 000 m en G1 et G7, en conditions extrêmes et en site : écart maximal 0,006 mrad.'),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '8px 0 0', lineHeight: '1.45' } }, 'Le calcul ne vaut que par ses données : au-delà de 300 m, mesurez la V0 au chrono ou recalez-la sur une séance (carnet). L’effet Coriolis n’est pas encore pris en compte.')),

    h('section', { class: 'card' },
      h('div', { class: 'label', style: { marginBottom: '6px' } }, 'À propos'),
      h('p', { style: { fontSize: '13px', margin: '0', lineHeight: '1.5' } }, 'Kronos ' + app.version + ' · fonctionne hors ligne une fois installé (menu du navigateur → « Ajouter à l’écran d’accueil »).'),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '6px 0 0' } }, 'Météo : Open-Meteo.com (CC BY 4.0), usage non commercial.')),

    h('button', { class: 'btn danger block', onClick: () => confirm({ title: 'Tout effacer ?', text: 'Armes, munitions, compteurs et réglages seront remplacés par les exemples de départ. Exportez une sauvegarde avant.', ok: 'Tout effacer', danger: true, onOk: () => { app.armeId = null; set(() => M.defaultState()); toast('Données réinitialisées'); } }) }, 'Réinitialiser l’application'));
}
