// Réglages : thème, écran allumé, sauvegarde, à propos et validation du moteur.
import { h } from './dom.js';
import { app, set, toast, confirm, requestWake, releaseWake, M } from '../app.js';

const setSettings = (o) => set((s) => ({ ...s, settings: { ...s.settings, ...o } }));

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function renderReglages() {
  const s = app.state, st = s.settings;
  const chip = (label, on, fn) => h('button', { class: 'chip', 'aria-pressed': String(on), onClick: fn }, label);
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', 'aria-label': 'Fichier de sauvegarde', onChange: async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = M.parseBackup(await f.text());
    if (!r.ok) { toast(r.error); return; }
    confirm({ title: 'Restaurer la sauvegarde ?', text: 'Elle remplace les ' + s.guns.length + ' armes actuelles par les ' + r.state.guns.length + ' du fichier.', ok: 'Restaurer', onOk: () => { set(() => r.state); toast('Sauvegarde restaurée'); } });
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
      h('div', { class: 'grid2' },
        h('button', { class: 'btn', onClick: () => { download('kronos-sauvegarde-' + M.todayIso() + '.json', M.makeBackup(s)); toast('Sauvegarde exportée'); } }, 'Exporter'),
        h('label', { class: 'btn', style: { display: 'grid', placeItems: 'center' } }, 'Importer', fileInput))),

    h('section', { class: 'card' },
      h('div', { class: 'label', style: { marginBottom: '6px' } }, 'Fiabilité du calcul'),
      h('p', { style: { fontSize: '13px', margin: '0', lineHeight: '1.5' } }, 'Moteur point-masse (Runge-Kutta 4, traînée G1 ou G7, air humide, vent, angle de site, dérive gyroscopique de Litz). Comparé à 31 valeurs publiées par Federal et Hornady jusqu’à 457 m : écart maximal 0,7 m/s en vitesse et 3 mm en trajectoire.'),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '8px 0 0', lineHeight: '1.45' } }, 'Au-delà de 800 m et en zone transsonique, recalez toujours sur vos impacts réels. L’effet Coriolis n’est pas encore pris en compte.')),

    h('section', { class: 'card' },
      h('div', { class: 'label', style: { marginBottom: '6px' } }, 'À propos'),
      h('p', { style: { fontSize: '13px', margin: '0', lineHeight: '1.5' } }, 'Kronos ' + app.version + ' · fonctionne hors ligne une fois installé (menu du navigateur → « Ajouter à l’écran d’accueil »).'),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '6px 0 0' } }, 'Météo : Open-Meteo.com (CC BY 4.0), usage non commercial.')),

    h('button', { class: 'btn danger block', onClick: () => confirm({ title: 'Tout effacer ?', text: 'Armes, munitions, compteurs et réglages seront remplacés par les exemples de départ. Exportez une sauvegarde avant.', ok: 'Tout effacer', danger: true, onOk: () => { app.armeId = null; set(() => M.defaultState()); toast('Données réinitialisées'); } }) }, 'Réinitialiser l’application'));
}
