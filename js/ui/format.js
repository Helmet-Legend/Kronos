// Formats français : virgule décimale, signe moins typographique.
export function num(v, d = 1) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  const x = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v;
  return x.toFixed(d).replace('.', ',').replace('-', '−');
}
export const int = (v) => (isFinite(v) ? Math.round(v).toLocaleString('fr-FR') : '—');
export const abs = (v, d = 1) => num(Math.abs(v), d);
export function dateFr(iso) {
  if (!iso) return '';
  const d = iso.slice(0, 10).split('-');
  return d[2] + '/' + d[1] + '/' + d[0];
}
export function timeFr(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
/** Lit un nombre saisi avec une virgule ou un point. */
export function parseNum(s) {
  if (typeof s === 'number') return s;
  const v = parseFloat(String(s).trim().replace(/\s/g, '').replace(',', '.').replace('−', '-'));
  return isFinite(v) ? v : NaN;
}
