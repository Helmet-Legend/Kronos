// Modèle de données et opérations pures (testables sans navigateur).

export const SCHEMA = 2; // 2 : carnet de séances (gun.sessions) et recalages (load.trueLog)

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function newLoad(o = {}) {
  return { id: uid('mun'), name: 'Nouvelle munition', bc: 0.45, model: 'G1', v0: 800, refTemp: 15, sens: 0, grains: 168, dMm: 7.82, lenMm: 31, measured: false, trueLog: [], chronoLog: [], ...o };
}

export function newGun(o = {}) {
  const load = newLoad();
  return {
    id: uid('arme'), name: 'Nouvelle arme', cal: '', barrelMm: 600, twist: 254, twistDir: 'R',
    sight: { kind: 'scope', unit: 'MRAD', click: 0.1 }, sightH: 0.045, zero: 100,
    loads: [load], loadId: load.id,
    counter: { total: 0, since: 0, log: [] },
    sessions: [],
    dispersionMoa: 1.5,
    ...o
  };
}

export function defaultState() {
  const f175 = newLoad({ id: 'mun_f175', name: 'Federal GMM 175 gr SMK', bc: 0.505, model: 'G1', v0: 792, sens: 0.5, grains: 175, dMm: 7.82, lenMm: 31.5 });
  const h178 = newLoad({ id: 'mun_h178', name: 'Hornady 178 gr ELD Match', bc: 0.275, model: 'G7', v0: 792, sens: 0.5, grains: 178, dMm: 7.82, lenMm: 34.9 });
  const ss = newLoad({ id: 'mun_ss', name: 's.S. 198 gr', bc: 0.495, model: 'G1', v0: 760, sens: 0.8, grains: 198, dMm: 8.22, lenMm: 33 });
  return {
    schema: SCHEMA,
    settings: { theme: 'dark', tableFrom: 100, tableTo: 1000, tableStep: 50, wakeLock: true, lastBackupIso: null, changesSinceBackup: 0, backupReminder: true, onboardingDone: false, tipsEnabled: true, seenTips: [] },
    guns: [
      { id: 'arme_tld', name: 'Carabine .308', cal: '.308 Winchester', barrelMm: 610, twist: 279, twistDir: 'R', sight: { kind: 'scope', unit: 'MRAD', click: 0.1 }, sightH: 0.045, zero: 100,
        loads: [f175, h178], loadId: f175.id, counter: { total: 0, since: 0, log: [] }, sessions: [], dispersionMoa: 1 },
      { id: 'arme_k98', name: 'Mauser K98k', cal: '7,92x57 IS', barrelMm: 600, twist: 240, twistDir: 'R', sight: { kind: 'iron', tangent: { min: 100, max: 2000, step: 100, crans: {} } }, sightH: 0.028, zero: 100,
        loads: [ss], loadId: ss.id, counter: { total: 0, since: 0, log: [] }, sessions: [], dispersionMoa: 3 }
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

/* ---------- Carnet de séances ---------- */

/**
 * Enregistre une séance : impacts bruts (mm, origine au point visé), aucune valeur dérivée stockée.
 * Les coups s'ajoutent aux deux compteurs, avec une ligne « séance » au journal.
 */
export function addSession(gun, o) {
  const shots = (o.shots || []).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  const load = gun.loads.find((l) => l.id === o.loadId) || activeLoad(gun);
  const rec = {
    id: uid('seance'), d: o.d || todayIso(), dist: o.dist, loadId: load.id, loadName: load.name,
    target: o.target || 'GRID', coldFirst: !!o.coldFirst && shots.length >= 2,
    met: o.met ? { t: o.met.t, p: o.met.p, rh: o.met.rh } : null,
    wind: o.wind ? { speed: o.wind.speed, hour: o.wind.hour } : null,
    cran: o.cran || null,
    shots
  };
  const g = addShots(gun, shots.length, 'séance', rec.d);
  return { ...g, sessions: [...(gun.sessions || []), rec] };
}

/** Supprime une séance du carnet (les coups restent comptés : le compteur ne baisse jamais). */
export function removeSession(gun, id) {
  return { ...gun, sessions: (gun.sessions || []).filter((x) => x.id !== id) };
}

/* ---------- Chronographe ---------- */

/** Ajoute une mesure de V0 au chronographe (température de la poudre, moyenne, nombre de tirs, écart-type). */
export function addChrono(gun, loadId, m) {
  const l = gun.loads.find((x) => x.id === loadId);
  if (!l) return gun;
  const e = { id: uid('chrono'), d: m.d || todayIso(), t: m.t, v0: m.v0, n: m.n || null, sd: m.sd || null };
  return updateLoad(gun, { ...l, chronoLog: [...(l.chronoLog || []), e] });
}

export function removeChrono(gun, loadId, id) {
  const l = gun.loads.find((x) => x.id === loadId);
  if (!l) return gun;
  return updateLoad(gun, { ...l, chronoLog: (l.chronoLog || []).filter((e) => e.id !== id) });
}

/**
 * V0 mesurée appliquée à la munition. Avec une régression valable : sensibilité et V0 à la température de référence.
 * Sinon : la dernière mesure ramenée à la température de référence avec la sensibilité actuelle.
 */
export function applyChrono(gun, loadId, fit) {
  const l = gun.loads.find((x) => x.id === loadId);
  const log = (l && l.chronoLog) || [];
  if (!l || !log.length) return gun;
  const ref = l.refTemp ?? 15;
  let v0, sens = l.sens || 0;
  if (fit && fit.ok) { sens = Math.round(fit.slope * 100) / 100; v0 = fit.at(ref); } else { const m = log[log.length - 1]; v0 = m.v0 - sens * (m.t - ref); }
  const sds = log.map((m) => m.sd).filter((x) => x > 0);
  return updateLoad(gun, { ...l, v0: Math.round(v0), sens, measured: true, sdV0: sds.length ? sds[sds.length - 1] : l.sdV0 });
}

/* ---------- Hausse graduée ---------- */

/** Enregistre l'angle réel mesuré d'un cran. */
export function setCranAngle(gun, cran, o) {
  const t = gun.sight.tangent;
  if (!t) return gun;
  const entry = { mrad: Math.round(o.mrad * 10000) / 10000, d: o.d || todayIso(), dist: o.dist, offCm: o.offCm };
  return { ...gun, sight: { ...gun.sight, tangent: { ...t, crans: { ...(t.crans || {}), [String(cran)]: entry } } } };
}

/** Remet un cran en « calculé ». */
export function clearCranAngle(gun, cran) {
  const t = gun.sight.tangent;
  if (!t || !t.crans) return gun;
  const crans = { ...t.crans }; delete crans[String(cran)];
  return { ...gun, sight: { ...gun.sight, tangent: { ...t, crans } } };
}

/* ---------- Recalage ---------- */

/** Applique un recalage V0 ou BC, daté et historisé. */
export function applyTruing(gun, loadId, t) {
  const l = gun.loads.find((x) => x.id === loadId);
  if (!l || t.to === null || t.to === undefined) return gun;
  const to = t.param === 'v0' ? Math.round(t.to) : Math.round(t.to * 1000) / 1000;
  const entry = { id: uid('rec'), d: t.d || todayIso(), dist: t.dist, dyCm: Math.round(t.dyM * 1000) / 10, param: t.param, from: t.from, to, sessionId: t.sessionId || null };
  const nl = { ...l, [t.param]: to, trueLog: [...(l.trueLog || []), entry] };
  if (t.param === 'bc') nl.bcTrued = true;
  return updateLoad(gun, nl);
}

/** Annule le dernier recalage : la valeur précédente revient, la ligne reste barrée dans l'historique. */
export function undoTruing(gun, loadId) {
  const l = gun.loads.find((x) => x.id === loadId);
  const log = (l && l.trueLog) || [];
  const i = log.map((e) => !!e.undone).lastIndexOf(false);
  if (i < 0) return gun;
  const e = log[i];
  const nlog = log.slice(); nlog[i] = { ...e, undone: true };
  const nl = { ...l, [e.param]: e.from, trueLog: nlog };
  if (e.param === 'bc') nl.bcTrued = nlog.some((x) => x.param === 'bc' && !x.undone);
  return updateLoad(gun, nl);
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
  const t = g.sight.kind === 'iron' && g.sight.tangent;
  if (t && !(num(t.min, 25, 2500) && num(t.max, t.min, 2500) && num(t.step, 25, 500) && (t.max - t.min) / t.step <= 100)) e.push('Crans de hausse : du premier au dernier entre 25 et 2500 m, pas de 25 à 500 m');
  if (g.dispersionMoa !== undefined && !num(g.dispersionMoa, 0.2, 10)) e.push('Dispersion entre 0,2 et 10 MOA');
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
  migrate(s);
  const d = defaultState();
  const known = s.settings && s.settings.onboardingDone === undefined ? { onboardingDone: true } : {};
  return { ok: true, state: { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}), ...known }, shot: { ...d.shot, ...(s.shot || {}) }, met: { ...d.met, ...(s.met || {}) }, schema: SCHEMA } };
}

