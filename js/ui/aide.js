// Premier lancement et aide : accueil en 3 écrans, bulles pédagogiques, panneau « ? ».
import { h } from './dom.js';
import { app, set, ui, openSheet, closeSheet, toast } from '../app.js';
import { frame, gunSheet } from './sheets.js';

export const TIPS = {
  hud: ['Lire le poste de tir', 'Les grands chiffres sont les corrections à appliquer : tournez la tourelle du nombre de clics indiqué, dans le sens indiqué. Avec une hausse graduée, Kronos indique le cran et de combien viser plus haut ou plus bas.'],
  zone: ['Zone probable d’impact', 'La balle a 95 % de chances d’arriver dans cette zone. La barre la plus longue montre ce qui vous coûte le plus en précision, et le conseil dit comment la réduire.'],
  wind: ['Régler le vent', 'Touchez l’heure d’où vient le vent : 12 h, il vous arrive de face ; 3 h, de la droite. Réglez ensuite sa vitesse avec − et +.'],
  tar: ['Simuler le tir TAR', 'Choisissez la cible et la visée (plein centre ou à 6 h). Le point orange montre où la balle va frapper avec le réglage actuel, la zone en pointillé sa dispersion probable. Touchez les impacts pour compter les points, ou lancez une épreuve chronométrée.'],
  table: ['La table de tir', 'Les corrections de 100 en 100 m (pas réglable) avec le vent du moment. La ligne surlignée correspond à la distance de l’écran Tir.'],
  arm: ['Vos armes', 'Chaque arme a ses munitions, sa visée, son compteur et son carnet de séances. Touchez une arme pour l’ouvrir, puis « Utiliser » pour qu’elle devienne l’arme active de tous les écrans.'],
  ent: ['Les deux compteurs', 'Le total depuis l’acquisition ne s’efface jamais. « Nettoyage fait » remet seulement le compteur depuis le nettoyage à zéro.'],
  seance: ['Saisir une séance', 'Touchez le centre de chaque trou, dans l’ordre des tirs. Le premier impact peut être marqué coup à froid : il est exclu du point moyen. Le zoom aide à placer les impacts d’un petit groupe.'],
  ladder: ['Développement de charge', 'Kronos ne fournit aucune charge : saisissez les bornes de votre manuel. Notez la V0 et le groupement de chaque palier ; au premier signe de pression, l’échelle s’arrête. La charge candidate est le milieu des 3 paliers où la V0 varie le moins.'],
  meteo: ['Météo', 'La météo automatique récupère température, pression au stand et humidité pour votre position. Hors réseau, saisissez les valeurs du baromètre ou du stand.']
};

const MORE = [
  ['Carnet de séance', 'Après un tir, touchez les impacts sur la cible dessinée ou sur sa photo : groupement, point moyen et coup à froid sont enregistrés avec la munition, la distance et la météo. Les coups s’ajoutent aux compteurs.'],
  ['Recalage V0 / BC', 'Si vos impacts tombent plus haut ou plus bas que prévu à longue distance, Kronos ajuste la V0 (non mesurée) ou le BC (V0 mesurée au chrono) pour coller au réel. Chaque recalage est daté et réversible.'],
  ['Coup à froid', 'Le premier coup, canon froid et propre, part souvent ailleurs. Au bout de 3 séances, Kronos dit s’il faut corriger ce premier coup et de combien.'],
  ['Hausse graduée', 'Pour une hausse tangentielle ou à crans, Kronos conseille le cran et la tenue restante. Étalonnez un cran au tir : son angle réel est enregistré et corrige les crans voisins.'],
  ['Fiabilité du calcul', 'Le moteur a été comparé à des tables Federal et Hornady et à un calculateur de référence jusqu’à 1 000 m (écart inférieur à 0,01 mrad). La qualité des données (V0, BC, distance, vent) compte bien plus : mesurez et recalez.']
];

const S = () => app.state.settings;
const setSettings = (o) => set((s) => ({ ...s, settings: { ...s.settings, ...o } }));

/**
 * Bulle à afficher sur un écran : la première non lue de la liste, dans l'ordre.
 * @param {string[]} keys bulles de l'écran
 */
