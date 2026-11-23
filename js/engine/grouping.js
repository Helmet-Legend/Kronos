// Analyse de groupement. Impacts en mm par rapport au point visé : x vers la droite, y vers le haut.
// Le point visé est le centre du visuel, la correction de Kronos étant appliquée : le point moyen
// mesure donc l'écart entre le réel et le calcul.

import { MOA_IN_MRAD } from './units.js';

/** mm à une distance en m → mrad (1 mm à 1 m = 1 mrad). */
export const mmToMrad = (mm, distM) => mm / distM;
export const mmToMoa = (mm, distM) => mm / distM / MOA_IN_MRAD;

/**
 * Statistiques d'un groupe.
 * @param {Array<{x:number,y:number}>} shots impacts dans l'ordre des tirs (mm)
 * @param {boolean} coldFirst le 1er impact est le coup à froid : exclu du point moyen et du rayon moyen,
 *   mais compté dans le groupement extrême
 * @returns {null|{n:number,nHot:number,es:number,mr:number,mx:number,my:number,cold:null|{x:number,y:number}}}
 */
export function groupStats(shots, coldFirst = false) {
  if (!shots || !shots.length) return null;
  const useCold = coldFirst && shots.length >= 2;
  const hot = useCold ? shots.slice(1) : shots;
  const n = hot.length;
  const mx = hot.reduce((a, p) => a + p.x, 0) / n;
  const my = hot.reduce((a, p) => a + p.y, 0) / n;
  let es = 0;
  for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) es = Math.max(es, Math.hypot(shots[i].x - shots[j].x, shots[i].y - shots[j].y));
  const mr = hot.reduce((a, p) => a + Math.hypot(p.x - mx, p.y - my), 0) / n;
  const cold = useCold ? { x: shots[0].x - mx, y: shots[0].y - my } : null;
  return { n: shots.length, nHot: n, es, mr, mx, my, cold };
}

/** Incertitude sur le point moyen (mm) : rayon moyen / √n. */
export const mpiUncertainty = (st) => (st && st.nHot ? st.mr / Math.sqrt(st.nHot) : Infinity);

/**
 * Clics pour ramener le point moyen au point visé.
 * @returns {{up:number, right:number}} clics à appliquer (positif : HAUT / DROITE)
 */
export function turretClicks(mx, my, distM, sight) {
  if (!sight || sight.kind !== 'scope' || !sight.click) return { up: 0, right: 0 };
  const k = sight.unit === 'MOA' ? MOA_IN_MRAD : 1;
  const step = sight.click * k; // mrad par clic
  return { up: Math.round(-my / distM / step) || 0, right: Math.round(-mx / distM / step) || 0 };
}

/**
 * Synthèse du coup à froid sur plusieurs séances (écarts ramenés en mrad pour comparer les distances).
 * Régulier si au moins 3 séances, écart vertical moyen ≥ 0,05 mrad et supérieur à deux fois son incertitude.
 * @param {Array<{dist:number, cold:{x:number,y:number}}>} list séances avec coup à froid
 */
export function coldBoreSummary(list) {
  const L = (list || []).filter((s) => s && s.cold && s.dist > 0);
  if (!L.length) return null;
  const ys = L.map((s) => mmToMrad(s.cold.y, s.dist)), xs = L.map((s) => mmToMrad(s.cold.x, s.dist));
  const n = L.length, my = ys.reduce((a, v) => a + v, 0) / n, mx = xs.reduce((a, v) => a + v, 0) / n;
  const sdY = n > 1 ? Math.sqrt(ys.reduce((a, v) => a + (v - my) * (v - my), 0) / (n - 1)) : 0;
  const regular = n >= 3 && Math.abs(my) >= 0.05 && Math.abs(my) > 2 * sdY / Math.sqrt(n);
  return { n, my, mx, sdY, regular, missing: Math.max(0, 3 - n) };
}

/** Cible et position (mm) d'un impact touché sur un dessin de w × h px représentant une cible de W × H mm. */
export function tapToMm(px, py, w, h, W, H) {
  return { x: Math.round((px / w - 0.5) * W), y: Math.round((0.5 - py / h) * H) };
}

/** Indice de l'impact le plus proche de p (mm) à moins de maxMm, sinon -1. */
export function nearestShot(shots, p, maxMm) {
  let best = -1, bd = Infinity;
  (shots || []).forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d <= maxMm && d < bd) { bd = d; best = i; } });
  return best;
}
