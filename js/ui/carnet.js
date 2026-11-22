// Carnet de séance : saisie des impacts, carnet de l'arme, recalage V0 / BC.
import { h, fill } from './dom.js';
import { num, int, dateFr } from './format.js';
import { app, set, closeSheet, openSheet, toast, confirm, metForCalc, M } from '../app.js';
import { frame } from './sheets.js';
import { groupStats, mpiUncertainty, turretClicks, coldBoreSummary, mmToMoa } from '../engine/grouping.js';
import { TARGETS } from '../engine/targets.js';
import { trueLoad, TRUE_MIN_DIST } from '../engine/truing.js';
import { MOA_IN_MRAD } from '../engine/units.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** Écart en mm affiché en cm avec son sens (pos : sens positif, neg : sens négatif). */
const cm = (mm, pos, neg) => (Math.abs(mm) < 0.5 ? '0 cm' : num(Math.abs(mm) / 10, 1) + ' cm ' + (mm > 0 ? pos : neg));
const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
const TARGET_ORDER = ['C200', 'C200_50', 'C50', 'GRID'];

/** Statistiques d'une séance enregistrée (rien de dérivé n'est stocké). */
export function sessionStats(x) { return groupStats(x.shots, x.coldFirst); }

/* ---------- Dessin de cible (SVG, coordonnées en mm, y vers le haut) ---------- */
function targetSvg(T, o) {
  const z = o.zoom || 1, W = T.w / z, H = T.h / z;
  const vb = [-W / 2, -H / 2, W, H];
  const pxPerMm = (o.px || 340) / W;
  const kids = [h('rect', { x: String(-T.w / 2), y: String(-T.h / 2), width: String(T.w), height: String(T.h), fill: 'var(--paper)' })];
  if (o.photo) {
    kids.push(h('image', { href: o.photo, x: String(-T.w / 2), y: String(-T.h / 2), width: String(T.w), height: String(T.h), preserveAspectRatio: 'xMidYMid slice' }));
  } else {
    const step = T.zones.length ? 50 : 10;
    for (let v = -Math.floor(T.w / 2 / step) * step; v <= T.w / 2; v += step) {
      const major = v % 50 === 0;
      kids.push(h('line', { x1: String(v), y1: String(-T.h / 2), x2: String(v), y2: String(T.h / 2), stroke: 'var(--grid)', 'stroke-width': String((major ? 1.4 : 0.6) / pxPerMm) }));
    }
    for (let v = -Math.floor(T.h / 2 / step) * step; v <= T.h / 2; v += step) {
      const major = v % 50 === 0;
      kids.push(h('line', { x1: String(-T.w / 2), y1: String(v), x2: String(T.w / 2), y2: String(v), stroke: 'var(--grid)', 'stroke-width': String((major ? 1.4 : 0.6) / pxPerMm) }));
    }
    if (T.black) kids.push(h('circle', { cx: '0', cy: '0', r: String(T.black / 2), fill: 'var(--ink)' }));
    for (const d of T.zones) kids.push(h('circle', { cx: '0', cy: '0', r: String(d / 2), fill: 'none', stroke: d <= T.black ? 'var(--paper)' : 'var(--ink)', 'stroke-width': String(1.2 / pxPerMm) }));
    if (T.mouche) kids.push(h('circle', { cx: '0', cy: '0', r: String(T.mouche / 2), fill: 'none', stroke: 'var(--paper)', 'stroke-width': String(1.2 / pxPerMm) }));
    if (!T.zones.length) {
      const k = 12 / pxPerMm;
      kids.push(h('line', { x1: String(-k), y1: '0', x2: String(k), y2: '0', stroke: 'var(--ink)', 'stroke-width': String(2 / pxPerMm) }));
      kids.push(h('line', { x1: '0', y1: String(-k), x2: '0', y2: String(k), stroke: 'var(--ink)', 'stroke-width': String(2 / pxPerMm) }));
    }
  }
  const holeR = Math.max((o.holeMm || 7.8) / 2, 5 / pxPerMm);
  (o.shots || []).forEach((p, i) => {
    const isCold = o.coldFirst && i === 0 && o.shots.length >= 2;
    kids.push(h('circle', { cx: String(p.x), cy: String(-p.y), r: String(holeR), fill: isCold ? 'var(--violet)' : 'var(--amber)', stroke: 'var(--paper)', 'stroke-width': String(1.5 / pxPerMm) }));
  });
  if (o.st && o.st.nHot >= 2) {
    const k = 14 / pxPerMm, mx = o.st.mx, my = -o.st.my, w = String(3 / pxPerMm);
    kids.push(h('line', { x1: String(mx - k), y1: String(my), x2: String(mx + k), y2: String(my), stroke: 'var(--cyan)', 'stroke-width': w }));
    kids.push(h('line', { x1: String(mx), y1: String(my - k), x2: String(mx), y2: String(my + k), stroke: 'var(--cyan)', 'stroke-width': w }));
  }
  return h('svg', { viewBox: vb.join(' '), width: '100%', style: { display: 'block', aspectRatio: T.w + ' / ' + T.h }, 'aria-hidden': 'true' }, kids);
}

