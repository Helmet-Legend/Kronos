// Développement de charge (méthode des manuels de rechargement, sans aucune table de charges).
// Le tireur saisit la source, la charge de départ et la charge maximale de son manuel ; Kronos ne propose
// jamais de valeur au-delà du maximum saisi. Un seul signe de pression arrête l'échelle.

export const SIGNS = {
  primerFlat: 'Amorce aplatie',
  primerPierced: 'Amorce percée',
  hardExtraction: 'Extraction dure',
  ejectorMark: 'Marque d’éjecteur',
  caseDamage: 'Étui gonflé ou fendu'
};
export const MAX_STEPS = 20;
export const STEP_CHOICES = [0.2, 0.3, 0.5];

const r1 = (x) => Math.round(x * 10) / 10;

/** Paliers de start à max (inclus si atteint exactement), jamais au-delà de max. Null si plus de 20 paliers. */
export function buildSteps(start, max, step) {
  if (!(start > 0 && max > start && step > 0)) return null;
  const out = [];
  for (let i = 0; ; i++) {
    const gr = r1(start + i * step);
    if (gr > max + 1e-9) break;
    out.push(gr);
    if (out.length > MAX_STEPS) return null;
  }
  return out;
}

/**
 * Analyse de l'échelle.
 * @param {Array<{gr:number, v0?:number|null, signs?:string[]}>} steps dans l'ordre croissant
 * @returns {{stopAt:number|null, candidate:null|{index:number, gr:number, spread:number, from:number, to:number}, reason:string}}
 *   stopAt : indice du premier palier avec un signe de pression (lui et les suivants sont à l'arrêt)
 */
export function analyzeLadder(steps) {
  const stopAt = steps.findIndex((s) => s.signs && s.signs.length);
  const usable = (stopAt < 0 ? steps : steps.slice(0, stopAt));
  let best = null;
  for (let i = 0; i + 2 < usable.length; i++) {
    const w = usable.slice(i, i + 3);
    if (!w.every((s) => isFinite(s.v0) && s.v0 > 0)) continue;
    const vs = w.map((s) => s.v0), spread = Math.max(...vs) - Math.min(...vs);
    if (!best || spread < best.spread) best = { index: i + 1, gr: w[1].gr, spread, from: w[0].gr, to: w[2].gr };
  }
  let reason;
  if (best) reason = 'Fenêtre la plus stable : ' + best.from + ' à ' + best.to + ' gr.';
  else if (stopAt === 0) reason = 'Signe de pression dès la charge de départ : arrêtez et revoyez la recette avec votre manuel.';
  else reason = 'Il faut la V0 de 3 paliers consécutifs avant tout signe de pression.';
  return { stopAt: stopAt < 0 ? null : stopAt, candidate: best, reason };
}
