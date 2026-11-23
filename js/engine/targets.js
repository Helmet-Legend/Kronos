// Cibles du TAR (cotes en mm, diamètres extérieurs des zones 10 à 1) : règlement TAR FFTir 2025-2026
// (diffusion du 12/01/2026), chapitre VII.1, page 45. Le texte donne les zones, la mouche et le cordon ;
// le diamètre du visuel noir n'est pas écrit en clair : il est relevé sur les dessins officiels de la même page
// (anneaux restant hors du noir : 5 sur la C200 et la C200 50 %, 6 sur la C50).
// Comptage des points : « identique à celui appliqué en ISSF », aucune jauge (chapitre VIII).
// GRID : carton quadrillé sans visuel réglementaire (séances de réglage).

export const TARGETS = {
  C200: { name: 'C200 Mod.75', use: '200 m · fusils', w: 850, h: 850, zones: [80, 160, 240, 320, 400, 480, 560, 640, 720, 800], black: 400, blackFrom: 6, cordon: 3, blackConfirmed: true, blackSource: 'dessin du règlement TAR 2025-2026, VII.1' },
  C200_50: { name: 'C200 50 %', use: '100 m par dérogation (Dx uniquement)', w: 520, h: 530, zones: [40, 80, 120, 160, 200, 240, 280, 320, 360, 400], black: 200, blackFrom: 6, cordon: 1.5, blackConfirmed: true, blackSource: 'dessin du règlement TAR 2025-2026, VII.1' },
  C50: { name: 'C50', use: '25 m et 50 m', w: 550, h: 520, zones: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500], black: 200, blackFrom: 7, mouche: 25, blackConfirmed: true, blackSource: 'dessin du règlement TAR 2025-2026, VII.1 (RTG ISSF)' },
  GRID: { name: 'Quadrillage', use: 'réglage, toutes distances', w: 500, h: 500, zones: [], black: 0 }
};

/**
 * Points d'un impact (règle ISSF : un impact qui touche la ligne compte pour la zone supérieure).
 * @param {object} t cible, @param {number} x @param {number} y centre de l'impact (mm), @param {number} holeMm diamètre de l'ogive
 */
export function score(t, x, y, holeMm = 7.8) {
  if (!t.zones.length) return null;
  const r = Math.hypot(x, y) - holeMm / 2;
  for (let i = 0; i < t.zones.length; i++) if (r <= t.zones[i] / 2) return 10 - i;
  return 0;
}

/**
 * Épreuves TAR à l'arme d'épaule sur cible papier : règlement TAR FFTir 2025-2026 (fiches 810 à 823).
 * phases : [nom, durée (s), coups, position]. Total 25 coups dont 5 d'essai ; score sur 200.
 * Non reprises : 821 (biathlon), 830 à 832 (pistolet, gongs).
 */
const P200 = (pos, vitesseS) => [['Essais', 300, 5, pos], ['Précision', 420, 10, pos], ['Vitesse', vitesseS, 10, pos]];
export const EVENTS = [
  { id: '810', name: '810 · Fusil à répétition manuelle', dist: 200, target: 'C200', shots: 25, phases: P200('couché', 180), verified: true },
  { id: '811', name: '811 · Fusil modifié, gros calibre', dist: 200, target: 'C200', shots: 25, phases: P200('couché', 180), verified: true },
  { id: '812', name: '812 · Fusil modifié, petit calibre', dist: 200, target: 'C200', shots: 25, phases: P200('couché', 180), verified: true },
  { id: '813', name: '813 · Tout type, assis', dist: 200, target: 'C200', shots: 25, phases: P200('assis appui', 180), verified: true },
  { id: '815', name: '815 · Fusil semi-automatique, gros calibre', dist: 200, target: 'C200', shots: 25, phases: P200('couché', 60), verified: true },
  { id: '816', name: '816 · Fusil semi-automatique, petit calibre', dist: 200, target: 'C200', shots: 25, phases: P200('couché', 60), verified: true },
  { id: '820', name: '820 · Carabine militaire d’initiation 22LR', dist: 50, target: 'C50', shots: 25, phases: [['Essais', 300, 5, 'couché'], ['Précision', 420, 10, 'couché'], ['Vitesse', 300, 10, 'debout']], verified: true },
  { id: '822', name: '822 · Carabine militaire d’initiation 22LR, assis', dist: 50, target: 'C50', shots: 25, phases: [['Essais', 300, 5, 'assis appui'], ['Précision', 420, 10, 'assis appui'], ['Vitesse', 300, 10, 'assis sans appui']], verified: true },
  { id: '823', name: '823 · Carabine militaire match 22LR', dist: 50, target: 'C50', shots: 25, phases: [['Essais', 300, 5, 'couché'], ['Précision', 420, 10, 'couché'], ['Vitesse', 300, 10, 'debout']], verified: true }
];
/** Dérogation du règlement : épreuves à 200 m tirées à 100 m sur C200 50 % (Dx uniquement). */
export const DEROGATION_100 = { dist: 100, target: 'C200_50', note: 'dérogation 100 m sur C200 50 % (Dx uniquement)' };

/** Point visé (mm, origine au centre) : plein centre, ou bas du visuel noir en visée à 6 h. */
export function aimPoint(t, aim) {
  return { x: 0, y: aim === '6h' && t.black ? -t.black / 2 : 0 };
}

/** Total des points d'une série d'impacts. */
export function totalScore(t, shots, holeMm) {
  return shots.reduce((a, p) => a + (score(t, p.x, p.y, holeMm) || 0), 0);
}

/**
 * Chrono de match : phase en cours et temps restant.
 * @param {Array<[string, number]>} phases @param {number} elapsedS secondes écoulées depuis le début de l'épreuve
 * @returns {{index:number, name:string, left:number, done:boolean}}
 */
export function matchClock(phases, elapsedS) {
  let t = elapsedS;
  for (let i = 0; i < phases.length; i++) {
    if (t < phases[i][1]) return { index: i, name: phases[i][0], left: phases[i][1] - t, done: false };
    t -= phases[i][1];
  }
  return { index: phases.length - 1, name: phases[phases.length - 1][0], left: 0, done: true };
}
