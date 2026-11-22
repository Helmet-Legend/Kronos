// Recalage (truing) : ajuste la V0 ou le BC d'une munition pour que le calcul retombe sur le point moyen observé.
// L'angle au zéro est recalculé à chaque essai (la lunette a été réglée au zéro avec la vraie munition).

import { solve } from './solver.js';

export const TRUE_MIN_DIST = 300;

/** Hauteur de la trajectoire (m, ligne de visée) à la distance d, sans vent ni site, pour une munition donnée. */
function yAt(base, load, d) {
  const r = solve({ ...base, load, shot: { windSpeed: 0, windHour: 12, angleDeg: 0 }, distances: [d] }).rows[0];
  return r && r.reached ? r.dropM : NaN;
}

/**
 * @param {object} o
 * @param {object} o.gun { sightH, zero, twist, twistDir }
 * @param {object} o.sight
 * @param {object} o.load munition (v0 à refTemp, bc, model…)
 * @param {object} o.met conditions de la séance ; @param {object} [o.zeroMet] conditions du zéro
 * @param {number} o.dist distance du tir (m)
 * @param {number} o.dyM écart vertical observé du point moyen (m, positif : plus haut que prévu)
 * @param {'auto'|'v0'|'bc'} [o.param] paramètre à ajuster ; auto : BC si la V0 est mesurée, sinon V0
 * @param {number} [o.mpiErrM] incertitude du point moyen (m), pour refuser un écart non significatif
 * @returns {{param:'v0'|'bc', auto:'v0'|'bc', from:number, to:number|null, warn:string|null, effect:null|{d:number,dyM:number,el1:number,el2:number}}}
 */
export function trueLoad(o) {
  const { gun, sight, load, met, zeroMet, dist, dyM } = o;
  const auto = load.measured ? 'bc' : 'v0';
  const param = o.param && o.param !== 'auto' ? o.param : auto;
  const base = { gun, sight, met, zeroMet };
  const withP = (v) => (param === 'v0' ? { ...load, v0: v } : { ...load, bc: v });
  const from = param === 'v0' ? load.v0 : load.bc;
  const fn = (v) => yAt(base, withP(v), dist);
  const target = fn(from) + dyM;
  let lo = param === 'v0' ? from - 150 : from * 0.6, hi = param === 'v0' ? from + 150 : from * 1.5;
  let to = null;
  const flo = fn(lo), fhi = fn(hi);
  if (isFinite(flo) && isFinite(fhi) && flo <= target && fhi >= target) {
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fn(mid) < target) lo = mid; else hi = mid; }
    to = (lo + hi) / 2;
  }

  let warn = null;
  const minD = Math.max(TRUE_MIN_DIST, 2 * gun.zero);
  if (dist < minD) warn = 'À moins de ' + minD + ' m, l’écart dû à la V0 ou au BC est trop faible : recalez plutôt entre 400 et 800 m.';
  else if (!dyM) warn = 'Aucun écart saisi : le calcul tombe déjà sur votre point moyen.';
  else if (o.mpiErrM !== undefined && Math.abs(dyM) <= 2 * o.mpiErrM) warn = 'Écart peu significatif face à l’incertitude du point moyen (±' + (2 * o.mpiErrM * 100).toFixed(1).replace('.', ',') + ' cm). Tirez plus de coups avant de recaler.';
  else if (to === null) warn = 'Écart hors des bornes (V0 ±150 m/s, BC ×0,6 à ×1,5) : vérifiez la distance, le zéro et la saisie.';

  let effect = null;
  if (to !== null) {
    const d2 = Math.max(dist, 800);
    const y1 = yAt(base, load, d2), y2 = yAt(base, withP(to), d2);
    effect = { d: d2, dyM: y2 - y1, el1: -y1 / d2 * 1000, el2: -y2 / d2 * 1000 };
  }
  return { param, auto, from, to, warn, effect };
}
