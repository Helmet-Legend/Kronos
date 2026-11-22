// Conversions. Tout le moteur travaille en SI ; l'interface convertit au dernier moment.

export const MOA_IN_MRAD = 0.290888; // 1 MOA = 0,290888 mrad
export const GRAIN_KG = 6.479891e-5;
export const BC_SI = 703.0696; // lb/in² -> kg/m²
export const YARD = 0.9144, INCH = 0.0254, FPS = 0.3048, MPH = 0.44704;

export const mradToMoa = (m) => m / MOA_IN_MRAD;
export const moaToMrad = (m) => m * MOA_IN_MRAD;

/** Énergie en joules pour une masse en grains et une vitesse en m/s. */
export const energyJ = (grains, v) => 0.5 * grains * GRAIN_KG * v * v;

/** Valeur angulaire en mrad convertie dans l'unité de la lunette. */
export function toUnit(mrad, unit) { return unit === 'MOA' ? mradToMoa(mrad) : mrad; }

/** Nombre de clics (arrondi) pour une correction en mrad. */
export function clicks(mrad, unit, click) {
  if (!click) return 0;
  return Math.round(toUnit(mrad, unit) / click);
}