function statTiles(st, dist) {
  const tile = (label, a, b) => h('div', { class: 'stat' }, h('span', null, label), h('b', { class: 'mono' }, a), h('span', { class: 'muted', style: { fontSize: '11px' } }, b));
  return h('div', { class: 'grid3' },
    tile('Groupement', st && st.n >= 2 ? num(st.es / 10, 1) + ' cm' : '—', st && st.n >= 2 ? num(mmToMoa(st.es, dist), 2) + ' MOA' : ''),
    tile('Rayon moyen', st ? num(st.mr / 10, 1) + ' cm' : '—', st ? plural(st.n, 'impact') : '0 impact'),
    tile('Point moyen', st ? cm(st.my, 'H', 'B') : '—', st ? cm(st.mx, 'D', 'G') : ''));
}

/** Conseil de réglage pour ramener le point moyen au point visé. */
function adjustTxt(gun, st, dist) {
  if (!st || st.nHot < 3) return '';
  if (gun.sight.kind === 'scope') {
    const c = turretClicks(st.mx, st.my, dist, gun.sight);
    if (!c.up && !c.right) return 'Groupe centré : aucun réglage.';
    const parts = [];
    if (c.up) parts.push(plural(Math.abs(c.up), 'clic') + ' ' + (c.up > 0 ? 'HAUT' : 'BAS'));
    if (c.right) parts.push(plural(Math.abs(c.right), 'clic') + ' ' + (c.right > 0 ? 'DROITE' : 'GAUCHE'));
    return 'Pour centrer : ' + parts.join(' et ') + '.';
  }
  if (Math.hypot(st.mx, st.my) < 10) return 'Groupe centré : visée inchangée.';
  return 'Pour centrer : visez ' + cm(-st.my, 'plus haut', 'plus bas') + ' et ' + cm(-st.mx, 'plus à droite', 'plus à gauche') + '.';
}

const coldTxt = (st, dist) => (st && st.cold ? 'Coup à froid : ' + cm(st.cold.y, 'plus haut', 'plus bas') + ', ' + cm(st.cold.x, 'à droite', 'à gauche') + ' que le groupe (' + num(mmToMoa(Math.hypot(st.cold.x, st.cold.y), dist), 1) + ' MOA).' : '');

