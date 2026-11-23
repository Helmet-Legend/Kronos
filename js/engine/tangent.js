// Hausse graduée (tangentielle, à curseur, à crans) : chaque cran correspond à un angle mécanique
// entre la ligne de visée et le canon, rarement égal à celui qu'il faudrait avec une munition moderne.
//   CALCULÉ : angle qui met la munition au point visé à la distance gravée (atmosphère standard).
//   MESURÉ  : angle réel déduit d'un tir (angle utilisé + (écart mesuré − écart prévu) / distance).
//   AJUSTÉ  : cran non mesuré, corrigé par interpolation linéaire des écarts des crans mesurés voisins.
// Un angle mesuré est mécanique : il reste valable quand on change de munition.

import { solve } from './solver.js';
import { ICAO } from './atmo.js';

/** Liste des crans gravés (m). */
export function cranList(t) {
  if (!t || !(t.step > 0) || !(t.max >= t.min)) return [];
  const out = [];
  for (let c = t.min; c <= t.max + 1e-9; c += t.step) out.push(Math.round(c));
  return out;
}

/** Angle (rad) qui met la munition au point visé à la distance d, dans des conditions données. */
export function angleFor(args, d, met = ICAO) {
  return solve({ ...args, gun: { ...args.gun, zero: d }, zeroMet: met, met, distances: [d] }).alpha;
}

/**
 * Angles de tous les crans.
 * @param {object} args arguments de solve() (gun, sight, load, met, shot)
 * @param {object} t { min, max, step, crans: { '<cran>': { mrad } } }
 * @returns {Map<number, {alpha:number, st:'meas'|'adj'|'calc'}>}
 */
export function cranAngles(args, t) {
  const list = cranList(t), meas = (t && t.crans) || {};
  const calc = new Map(list.map((c) => [c, angleFor(args, c)]));
  const mk = Object.keys(meas).map(Number).filter((c) => isFinite(meas[c] && meas[c].mrad)).sort((a, b) => a - b);
  const off = new Map(mk.map((c) => [c, meas[c].mrad / 1000 - (calc.has(c) ? calc.get(c) : angleFor(args, c))]));
  const out = new Map();
  for (const c of list) {
    if (off.has(c)) { out.set(c, { alpha: meas[c].mrad / 1000, st: 'meas' }); continue; }
    if (!mk.length) { out.set(c, { alpha: calc.get(c), st: 'calc' }); continue; }
    let lo = null, hi = null;
    for (const k of mk) { if (k < c) lo = k; if (k > c && hi === null) hi = k; }
    const o = lo !== null && hi !== null ? off.get(lo) + (c - lo) / (hi - lo) * (off.get(hi) - off.get(lo)) : off.get(lo !== null ? lo : hi);
    out.set(c, { alpha: calc.get(c) + o, st: 'adj' });
  }
  return out;
}

/** Cran qui laisse la plus petite tenue à la distance d dans les conditions du jour. */
export function bestCran(args, angles, d) {
  const need = angleFor(args, d, args.met);
  let best = null;
  for (const [c, a] of angles) if (best === null || Math.abs(a.alpha - need) < Math.abs(angles.get(best).alpha - need)) best = c;
  return best;
}

/**
 * Étalonnage d'un cran : angle réel (mrad) à partir d'un tir à la distance d avec ce cran.
 * @param {number} eM écart vertical mesuré du point moyen au point visé (m, positif : plus haut)
 * @returns {{mrad:number, predM:number, deltaMrad:number}|null}
 */
export function calibrateCran(args, alphaUsed, d, eM) {
  const r = solve({ ...args, alpha: alphaUsed, shot: { windSpeed: 0, windHour: 12, angleDeg: 0 }, distances: [d] }).rows[0];
  if (!r || !r.reached) return null;
  const real = alphaUsed + (eM - r.dropM) / d;
  return { mrad: real * 1000, predM: r.dropM, deltaMrad: (eM - r.dropM) / d * 1000 };
}

/**
 * Pour chaque distance, le cran qui laisse la plus petite tenue et la solution correspondante.
 * Une trajectoire par cran (toutes les distances à la fois) : rapide même pour une table complète.
 * @returns {Array<{d:number, cran:number, st:string, row:object}>}
 */
export function cranTable(args, angles, distances) {
  const best = distances.map(() => null);
  for (const [c, a] of angles) {
    const res = solve({ ...args, alpha: a.alpha, distances });
    res.rows.forEach((r, i) => {
      if (!r.reached) return;
      if (!best[i] || Math.abs(r.dropM) < Math.abs(best[i].row.dropM)) best[i] = { d: r.d, cran: c, st: a.st, row: r, sg: res.sg };
    });
  }
  return best;
}

let memo = { key: '', val: null };
/** cranAngles() avec mémoire du dernier calcul (l'écran Tir se redessine à chaque appui). */
export function cranAnglesCached(args, t) {
  const l = args.load, g = args.gun;
  const key = JSON.stringify([l.v0, l.bc, l.model, l.refTemp, l.sens, g.sightH, t]);
  if (memo.key !== key) memo = { key, val: cranAngles(args, t) };
  return memo.val;
}