export function tipCard(keys) {
  const st = S();
  if (st.tipsEnabled === false || !st.onboardingDone) return null;
  const seen = st.seenTips || [];
  const k = keys.find((x) => !seen.includes(x));
  if (!k) return null;
  return h('section', { class: 'tip', role: 'note', 'aria-label': 'Aide : ' + TIPS[k][0] },
    h('b', null, TIPS[k][0]), h('span', null, TIPS[k][1]),
    h('div', { class: 'row' },
      h('button', { class: 'btn small ghost', onClick: (e) => { e.currentTarget.closest('.tip').remove(); setSettings({ tipsEnabled: false }); toast('Bulles masquées : le bouton « ? » permet de les réafficher'); } }, 'Masquer toutes les bulles'),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn small primary', onClick: (e) => { e.currentTarget.closest('.tip').remove(); setSettings({ seenTips: [...(S().seenTips || []), k] }); } }, 'Compris')));
}

/* ---------- Accueil ---------- */
let step = 1, choice = 'explore';

export function onboardingOverlay() {
  if (S().onboardingDone) return null;
  const st = S();
  const sw = (label, text, on, fn) => h('button', { class: 'switch', role: 'switch', 'aria-checked': String(on), onClick: fn },
    h('span', { class: 'grow' }, h('b', null, label), h('small', null, text)), h('span', { class: 'knob', 'aria-hidden': 'true' }));
  const finish = () => {
    step = 1;
    setSettings({ onboardingDone: true });
    if (choice === 'add') { ui({ view: 'armes', armeId: null }); openSheet('gun-new', () => gunSheet(null)); }
  };
  let content;
  if (step === 1) content = [
    h('h1', null, 'Kronos'),
    h('p', { class: 'lead' }, 'Calculateur balistique hors ligne pour le tir sportif.'),
    [['1', 'Le bon réglage, tout de suite', 'Distance, vent et conditions : Kronos donne les clics ou le cran de hausse, avec la zone où la balle va arriver.'],
      ['2', 'Pensé pour le stand', 'Gros boutons, mode plein soleil et mode nuit, fonctionne sans réseau.'],
      ['3', 'Le carnet de vos armes', 'Munitions, chronographe, carnet de séances, recalage et compteur de coups.']].map(([n, t, x]) =>
      h('div', { class: 'point' }, h('span', { class: 'num mono' }, n), h('span', null, h('b', null, t), h('small', null, x))))];
  else if (step === 2) content = [
    h('h2', { class: 'onb-h' }, 'Pour commencer'),
    h('button', { class: 'item' + (choice === 'add' ? ' on' : ''), 'aria-pressed': String(choice === 'add'), onClick: () => { choice = 'add'; step = 3; ui({}); } },
      h('span', { class: 'grow' }, h('b', null, 'Ajouter ma première arme'), h('small', null, 'Nom, calibre, visée, puis la munition depuis le catalogue ou à la main.'))),
    h('button', { class: 'item' + (choice === 'explore' ? ' on' : ''), 'aria-pressed': String(choice === 'explore'), onClick: () => { choice = 'explore'; step = 3; ui({}); } },
      h('span', { class: 'grow' }, h('b', null, 'Explorer avec les exemples'), h('small', null, 'Une carabine .308 et un Mauser K98k sont déjà prêts. Vous pourrez les supprimer.')))];
  else content = [
    h('h2', { class: 'onb-h' }, 'Vos données restent ici'),
    h('p', { class: 'lead' }, 'Aucun compte, aucun serveur, aucun traqueur. Tout est enregistré sur ce téléphone ; seule la météo automatique envoie votre position à Open-Meteo quand vous la demandez.'),
    sw('Rappel de sauvegarde', 'Tous les 30 jours ou après 20 modifications', st.backupReminder !== false, () => setSettings({ backupReminder: st.backupReminder === false })),
    sw('Bulles pédagogiques', 'Une explication courte la première fois que vous ouvrez chaque écran', st.tipsEnabled !== false, () => setSettings({ tipsEnabled: st.tipsEnabled === false }))];
  return h('div', { class: 'onb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bienvenue dans Kronos' },
    h('div', { class: 'onb-body' }, content),
    h('div', { class: 'dots', 'aria-hidden': 'true' }, [1, 2, 3].map((i) => h('span', { class: i === step ? 'on' : i < step ? 'done' : '' }))),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onClick: () => { if (step === 1) { setSettings({ onboardingDone: true }); } else { step -= 1; ui({}); } } }, step === 1 ? 'Passer' : 'Retour'),
      h('button', { class: 'btn primary', onClick: () => { if (step < 3) { step += 1; ui({}); } else finish(); } }, step === 3 ? 'C’est parti' : 'Suivant')));
}

/* ---------- Panneau « ? » ---------- */
export function helpSheet() {
  const st = S();
  const n = (st.seenTips || []).length, total = Object.keys(TIPS).length;
  return frame('Aide',
    h('div', { class: 'card row' },
      h('span', { class: 'grow' }, h('b', null, 'Bulles pédagogiques'), h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '3px' } }, st.tipsEnabled === false ? 'Aucune bulle ne s’affiche' : n + ' sur ' + total + ' déjà lues')),
      h('button', { class: 'chip', role: 'switch', 'aria-checked': String(st.tipsEnabled !== false), 'aria-pressed': String(st.tipsEnabled !== false), onClick: () => { setSettings({ tipsEnabled: st.tipsEnabled === false }); openSheet('help2', helpSheet); } }, st.tipsEnabled === false ? 'Désactivées' : 'Activées')),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onClick: () => { setSettings({ seenTips: [], tipsEnabled: true }); closeSheet(); toast('Les bulles s’afficheront à nouveau'); } }, 'Réafficher les bulles'),
      h('button', { class: 'btn', onClick: () => { step = 1; closeSheet(); setSettings({ onboardingDone: false }); } }, 'Revoir l’accueil')),
    h('h2', null, 'Toutes les explications'),
    Object.values(TIPS).concat(MORE).map(([t, x]) => h('div', { class: 'card' }, h('b', null, t), h('p', { style: { margin: '4px 0 0', fontSize: '14px', lineHeight: '1.5' } }, x))));
}