/* ---------- Saisir une séance ---------- */
export function sessionSheet() {
  const s0 = app.state, gun = M.activeGun(s0), load = M.activeLoad(gun);
  const last = (gun.sessions || []).at(-1);
  const st = { dist: s0.shot.dist, target: last ? last.target : 'C200', coldFirst: true, shots: [], photo: null, zoom: 1 };
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });

  const fileInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'sr', onChange: (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try { if (st.photo) URL.revokeObjectURL(st.photo); st.photo = URL.createObjectURL(f); toast('Photo chargée : touchez les impacts'); draw(); } catch (err) { toast('Photo illisible'); }
  } });

  const tap = (e) => {
    if (!e || e.detail === 0) return; // clavier : rien à placer
    const svg = e.currentTarget.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const T = TARGETS[st.target], W = T.w / st.zoom, H = T.h / st.zoom;
    const x = -W / 2 + (e.clientX - r.left) / r.width * W;
    const y = H / 2 - (e.clientY - r.top) / r.height * H;
    st.shots.push({ x: Math.round(x), y: Math.round(y) });
    draw();
  };

  const save = () => {
    const g = groupStats(st.shots, st.coldFirst);
    if (!g || g.n < 3) { toast('Placez au moins 3 impacts'); return; }
    const n = st.shots.length;
    set((s) => {
      const cur = M.activeGun(s);
      return M.replaceGun(s, M.addSession(cur, { dist: st.dist, loadId: load.id, target: st.target, coldFirst: st.coldFirst, met: metForCalc(s), wind: { speed: s.shot.windSpeed, hour: s.shot.windHour }, shots: st.shots }));
    });
    if (st.photo) URL.revokeObjectURL(st.photo);
    toast('Séance enregistrée · +' + n + ' coups aux compteurs');
    openSheet('carnet-' + gun.id, () => carnetSheet(gun.id));
  };

  function draw() {
    const T = TARGETS[st.target];
    const g = groupStats(st.shots, st.coldFirst);
    const n = st.shots.length;
    const hint = n === 0 ? 'Touchez le centre de chaque trou, dans l’ordre des tirs.' : n < 3 ? 'Encore ' + plural(3 - n, 'impact') + ' au minimum.' : plural(n, 'impact') + ' · ' + (adjustTxt(gun, g, st.dist) || '');
    fill(body, 
      h('div', { class: 'muted', style: { fontSize: '13px' } }, gun.name + ' · ' + load.name + ' · ' + num(s0.met.t, 0) + ' °C · vent ' + num(s0.shot.windSpeed, 1) + ' m/s de ' + s0.shot.windHour + ' h'),
      h('div', { class: 'row' },
        h('div', { class: 'grow' }, h('span', { class: 'label' }, 'Distance'), h('div', { class: 'mono', style: { fontSize: '22px', fontWeight: '700' } }, st.dist + ' m')),
        [-50, -10, 10, 50].map((d) => h('button', { class: 'step mono', 'aria-label': (d > 0 ? 'Plus ' : 'Moins ') + Math.abs(d) + ' mètres', onClick: () => { st.dist = clamp(st.dist + d, 10, 2000); draw(); } }, (d > 0 ? '+' : '−') + Math.abs(d)))),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Cible' }, TARGET_ORDER.map((k) => h('button', { class: 'chip', 'aria-pressed': String(st.target === k), onClick: () => { st.target = k; st.zoom = 1; draw(); } }, TARGETS[k].name))),
      h('div', { class: 'grid2' },
        h('label', { class: 'btn small', style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } }, st.photo ? 'Changer la photo' : 'Photo de la cible', fileInput),
        h('button', { class: 'btn small', 'aria-pressed': String(!st.photo), onClick: () => { if (st.photo) URL.revokeObjectURL(st.photo); st.photo = null; draw(); } }, 'Cible dessinée')),
      h('button', { class: 'switch', role: 'switch', 'aria-checked': String(st.coldFirst), onClick: () => { st.coldFirst = !st.coldFirst; draw(); } },
        h('span', { class: 'grow' }, h('b', null, 'Premier coup canon froid'), h('small', null, st.coldFirst ? 'Le 1er impact touché est le coup à froid (en violet)' : 'Tous les impacts comptent pareil')),
        h('span', { class: 'knob', 'aria-hidden': 'true' })),
      h('button', { class: 'target', onClick: tap, 'aria-label': 'Toucher la cible pour placer un impact' }, targetSvg(T, { zoom: st.zoom, photo: st.photo, shots: st.shots, coldFirst: st.coldFirst, st: g, holeMm: load.dMm })),
      h('div', { class: 'row' },
        h('span', { class: 'muted grow', style: { fontSize: '13px' } }, hint),
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Zoom' }, [1, 2, 4].map((z) => h('button', { class: 'chip', 'aria-pressed': String(st.zoom === z), 'aria-label': 'Zoom ' + z + ' fois', onClick: () => { st.zoom = z; draw(); } }, '×' + z)))),
      statTiles(g, st.dist),
      g && g.cold ? h('div', { class: 'notice info' }, coldTxt(g, st.dist)) : null,
      h('div', { class: 'grid3' },
        h('button', { class: 'btn', onClick: () => { st.shots.pop(); draw(); } }, 'Annuler'),
        h('button', { class: 'btn', onClick: () => { st.shots = []; draw(); } }, 'Effacer'),
        h('button', { class: 'btn primary', onClick: save }, 'Enregistrer')),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '0', lineHeight: '1.45' } }, 'Le point visé est le centre du visuel, avec la correction calculée par Kronos. Photo : cadrez le visuel bord à bord ; elle sert à placer les impacts et n’est pas conservée. L’enregistrement ajoute les coups aux deux compteurs.'));
  }
  draw();
  return frame('Saisir une séance', body);
}

