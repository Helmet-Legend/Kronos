// Kronos — application. État unique, rendu complet à chaque changement (l'app est petite).
import { h, icon } from './ui/dom.js';
import * as store from './data/store.js';
import * as M from './data/model.js';
import { solve } from './engine/solver.js';
import { stationFromQnh } from './engine/atmo.js';
import { renderTir } from './ui/tir.js';
import { renderTable } from './ui/table.js';
import { renderArmes } from './ui/armes.js';
import { renderReglages } from './ui/reglages.js';
import { profileSheet, meteoSheet, shotsSheet, confirmSheet } from './ui/sheets.js';

const VERSION = '0.1.1';

export const app = {
  state: M.defaultState(),
  view: 'tir',        // tir | table | armes | reglages
  armeId: null,       // fiche d'arme ouverte dans l'onglet Armes
  sheet: null,        // { key, build: () => Element }
  sheetEl: null,
  toast: '',
  wake: null,
  version: VERSION
};

let saveTimer = null, toastTimer = null;

/** Applique une transformation d'état, sauvegarde (différée) et redessine. */
export function set(fn) {
  app.state = fn(app.state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.save(app.state), 250);
  render();
}

export function ui(o) { Object.assign(app, o); render(); }

export function toast(msg) {
  clearTimeout(toastTimer);
  app.toast = msg; render();
  toastTimer = setTimeout(() => { app.toast = ''; render(); }, 2800);
}

export function openSheet(key, build) { app.sheet = { key, build }; app.sheetEl = null; render(); }
export function closeSheet() { app.sheet = null; app.sheetEl = null; render(); }
export function confirm(o) { openSheet('confirm', () => confirmSheet(o)); }

/** Conditions de tir à utiliser pour le calcul. */
export function metForCalc(s) {
  const m = s.met;
  return { t: m.t, p: m.pMode === 'qnh' ? stationFromQnh(m.p, m.alt || 0) : m.p, rh: m.rh };
}

/** Résout le profil actif pour une liste de distances. */
export function compute(s, distances) {
  const g = M.activeGun(s), l = M.activeLoad(g);
  return {
    gun: g, load: l,
    res: solve({
      gun: { sightH: g.sightH, zero: g.zero, twist: g.twist, twistDir: g.twistDir },
      sight: g.sight, load: l, met: metForCalc(s), shot: s.shot, distances
    })
  };
}

/* ---------- Écran toujours allumé (Wake Lock) ---------- */
async function requestWake() {
  if (!app.state.settings.wakeLock || app.view !== 'tir' || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  if (app.wake) return;
  try { app.wake = await navigator.wakeLock.request('screen'); app.wake.addEventListener('release', () => { app.wake = null; }); } catch (e) { app.wake = null; }
}
function releaseWake() { if (app.wake) { app.wake.release().catch(() => {}); app.wake = null; } }

/* ---------- Rendu ---------- */
const TABS = [['tir', 'Tir'], ['table', 'Table'], ['armes', 'Armes'], ['reglages', 'Réglages']];
const THEMES = { dark: ['light', 'sun', 'Passer en thème clair'], light: ['night', 'eye', 'Passer en mode nuit (rouge)'], night: ['dark', 'moon', 'Passer en thème sombre'] };

function header() {
  const s = app.state, g = M.activeGun(s), l = M.activeLoad(g);
  const sightTxt = g.sight.kind === 'scope' ? g.sight.unit + ' ' + String(g.sight.click).replace('.', ',') : 'visée mécanique';
  const th = THEMES[s.settings.theme] || THEMES.dark;
  return h('header', { class: 'top' },
    h('button', { class: 'profile', onClick: () => openSheet('profile', profileSheet), 'aria-label': 'Changer d’arme ou de munition' },
      h('span', { class: 'grow' }, h('b', null, g.name), h('small', null, l.name + ' · ' + sightTxt + ' · zéro ' + g.zero + ' m')),
      icon('down')),
    h('button', { class: 'icon-btn', onClick: () => set((x) => ({ ...x, settings: { ...x.settings, theme: th[0] } })), 'aria-label': th[2], title: th[2] }, icon(th[1]))
  );
}

function nav() {
  return h('nav', { class: 'tabs', 'aria-label': 'Navigation principale' },
    TABS.map(([k, label]) => h('button', { 'aria-current': app.view === k ? 'page' : null, onClick: () => { ui({ view: k, armeId: k === 'armes' ? app.armeId : null }); k === 'tir' ? requestWake() : releaseWake(); } }, icon(k), label)));
}

const SCREENS = { tir: renderTir, table: renderTable, armes: renderArmes, reglages: renderReglages };

export function render() {
  const root = document.getElementById('app');
  if (!root) return;
  document.documentElement.dataset.theme = app.state.settings.theme;
  const prevMain = root.querySelector('main');
  const scroll = prevMain && prevMain.dataset.view === app.view ? prevMain.scrollTop : 0;
  const main = SCREENS[app.view]();
  main.dataset.view = app.view;

  let sheet = null;
  if (app.sheet) {
    if (!app.sheetEl || app.sheetEl.dataset.key !== app.sheet.key) {
      const inner = app.sheet.build();
      app.sheetEl = h('div', { class: 'scrim', onClick: (e) => { if (e.target === e.currentTarget) closeSheet(); } }, inner);
      app.sheetEl.dataset.key = app.sheet.key;
    }
    sheet = app.sheetEl;
  }
  const active = document.activeElement;
  const keepFocus = active && sheet && sheet.contains(active);
  root.replaceChildren(...[
    h('div', { class: 'shell' }, header(), main),
    nav(),
    sheet,
    app.toast ? h('div', { class: 'toast', role: 'status' }, app.toast) : null
  ].filter(Boolean));
  main.scrollTop = scroll;
  if (keepFocus) active.focus();
}

/* ---------- Démarrage ---------- */
export async function start() {
  const saved = await store.load();
  if (saved && Array.isArray(saved.guns) && saved.guns.length) {
    const d = M.defaultState();
    app.state = { ...d, ...saved, settings: { ...d.settings, ...saved.settings }, shot: { ...d.shot, ...saved.shot }, met: { ...d.met, ...saved.met } };
  }
  render();
  store.persist();
  requestWake();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') requestWake(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

export { M, requestWake, releaseWake };
