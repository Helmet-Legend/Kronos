// Cibles du règlement TAR FFTir 2025-2026, chapitre VII.1 (cotes en mm, diamètres extérieurs des zones 10 à 1).
// Le diamètre du noir n'est pas donné dans le texte : valeur indicative, à confirmer (blackConfirmed: false).
// GRID : carton quadrillé sans visuel réglementaire (séances de réglage).

export const TARGETS = {
  C200: { name: 'C200 Mod.75', use: '200 m · fusils', w: 850, h: 850, zones: [80, 160, 240, 320, 400, 480, 560, 640, 720, 800], black: 400, blackConfirmed: false },
  C200_50: { name: 'C200 50 %', use: '200 m (100 m par dérogation)', w: 520, h: 530, zones: [40, 80, 120, 160, 200, 240, 280, 320, 360, 400], black: 200, blackConfirmed: false },
  C50: { name: 'C50', use: '25 m et 50 m', w: 550, h: 520, zones: [50, 100, 150, 200, 250, 300, 350, 400, 450, 500], black: 200, mouche: 25, blackConfirmed: false },
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