/* ---------- Carnet de séances ---------- */
function thumb(x) {
  const g = sessionStats(x);
  const span = Math.max(30, ...x.shots.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y)))) * 1.15;
  const k = 28 / span;
  return h('svg', { viewBox: '0 0 64 64', width: '64', height: '64', 'aria-hidden': 'true', style: { flex: 'none', background: 'var(--panel2)', borderRadius: '10px' } },
    h('line', { x1: '32', y1: '4', x2: '32', y2: '60', stroke: 'var(--border)' }), h('line', { x1: '4', y1: '32', x2: '60', y2: '32', stroke: 'var(--border)' }),
    x.shots.map((p, i) => h('circle', { cx: String(32 + p.x * k), cy: String(32 - p.y * k), r: '3', fill: x.coldFirst && i === 0 ? 'var(--violet)' : 'var(--amber)' })),
    g ? h('circle', { cx: String(32 + g.mx * k), cy: String(32 - g.my * k), r: '3.5', fill: 'none', stroke: 'var(--cyan)', 'stroke-width': '2' }) : null);
}

/** Texte du coup à froid pour une arme et la distance du tir. */
export function coldAdvice(gun, dist) {
  const sum = coldBoreSummary((gun.sessions || []).filter((x) => x.coldFirst).map((x) => ({ dist: x.dist, cold: sessionStats(x).cold })));
  if (!sum) return null;
  let advice, tir = '';
  if (sum.missing) advice = 'Encore ' + plural(sum.missing, 'séance') + ' avec coup à froid pour conclure.';
  else if (!sum.regular) advice = 'Pas d’écart régulier : rien à corriger au 1er coup.';
  else if (gun.sight.kind === 'scope') {
    const step = gun.sight.click * (gun.sight.unit === 'MOA' ? MOA_IN_MRAD : 1);
    const k = Math.round(Math.abs(sum.my) / step);
    advice = k ? 'Au 1er coup : ' + plural(k, 'clic') + ' ' + (sum.my > 0 ? 'BAS' : 'HAUT') + ' en plus.' : 'Écart inférieur à un clic : rien à corriger.';
    tir = k ? advice : '';
  } else {
    advice = 'Au 1er coup : visez ' + num(Math.abs(sum.my * dist) / 10, 1) + ' cm plus ' + (sum.my > 0 ? 'BAS' : 'HAUT') + ' à ' + dist + ' m.';
    tir = advice;
  }
  return { ...sum, title: 'Coup à froid · ' + plural(sum.n, 'séance'),
    txt: 'En moyenne ' + num(Math.abs(sum.my), 2) + ' mrad ' + (sum.my >= 0 ? 'plus haut' : 'plus bas') + ' et ' + num(Math.abs(sum.mx), 2) + ' mrad ' + (sum.mx >= 0 ? 'à droite' : 'à gauche') + ' que le groupe, soit ' + cm(sum.my * dist, 'plus haut', 'plus bas') + ' à ' + dist + ' m.',
    advice, tir };
}

