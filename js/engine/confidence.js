// Zone probable d'impact à 95 % : propagation des incertitudes par différences finies.
// Chaque facteur est un écart-type (1 σ) ; la zone affichée vaut ±2 σ sur chaque axe.
// Valeurs par défaut du cahier des charges : V0 ±12 m/s non mesurée, BC ±5 % (±1,5 % recalé),
// vent ±25 % (au moins 0,5 m/s, appliqué en plein travers), distance ±1 % (au moins 1 m),
// dispersion propre arme + tireur (MOA, groupement à 2 σ). Ce sont des hypothèses à valider au tir.

import { solve, spinDrift } from './solver.js';
import { MOA_IN_MRAD } from './units.js';

const at = (args, d, o = {}) => solve({ ...args, ...o, distances: o.distances || [d] }).rows;

/**
 * @param {object} args mêmes champs que solve() (gun, sight, load, met, zeroMet, shot)
 * @param {number} d distance (m)
 * @param {number} [dispersionMoa] dispersion arme + tireur (MOA)
 * @returns {null|{sy:number, sz:number, level:'HAUTE'|'MOYENNE'|'FAIBLE', rows:Array<{k:string,pct:number,var:number}>, main:string, advice:null|{hint:string, reduction:number}}}
 *   sy, sz : écarts-types vertical et latéral (m)
 */
export function confidence(args, d, dispersionMoa = 1.5) {
  const res = solve({ ...args, distances: [d] }), base = res.rows[0];
  if (!base || !base.reached) return null;
  const load = args.load, gun = args.gun;
  const v0Trued = (load.trueLog || []).some((e) => e.param === 'v0' && !e.undone);
  const bcTrued = !!load.bcTrued;
  const ws = (args.shot && args.shot.windSpeed) || 0;
  const F = [];
  const add = (k, dy, dz, ratio, hint) => F.push({ k, var: dy * dy + dz * dz, vy: dy * dy, vz: dz * dz, ratio, hint });

  // V0 (le zéro est recalculé : la lunette a été réglée avec la vraie munition)
  const sV0 = load.measured ? Math.max(2, load.sdV0 || 4) : v0Trued ? 5 : 12;
  const rV = at({ ...args, load: { ...load, v0: load.v0 + sV0 } }, d)[0];
  add('V0', rV && rV.reached ? rV.dropM - base.dropM : 0, 0, load.measured ? 1 : v0Trued ? 0.8 : 0.33, 'mesurer la V0 au chronographe');

  // BC
  const sBc = bcTrued ? 0.015 : 0.05;
  const rB = at({ ...args, load: { ...load, bc: load.bc * (1 + sBc) } }, d)[0];
  add('BC', rB && rB.reached ? rB.dropM - base.dropM : 0, 0, bcTrued ? 1 : 0.3, 'recaler le BC sur une séance entre 600 et 800 m');

  // Vent : incertitude de lecture en plein travers
  const sW = Math.max(0.5, 0.25 * ws);
  const rW = at({ ...args, shot: { ...args.shot, windSpeed: sW, windHour: 3 } }, d)[0];
  const rW0 = at({ ...args, shot: { ...args.shot, windSpeed: 0, windHour: 12 } }, d)[0];
  add('Vent', 0, rW && rW0 ? rW.windM - rW0.windM : 0, 0.5, 'lire le vent plus finement (fanions, anémomètre)');

  // Distance : on règle pour d, la cible est à d + σ
  const sD = Math.max(1, 0.01 * d);
  const rD = at(args, d, { distances: [d + sD] })[0];
  // impact par rapport au point visé quand la hausse est réglée pour d : y(d + σ) − y(d)·(d + σ)/d
  add('Distance', rD && rD.reached ? rD.dropM - base.dropM * (d + sD) / d : 0, 0, 0.5, 'mesurer la distance au télémètre');

  // Sens des rayures inconnu : la dérive gyroscopique devient une incertitude
  if (gun.twistDir === '?') {
    const sp = spinDrift(res.sg || 1.5, base.t);
    add('Gyro', 0, sp, 0, 'déterminer le sens des rayures (baguette de nettoyage)');
  }

  // Dispersion propre de l'arme et du tireur
  const sg = (dispersionMoa || 1.5) * MOA_IN_MRAD / 2 * d / 1000;
  add('Arme', sg, sg, 1, '');

  const vy = F.reduce((a, x) => a + x.vy, 0), vz = F.reduce((a, x) => a + x.vz, 0), tot = vy + vz;
  const sy = Math.sqrt(vy), sz = Math.sqrt(vz);
  let best = null;
  for (const x of F) { const gain = x.var * (1 - x.ratio * x.ratio); if (x.ratio < 1 && (!best || gain > best.gain)) best = { x, gain }; }
  const reduction = best ? Math.round((1 - Math.sqrt((tot - best.gain) / tot)) * 100) : 0;
  const R = 2 * Math.max(sy, sz) / d * 1000; // mrad
  const level = R <= 0.6 ? 'HAUTE' : R <= 1.5 ? 'MOYENNE' : 'FAIBLE';
  const rows = F.map((x) => ({ k: x.k, var: x.var, pct: Math.round(x.var / tot * 100) }));
  const main = rows.slice().sort((a, b) => b.var - a.var)[0].k;
  return { sy, sz, level, rows, main, advice: best && reduction >= 5 ? { hint: best.x.hint, reduction } : null };
}