/** Met un état d'une version antérieure au schéma courant (en place). */
export function migrate(s) {
  for (const g of s.guns || []) {
    if (!Array.isArray(g.sessions)) g.sessions = [];
    if (typeof g.dispersionMoa !== 'number') g.dispersionMoa = 1.5;
    for (const l of g.loads || []) { if (!Array.isArray(l.trueLog)) l.trueLog = []; if (!Array.isArray(l.chronoLog)) l.chronoLog = []; }
  }
  s.schema = SCHEMA;
  return s;
}

/** Sauvegarde à rappeler ? Plus de 30 jours depuis la dernière, ou plus de 20 modifications. Renvoie le motif ou null. */
export function backupDue(settings, now = Date.now()) {
  if (settings.backupReminder === false) return null;
  const n = settings.changesSinceBackup || 0;
  if (n > 20) return n + ' modifications depuis la dernière sauvegarde';
  if (settings.lastBackupIso) {
    const days = Math.floor((now - Date.parse(settings.lastBackupIso)) / 86400000);
    if (days > 30 && n > 0) return 'dernière sauvegarde il y a ' + days + ' jours';
  }
  return null;
}

/** Marque une sauvegarde faite. */
export function backupDone(s, iso = new Date().toISOString()) {
  return { ...s, settings: { ...s.settings, lastBackupIso: iso, changesSinceBackup: 0 } };
}

export function makeBackup(s) {
  return JSON.stringify({ app: 'kronos', schema: SCHEMA, exportedAt: new Date().toISOString(), state: s }, null, 2);
}
