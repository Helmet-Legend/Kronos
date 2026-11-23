// Comparateur de munitions : mêmes conditions pour toutes (zéro, hausse, météo, vent plein travers).
import { solve } from './solver.js';
import { energyJ } from './units.js';

export const COMPARE_DISTS = [100, 200, 300, 400, 500, 600, 800, 1000];
export const MAX_COMPARE = 4;

/**
 * @param {Array<{name:string, bc:number, model:'G1'|'G7', v0:number, grains?:number}>} loads
 * @param {object} o { met, zero (m), sightH (m), windSpeed (m/s), distances }
 * @returns {Array<{name:string, v0:number, e0:number|null, rows:Array, superRange:number|null, superMax:boolean}>}
 *   rows : { d, reached, dropCm, elMrad, windCm, windMrad, v, e, mach }
 *   superRange : dernière distance (pas de 25 m) encore au-dessus de Mach 1,2 ; superMax : vraie jusqu'à 2 500 m
 */
export function compareLoads(loads, o) {
  const ds = o.distances || COMPARE_DISTS;
  const scan = []; for (let d = 25; d <= 2500; d += 25) scan.push(d);
  return loads.map((l) => {
    const args = { gun: { sightH: o.sightH ?? 0.045, zero: o.zero ?? 100, twistDir: '?' }, sight: { kind: 'scope', unit: 'MRAD', click: 0.1 },
      load: { bc: l.bc, model: l.model, v0: l.v0, refTemp: 15, sens: 0 }, met: o.met, zeroMet: o.met, shot: { windSpeed: o.windSpeed ?? 4, windHour: 3, angleDeg: 0 } };
    const res = solve({ ...args, distances: ds });
    const rows = res.rows.map((r) => (r.reached ? { d: r.d, reached: true, dropCm: r.dropM * 100, elMrad: r.elMrad, windCm: Math.abs(r.windM) * 100, windMrad: Math.abs(r.windM) / r.d * 1000, v: r.v, e: l.grains ? energyJ(l.grains, r.v) : null, mach: r.mach } : { d: r.d, reached: false }));
    const all = solve({ ...args, shot: { ...args.shot, windSpeed: 0 }, distances: scan }).rows;
    let superRange = null;
    for (const r of all) { if (r.reached && r.mach >= 1.2) superRange = r.d; else break; }
    return { name: l.name, v0: res.v0, e0: l.grains ? energyJ(l.grains, res.v0) : null, rows, superRange, superMax: superRange === 2500 };
  });
}
