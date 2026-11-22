// Atmosphère : masse volumique de l'air humide et vitesse du son.

export const ICAO = Object.freeze({ t: 15, p: 1013.25, rh: 0 });
/** Army Standard Metro, utilisée par plusieurs fabricants américains pour leurs tables. */
export const ASM = Object.freeze({ t: 15, p: 29.53 * 33.8639, rh: 78 });

/** Pression de vapeur saturante (hPa), formule de Tetens. */
export function saturationPressure(tc) {
  return 6.1078 * Math.pow(10, 7.5 * tc / (tc + 237.3));
}

/**
 * @param {number} t température (°C)
 * @param {number} p pression au poste de tir (hPa, pression station, pas QNH)
 * @param {number} rh humidité relative (%)
 * @returns {{rho:number, c:number}} masse volumique (kg/m³) et vitesse du son (m/s)
 */
export function air(t, p, rh) {
  const pv = Math.max(0, Math.min(100, rh)) / 100 * saturationPressure(t);
  const T = t + 273.15;
  const rho = (p - pv) * 100 / (287.058 * T) + pv * 100 / (461.495 * T);
  const c = 331.3 * Math.sqrt(1 + t / 273.15);
  return { rho, c };
}

/** Pression station estimée depuis le QNH et l'altitude (atmosphère standard). */
export function stationFromQnh(qnh, altM) {
  return qnh * Math.pow(1 - 2.25577e-5 * altM, 5.25588);
}

/** QNH estimé depuis la pression station et l'altitude. */
export function qnhFromStation(p, altM) {
  return p / Math.pow(1 - 2.25577e-5 * altM, 5.25588);
}
