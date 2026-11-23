// Cibles du TAR (cotes en mm, diamètres extérieurs des zones 10 à 1).
// Zones : règlement TAR FFTir 2025-2026, chapitre VII.1.
// Visuel noir (recherche du 23/11/2026, règlement officiel non lu : fftir.org inaccessible depuis la session) :
//   C200 Mod.75 : 400 mm, zones 6 à 10, 10 de 80 mm sans mouche (fiches C200 GEF 1975, règlement MLAIC cité) ;
//   C200 50 %   : 200 mm, zones 6 à 10, 10 de 40 mm (cible « C200 réduction 100 m » Gravolux, la C200 divisée par deux) ;
//   C50         : 200 mm, zones 7 à 10, mouche 25 mm (règles ISSF, fiches fabricants).
// blackSource décrit l'origine ; blackConfirmed passera à true quand le règlement aura été lu.
// GRID : carton quadrillé sans visuel réglementaire (séances de réglage).

export const TARGETS = {
  C200: { name: 'C200 Mod.75', use: '200 m · fusils', w: 850, h: 850, zones: [80, 160, 240, 320, 400, 480, 560, 640, 720, 800], black: 400, blackFrom: 6, blackConfirmed: false, blackSource: 'fabricants et règlement MLAIC, à vérifier sur le règlement TAR' },
  C200_50: { name: 'C200 50 %', use: '200 m (100 m par dérogation)', w: 520, h: 530, zones: [40, 80, 120, 160, 200, 240, 280, 320, 360, 400], black: 200, blackFrom: 6, blackConfirmed: false, blackSource: 'cible Gravolux réduction 100 m, à vérifier sur le règlement TAR' },
  C50: { name: 'C50', use: '25 m et 50 m', w: 550, h: 520, zones: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500], black: 200, blackFrom: 7, mouche: 25, blackConfirmed: false, blackSource: 'règles ISSF et fabricants, à vérifier sur le règlement TAR' },
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
 * Épreuves TAR proposées en mode match. Données reprises de la maquette : distances, cibles, nombre de coups
 * et durées des phases sont À VÉRIFIER sur le règlement TAR en vigueur (verified: false).
 * phases : [nom, durée en secondes]
 */
export const EVENTS = [
  { id: '810', name: '810 · Répétition manuelle', dist: 200, target: 'C200', shots: 25, phases: [['Essais', 300], ['Précision', 420], ['Vitesse', 180]], verified: false },
  { id: '813', name: '813 · Tout type assis', dist: 200, target: 'C200', shots: 25, phases: [['Essais', 300], ['Précision', 420], ['Vitesse', 180]], verified: false },
  { id: '815', name: '815 · Semi-automatique gros calibre', dist: 200, target: 'C200', shots: 25, phases: [['Essais', 300], ['Précision', 420], ['Vitesse', 60]], verified: false },
  { id: '823', name: '823 · Carabine match', dist: 50, target: 'C50', shots: 25, phases: [['Essais', 300], ['Précision', 420], ['Vitesse', 300]], verified: false }
];

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
