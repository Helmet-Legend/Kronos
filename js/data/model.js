// Modèle de données et opérations pures (testables sans navigateur).

export const SCHEMA = 1;

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function newLoad(o = {}) {
  return { id: uid('mun'), name: 'Nouvelle munition', bc: 0.45, model: 'G1', v0: 800, refTemp: 15, sens: 0, grains: 168, dMm: 7.82, lenMm: 31, measured: false, ...o };
}

export function newGun(o = {}) {
  const load = newLoad();
  return {
    id: uid('arme'), name: 'Nouvelle arme', cal: '', barrelMm: 600, twist: 254, twistDir: 'R',
    sight: { kind: 'scope', unit: 'MRAD', click: 0.1 }, sightH: 0.045, zero: 100,
    loads: [load], loadId: load.id,
    counter: { total: 0, since: 0, log: [] },
    ...o
  };
}

export function defaultState() {
  const f175 = newLoad({ id: 'mun_f175', name: 'Federal GMM 175 gr SMK', bc: 0.505, model: 'G1', v0: 792, sens: 0.5, grains: 175, dMm: 7.82, lenMm: 31.5 });
  const h178 = newLoad({ id: 'mun_h178', name: 'Hornady 178 gr ELD Match', bc: 0.275, model: 'G7', v0: 792, sens: 0.5, grains: 178, dMm: 7.82, lenMm: 34.9 });
  const ss = newLoad({ id: 'mun_ss', name: 's.S. 198 gr', bc: 0.495, model: 'G1', v0: 760, sens: 0.8, grains: 198, dMm: 8.22, lenMm: 33 });
  return {
    schema: SCHEMA,
    settings: { theme: 'dark', tableFrom: 100, tableTo: 1000, tableStep: 50, wakeLock: true },
    guns: [
      { id: 'arme_tld', name: 'Carabine .308', cal: '.308 Winchester', barrelMm: 610, twist: 279, twistDir: 'R', sight: { kind: 'scope', unit: 'MRAD', click: 0.1 }, sightH: 0.045, zero: 100,
        loads: [f175, h178], loadId: f175.id, counter: { total: 0, since: 0, log: [] } },
      { id: 'arme_k98', name: 'Mauser K98k', cal: '7,92x57 IS', barrelMm: 600, twist: 240, twistDir: 'R', sight: { kind: 'iron' }, sightH: 0.028, zero: 100,
        loads: [ss], loadId: ss.id, counter: { total: 0, since: 0, log: [] } }
    ],
    gunId: 'arme_tld',
    shot: { dist: 300, windSpeed: 2, windHour: 3, angleDeg: 0 },
    met: { t: 15, p: 1013, rh: 50, alt: 0, source: 'manual', at: null, wind: null, azimuth: null }
  };
}

export const activeGun = (s) => s.guns.find((g) => g.id === s.gunId) || s.guns[0];
export const activeLoad = (g) => g.loads.find((l) => l.id === g.loadId) || g.loads[0];

/** Ajoute des coups : le total ne peut que croître. */
export function addShots(gun, n, kind = 'tir', date = todayIso()) {
  const k = Math.max(0, Math.round(n));
  if (!k) return gun;
  return { ...gun, counter: { total: gun.counter.total + k, since: gun.counter.since + k, log: [...gun.counter.log, { d: date, n: k, k: kind }] } };
}

/** Nettoyage : remet le compteur partiel à zéro, le total est conservé. */
export function cleaned(gun, date = todayIso()) {
  return { ...gun, counter: { ...gun.counter, since: 0, log: [...gun.counter.log, { d: date, n: 0, k: 'nettoyage' }] } };
}

/** Annule la dernière saisie de coups (erreur de frappe), jamais en dessous de zéro. */
export function undoLast(gun) {
  const log = gun.counter.log.slice();
  const i = log.map((e) => e.k).lastIndexOf('tir');
  if (i < 0) return gun;
  const n = log[i].n;
  log.splice(i, 1, { ...log[i], k: 'annulé' });
  return { ...gun, counter: { total: Math.max(0, gun.counter.total - n), since: Math.max(0, gun.counter.since - n), log } };
}

export function replaceGun(s, gun) { return { ...s, guns: s.guns.map((g) => (g.id === gun.id ? gun : g)) }; }

export function updateLoad(gun, load) { return { ...gun, loads: gun.loads.map((l) => (l.id === load.id ? load : l)) }; }

export function removeLoad(gun, id) {
  if (gun.loads.length <= 1) return gun;
  const loads = gun.loads.filter((l) => l.id !== id);
  return { ...gun, loads, loadId: gun.loadId === id ? loads[0].id : gun.loadId };
}

export function removeGun(s, id) {
  if (s.guns.length <= 1) return s;
  const guns = s.guns.filter((g) => g.id !== id);
  return { ...s, guns, gunId: s.gunId === id ? guns[0].id : s.gunId };
}

const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;

/** Vérifie une munition ; renvoie la liste des problèmes en français. */
export function checkLoad(l) {
  const e = [];
  if (!l.name || !String(l.name).trim()) e.push('Nom manquant');
  if (!num(l.bc, 0.05, 1.5)) e.push('BC entre 0,05 et 1,5');
  if (l.model !== 'G1' && l.model !== 'G7') e.push('Modèle G1 ou G7');
  if (!num(l.v0, 100, 1500)) e.push('V0 entre 100 et 1500 m/s');
  if (!num(l.sens ?? 0, -5, 5)) e.push('Sensibilité entre −5 et 5 m/s par °C');
  return e;
}

export function checkGun(g) {
  const e = [];
  if (!g.name || !String(g.name).trim()) e.push('Nom manquant');
  if (!num(g.sightH, 0.005, 0.2)) e.push('Hauteur de visée entre 5 et 200 mm');
  if (!num(g.zero, 10, 1000)) e.push('Distance de zéro entre 10 et 1000 m');
  if (!num(g.twist, 100, 1000)) e.push('Pas de rayure entre 100 et 1000 mm');
  if (g.sight.kind === 'scope' && !num(g.sight.click, 0.01, 1)) e.push('Valeur de clic entre 0,01 et 1');
  return e;
}

/** Contrôle d'une sauvegarde importée. Renvoie { ok, state, error }. */
export function parseBackup(text) {
  let o;
  try { o = JSON.parse(text); } catch (err) { return { ok: false, error: 'Fichier illisible (JSON invalide)' }; }
  const s = o && o.app === 'kronos' ? o.state : o;
  if (!s || !Array.isArray(s.guns) || !s.guns.length) return { ok: false, error: 'Aucune arme dans ce fichier' };
  for (const g of s.guns) {
    if (!Array.isArray(g.loads) || !g.loads.length) return { ok: false, error: 'Arme sans munition : ' + (g.name || '?') };
    const pb = checkGun(g).concat(...g.loads.map(checkLoad));
    if (pb.length) return { ok: false, error: (g.name || 'Arme') + ' : ' + pb[0] };
    if (!g.counter) g.counter = { total: 0, since: 0, log: [] };
  }
  const d = defaultState();
  return { ok: true, state: { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, shot: { ...d.shot, ...(s.shot || {}) }, met: { ...d.met, ...(s.met || {}) }, schema: SCHEMA } };
}

export function makeBackup(s) {
  return JSON.stringify({ app: 'kronos', schema: SCHEMA, exportedAt: new Date().toISOString(), state: s }, null, 2);
}