export function carnetSheet(gunId) {
  const s = app.state, gun = s.guns.find((x) => x.id === gunId) || M.activeGun(s), load = M.activeLoad(gun);
  const all = (gun.sessions || []).slice().reverse();
  const forLoad = all.filter((x) => x.loadId === load.id);
  const moa = (x) => mmToMoa(sessionStats(x).es, x.dist);
  const avg = forLoad.length ? forLoad.reduce((a, x) => a + moa(x), 0) / forLoad.length : null;
  const best = forLoad.length ? Math.min(...forLoad.map(moa)) : null;
  const cold = coldAdvice(gun, s.shot.dist);
  const tile = (label, a, b) => h('div', { class: 'stat' }, h('span', null, label), h('b', { class: 'mono' }, a), h('span', { class: 'muted', style: { fontSize: '11px' } }, b));
  const ensureActive = () => { if (s.gunId !== gun.id) set((x) => ({ ...x, gunId: gun.id })); };

  return frame('Carnet de séances',
    h('div', { class: 'muted', style: { fontSize: '13px' } }, gun.name + ' · ' + load.name + ' : ' + plural(forLoad.length, 'séance')),
    h('div', { class: 'grid3' }, tile('Séances', String(all.length), 'toutes munitions'), tile('Groupe moyen', avg === null ? '—' : num(avg, 2), 'MOA'), tile('Meilleur', best === null ? '—' : num(best, 2), 'MOA')),
    cold ? h('div', { class: 'notice info', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('b', { class: 'label', style: { color: 'var(--violet)' } }, cold.title), h('span', null, cold.txt), h('b', { style: { color: cold.regular ? 'var(--amber)' : 'var(--muted)' } }, cold.advice)) : null,
    h('div', { class: 'grid2' },
      h('button', { class: 'btn primary', onClick: () => { ensureActive(); openSheet('session', sessionSheet); } }, '+ Nouvelle séance'),
      h('button', { class: 'btn', onClick: () => { ensureActive(); openSheet('truing', () => truingSheet(null)); } }, 'Recaler la munition')),
    all.length ? h('h2', null, 'Historique · touchez une séance pour recaler') : h('p', { class: 'muted', style: { margin: '0', fontSize: '14px', lineHeight: '1.5' } }, 'Aucune séance pour l’instant. Après votre prochain tir, prenez la cible en photo ou utilisez la cible dessinée, puis touchez les impacts.'),
    all.map((x) => {
      const g = sessionStats(x);
      return h('div', { class: 'row' },
        h('button', { class: 'item grow' + (x.loadId === load.id ? ' on' : ''), onClick: () => {
          if (x.loadId !== load.id) { toast('Séance faite avec ' + x.loadName + ' : choisissez cette munition pour recaler'); return; }
          ensureActive(); openSheet('truing-' + x.id, () => truingSheet(x.id));
        } },
          thumb(x),
          h('span', { class: 'grow' },
            h('b', null, dateFr(x.d) + ' · ' + x.dist + ' m · ' + x.shots.length + ' coups'),
            h('small', null, 'Groupe ' + num(g.es / 10, 1) + ' cm (' + num(mmToMoa(g.es, x.dist), 1) + ' MOA) · point moyen ' + cm(g.my, 'H', 'B') + ' ' + cm(g.mx, 'D', 'G')),
            h('small', null, x.loadName + (x.met ? ' · ' + num(x.met.t, 0) + ' °C' : '') + ' · ' + (TARGETS[x.target] || TARGETS.GRID).name + (x.coldFirst ? ' · coup à froid' : '')))),
        h('button', { class: 'icon-btn', style: { width: '44px', height: '44px', color: 'var(--red)' }, 'aria-label': 'Supprimer la séance du ' + dateFr(x.d), onClick: () => confirm({ title: 'Supprimer la séance ?', text: 'Séance du ' + dateFr(x.d) + ' à ' + x.dist + ' m. Les coups restent comptés dans les compteurs.', ok: 'Supprimer', danger: true,
          onOk: () => { set((st) => M.replaceGun(st, M.removeSession(st.guns.find((y) => y.id === gun.id), x.id))); toast('Séance supprimée'); openSheet('carnet-' + gun.id, () => carnetSheet(gun.id)); } }) }, '×'));
    }));
}

/* ---------- Recalage V0 / BC ---------- */
export function truingSheet(sessionId) {
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
  const st = { sessionId: null, dist: 600, dyCm: 0, param: 'auto' };
  const pick = (x) => {
    const g = sessionStats(x);
    st.sessionId = x.id; st.dist = x.dist; st.dyCm = Math.round(g.my) / 10;
  };
  {
    const gun = M.activeGun(app.state);
    const x = (gun.sessions || []).find((y) => y.id === sessionId);
    if (x) pick(x);
  }

  function draw() {
    const s = app.state, gun = M.activeGun(s), load = M.activeLoad(gun);
    const sessions = (gun.sessions || []).filter((x) => x.loadId === load.id && x.dist >= 100);
    const src = sessions.find((x) => x.id === st.sessionId) || null;
    const srcStats = src ? sessionStats(src) : null;
    const met = src && src.met ? src.met : metForCalc(s);
    const r = trueLoad({ gun: { sightH: gun.sightH, zero: gun.zero, twist: gun.twist, twistDir: gun.twistDir }, sight: gun.sight, load, met,
      dist: st.dist, dyM: st.dyCm / 100, param: st.param, mpiErrM: srcStats ? mpiUncertainty(srcStats) / 1000 : undefined });
    const unit = gun.sight.kind === 'scope' ? gun.sight.unit : 'mrad', uf = unit === 'MOA' ? 1 / MOA_IN_MRAD : 1;
    const fmt = (p, v) => (v === null ? 'hors limites' : p === 'v0' ? int(v) + ' m/s' : num(v, 3));
    const reason = r.param === 'v0'
      ? (load.measured ? 'Vous forcez la V0 alors qu’elle est mesurée au chrono.' : 'V0 non mesurée : c’est elle qu’on ajuste d’abord. Mesurez-la au chrono pour recaler ensuite le BC.')
      : (load.measured ? 'V0 mesurée au chrono : on ajuste le BC.' : 'Vous forcez le BC alors que la V0 n’est pas mesurée.');
    const eff = r.effect ? (gun.sight.kind === 'scope'
      ? 'À ' + r.effect.d + ' m, le calcul bouge de ' + num(Math.abs(r.effect.dyM) * 100, 1) + ' cm : élévation ' + num(Math.abs(r.effect.el1) * uf, 1) + ' → ' + num(Math.abs(r.effect.el2) * uf, 1) + ' ' + unit + '.'
      : 'À ' + r.effect.d + ' m, la tenue verticale change de ' + num(Math.abs(r.effect.dyM) * 100, 1) + ' cm.') : '';
    const ok = r.to !== null && !r.warn;
    const seg = (k, label) => h('button', { class: 'chip', 'aria-pressed': String(st.param === k), onClick: () => { st.param = k; draw(); } }, label);
    const log = (load.trueLog || []).slice().reverse();
    const apply = () => {
      if (!ok) { toast(r.warn ? r.warn.split(' :')[0] : 'Recalage impossible'); return; }
      set((x) => { const g = M.activeGun(x); return M.replaceGun(x, M.applyTruing(g, load.id, { ...r, dist: st.dist, dyM: st.dyCm / 100, sessionId: st.sessionId })); });
      toast((r.param === 'v0' ? 'V0 recalée : ' : 'BC recalé : ') + fmt(r.param, r.param === 'v0' ? Math.round(r.to) : r.to));
      st.dyCm = 0; st.sessionId = null; draw();
    };

    fill(body, 
      h('p', { style: { margin: '0', fontSize: '14px', lineHeight: '1.5' } }, 'Si vos impacts tombent plus haut ou plus bas que prévu à longue distance, Kronos ajuste la V0 ou le BC de ' + load.name + ' pour que le calcul retombe sur votre point moyen.'),
      sessions.length ? h('div', null, h('span', { class: 'label' }, 'À partir d’une séance'),
        h('div', { class: 'chips', style: { marginTop: '6px' } }, sessions.slice(-4).reverse().map((x) => {
          const g = sessionStats(x);
          return h('button', { class: 'chip', 'aria-pressed': String(x.id === st.sessionId), onClick: () => { pick(x); draw(); } }, dateFr(x.d).slice(0, 5) + ' · ' + x.dist + ' m · ' + (g.my > 0 ? '+' : '') + num(g.my / 10, 1) + ' cm');
        }))) : null,
      h('div', { class: 'card row' },
        h('div', { class: 'grow' }, h('span', { class: 'label' }, 'Distance du tir'), h('div', { class: 'mono', style: { fontSize: '22px', fontWeight: '700' } }, st.dist + ' m')),
        h('button', { class: 'step mono', 'aria-label': 'Moins 50 mètres', onClick: () => { st.dist = clamp(st.dist - 50, 100, 1500); st.sessionId = null; draw(); } }, '−50'),
        h('button', { class: 'step mono', 'aria-label': 'Plus 50 mètres', onClick: () => { st.dist = clamp(st.dist + 50, 100, 1500); st.sessionId = null; draw(); } }, '+50')),
      h('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        h('div', { class: 'row' }, h('span', { class: 'grow' }, 'Écart vertical du point moyen'), h('b', { class: 'mono', style: { fontSize: '20px' } }, (st.dyCm > 0 ? '+' : '') + num(st.dyCm, 1) + ' cm')),
        h('span', { class: 'muted', style: { fontSize: '13px' } }, st.dyCm === 0 ? 'impacts au point visé' : st.dyCm > 0 ? 'impacts plus hauts que prévu' : 'impacts plus bas que prévu'),
        h('div', { class: 'grid4' }, [-5, -1, 1, 5].map((d) => h('button', { class: 'step mono', 'aria-label': (d > 0 ? 'Plus ' : 'Moins ') + Math.abs(d) + ' cm', onClick: () => { st.dyCm = Math.round((st.dyCm + d) * 10) / 10; st.sessionId = null; draw(); } }, (d > 0 ? '+' : '−') + Math.abs(d))))),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Paramètre à ajuster' }, seg('auto', 'Auto (' + (r.auto === 'v0' ? 'V0' : 'BC') + ')'), seg('v0', 'V0'), seg('bc', 'BC')),
      h('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('span', { class: 'muted', style: { fontSize: '13px' } }, reason),
        h('div', { class: 'row mono', style: { fontSize: '18px', fontWeight: '700' } },
          h('span', { class: 'grow', style: { fontFamily: 'inherit' } }, r.param === 'v0' ? 'V0 à ' + num(load.refTemp ?? 15, 0) + ' °C' : 'BC ' + load.model),
          h('span', null, fmt(r.param, r.from)), h('span', { class: 'muted' }, '→'), h('span', { style: { color: ok ? 'var(--amber)' : 'var(--muted)' } }, fmt(r.param, r.to))),
        eff ? h('span', { class: 'muted', style: { fontSize: '13px' } }, eff) : null),
      r.warn ? h('div', { class: 'notice' }, r.warn) : null,
      h('button', { class: 'btn block' + (ok ? ' primary' : ''), 'aria-disabled': String(!ok), onClick: apply }, 'Appliquer à la munition'),
      log.length ? h('div', null, h('h2', null, 'Recalages précédents'),
        log.map((e) => h('div', { class: 'kv' }, h('span', null, dateFr(e.d) + ' · ' + e.dist + ' m'),
          h('span', { class: 'mono' }, e.undone ? h('s', { class: 'muted' }, txtLog(e)) : txtLog(e)))),
        log.some((e) => !e.undone) ? h('button', { class: 'btn small ghost block', onClick: () => confirm({ title: 'Annuler le dernier recalage ?', text: 'La valeur d’avant revient. La ligne reste barrée dans l’historique.', ok: 'Annuler le recalage',
          onOk: () => { set((x) => M.replaceGun(x, M.undoTruing(M.activeGun(x), load.id))); toast('Recalage annulé'); openSheet('truing', () => truingSheet(null)); } }) }, 'Annuler le dernier recalage') : null) : null,
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '0', lineHeight: '1.45' } }, 'Bonne pratique : recaler la V0 vers 300 à 500 m, puis le BC vers 600 à 800 m, à partir d’au moins 5 coups par vent calme. Recalage refusé en dessous de ' + Math.max(TRUE_MIN_DIST, 2 * gun.zero) + ' m. Chaque recalage est daté et réversible.'));
  }
  draw();
  return frame('Recaler la munition', body);
}

function txtLog(e) {
  return (e.param === 'v0' ? 'V0 ' + int(e.from) + ' → ' + int(e.to) + ' m/s' : 'BC ' + num(e.from, 3) + ' → ' + num(e.to, 3)) + ' (' + (e.dyCm > 0 ? '+' : '') + num(e.dyCm, 1) + ' cm)';
}
