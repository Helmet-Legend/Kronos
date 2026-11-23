// Sensibilité de la poudre apprise : régression linéaire (moindres carrés) de la V0 mesurée
// en fonction de la température de la poudre. Proposée à partir de 3 mesures et 10 °C d'écart.

export const MIN_POINTS = 3, MIN_SPAN = 10;

/**
 * @param {Array<{t:number, v0:number}>} log mesures (°C, m/s)
 * @returns {null|{n:number, slope:number, intercept:number, r2:number, span:number, ok:boolean, at:(t:number)=>number}}
 */
export function powderFit(log) {
  const L = (log || []).filter((m) => isFinite(m.t) && isFinite(m.v0));
  const n = L.length;
  if (n < 2) return null;
  const mt = L.reduce((a, m) => a + m.t, 0) / n, mv = L.reduce((a, m) => a + m.v0, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const m of L) { sxy += (m.t - mt) * (m.v0 - mv); sxx += (m.t - mt) ** 2; syy += (m.v0 - mv) ** 2; }
  const slope = sxx > 0 ? sxy / sxx : 0, intercept = mv - slope * mt;
  const r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
  const ts = L.map((m) => m.t), span = Math.max(...ts) - Math.min(...ts);
  return { n, slope, intercept, r2, span, ok: n >= MIN_POINTS && span >= MIN_SPAN, at: (t) => intercept + slope * t };
}
