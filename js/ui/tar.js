// Écran TAR : cible réglementaire, visée plein centre ou à 6 h, impact prévu, points, mode match chronométré.
import { h } from './dom.js';
import { num, int } from './format.js';
import { app, set, ui, compute, cranInfo, toast, confirm, openSheet, metForCalc, buzz, M } from '../app.js';
import { solve } from '../engine/solver.js';
import { confidence } from '../engine/confidence.js';
import { TARGETS, EVENTS, aimPoint, score, totalScore, matchClock } from '../engine/targets.js';
import { carnetSheet } from './carnet.js';
import { impactPad, selectionBar } from './impacts.js';
import { tipCard } from './aide.js';

const TAR_TARGETS = ['C200', 'C200_50', 'C50'];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const cm = (mm, pos, neg) => (Math.abs(mm) < 5 ? 'au centre' : num(Math.abs(mm) / 10, 0) + ' cm ' + (mm > 0 ? pos : neg));
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

const tarSet = (o) => set((s) => ({ ...s, settings: { ...s.settings, tar: { ...tarOf(s), ...o } } }));
const tarOf = (s) => ({ target: 'C200', aim: 'centre', ...(s.settings.tar || {}) });

/* ---------- Chrono de match ---------- */
let timer = null;
const elapsed = (m) => ((m.paused ? m.pausedAt : Date.now()) - m.start) / 1000;
function tick() {
  const m = app.match;
  if (!m || m.paused || app.view !== 'tar') { stopTimer(); return; }
  const ev = EVENTS.find((e) => e.id === m.eventId), c = matchClock(ev.phases, elapsed(m));
  if (c.index !== m.lastPhase || c.done) {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignoré */ }
    m.lastPhase = c.index;
    if (c.done) { m.paused = true; m.pausedAt = Date.now(); toast('Épreuve terminée'); }
    ui({});
    return;
  }
  // Seul le chrono change : on ne redessine pas l'écran (un toucher sur la cible ne doit jamais être perdu).
  const el = document.getElementById('match-clock');
  if (el) { el.textContent = mmss(c.left); el.classList.toggle('warn', c.left <= 30); } else ui({});
}
function startTimer() { if (!timer) timer = setInterval(tick, 1000); }
function stopTimer() { clearInterval(timer); timer = null; }

function matchCard(ev) {
  const m = app.match;
  if (!m) {
    return h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Match'),
      h('div', { class: 'chips', style: { margin: '8px 0' } }, EVENTS.map((e) => h('button', { class: 'chip', onClick: () => {
        app.tarShots = [];
        app.match = { eventId: e.id, start: Date.now(), paused: true, pausedAt: Date.now(), lastPhase: 0 };
        set((s) => ({ ...s, shot: { ...s.shot, dist: e.dist }, settings: { ...s.settings, tar: { ...tarOf(s), target: e.target } } }));
      } }, e.name))),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '0', lineHeight: '1.45' } }, 'Choisir une épreuve règle la cible et la distance, puis prépare le chrono. Phases, durées et positions : règlement TAR FFTir 2025-2026. Les épreuves à 200 m peuvent se tirer à 100 m sur C200 50 % par dérogation (Dx uniquement).'));
  }
  const c = matchClock(ev.phases, elapsed(m));
  const jump = (i) => { const before = ev.phases.slice(0, i).reduce((a, p) => a + p[1], 0); const now = Date.now(); m.start = now - before * 1000; if (m.paused) m.pausedAt = now; m.lastPhase = i; ui({}); };
  return h('section', { class: 'card match' },
    h('div', { class: 'row' }, h('span', { class: 'label grow' }, ev.name), h('span', { class: 'muted', style: { fontSize: '12px' } }, ev.dist + ' m · ' + TARGETS[ev.target].name)),
    h('div', { class: 'row', style: { margin: '6px 0' } },
      h('div', { class: 'grow' }, h('div', { style: { fontWeight: '700' } }, 'Phase ' + (c.index + 1) + '/' + ev.phases.length + ' · ' + c.name), h('div', { class: 'muted', style: { fontSize: '12px' } }, ev.phases[c.index][2] + ' coups · ' + ev.phases[c.index][3] + ' · ' + (c.done ? 'terminée' : m.paused ? 'en pause' : 'en cours'))),
      h('div', { id: 'match-clock', class: 'clock-big mono' + (c.left <= 30 && !c.done ? ' warn' : ''), role: 'timer', 'aria-label': 'Temps restant' }, mmss(c.left))),
    h('div', { class: 'grid3' },
      h('button', { class: 'btn' + (m.paused ? ' primary' : ''), disabled: c.done ? true : null, onClick: () => { if (m.paused) { m.start += Date.now() - m.pausedAt; m.paused = false; startTimer(); } else { m.paused = true; m.pausedAt = Date.now(); stopTimer(); } buzz(); ui({}); } }, m.paused ? (elapsed(m) < 0.5 ? 'Démarrer' : 'Reprendre') : 'Pause'),
      h('button', { class: 'btn', disabled: c.index >= ev.phases.length - 1 ? true : null, onClick: () => jump(c.index + 1) }, 'Phase suivante'),
      h('button', { class: 'btn danger', onClick: () => confirm({ title: 'Arrêter l’épreuve ?', text: app.tarShots.length ? 'Les ' + app.tarShots.length + ' impacts saisis restent à l’écran : enregistrez-les dans le carnet si besoin.' : 'Le chrono est remis à zéro.', ok: 'Arrêter', onOk: () => { stopTimer(); app.match = null; ui({}); } }) }, 'Arrêter')),
    h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '6px' } }, 'Coups saisis : ' + app.tarShots.length + ' / ' + ev.shots + ' · score sur ' + (ev.shots - ev.phases[0][2]) * 10));
}

/* ---------- Écran ---------- */
export function renderTar() {
  const s = app.state, tar = tarOf(s), T = TARGETS[tar.target], sh = s.shot;
  const cmp = compute(s, [sh.dist]);
  const { gun, load } = cmp;
  let { args, res } = cmp;
  const aim = aimPoint(T, tar.aim);
  const ci = cranInfo(s, args, gun, sh.dist);
  if (ci && aim.y) {
    // visée à 6 h : le cran conseillé est celui qui fait monter la balle d'un rayon de visuel au-dessus du point visé
    let best = null, bestErr = Infinity;
    for (const [c, a] of ci.angles) {
      const rr = solve({ ...args, alpha: a.alpha, distances: [sh.dist] }).rows[0];
      if (rr && rr.reached && Math.abs(rr.dropM + aim.y / 1000) < bestErr) { bestErr = Math.abs(rr.dropM + aim.y / 1000); best = c; }
    }
    if (best !== null) { ci.rec = best; if (!sh.cran) { ci.used = best; ci.alpha = ci.angles.get(best).alpha; ci.st = ci.angles.get(best).st; } }
  }
  if (ci && ci.alpha !== null) { args = { ...args, alpha: ci.alpha }; res = solve({ ...args, distances: [sh.dist] }); }
  const r = res.rows[0];
  const scope = gun.sight.kind === 'scope';
  // Lunette : les tourelles sont réglées selon l'écran Tir, la balle arrive au point visé.
  const imp = !r || !r.reached ? null : scope ? { x: aim.x, y: aim.y } : { x: aim.x + r.driftM * 1000, y: aim.y + r.dropM * 1000 };
  const conf = r && r.reached ? confidence(args, sh.dist, gun.dispersionMoa) : null;
  const hole = load.dMm || 7.8;
  const pts = imp ? score(T, imp.x, imp.y, hole) : null;
  const ev = app.match ? EVENTS.find((e) => e.id === app.match.eventId) : null;
  if (app.match && !app.match.paused) startTimer();

  const extra = (ppm) => {
    const k = [];
    // guidon : lame montant jusqu'au point visé
    const bw = Math.max(T.w * 0.035, 6 / ppm);
    k.push(h('rect', { x: String(aim.x - bw / 2), y: String(-aim.y), width: String(bw), height: String(T.h), fill: 'var(--post)', opacity: '0.9' }));
    if (imp && conf) k.push(h('ellipse', { cx: String(imp.x), cy: String(-imp.y), rx: String(Math.min(T.w, 2 * conf.sz * 1000)), ry: String(Math.min(T.h, 2 * conf.sy * 1000)), fill: 'var(--amber)', 'fill-opacity': '0.15', stroke: 'var(--amber)', 'stroke-width': String(2 / ppm), 'stroke-dasharray': (8 / ppm) + ' ' + (6 / ppm) }));
    if (imp) k.push(h('circle', { cx: String(imp.x), cy: String(-imp.y), r: String(7 / ppm), fill: 'var(--amber)', stroke: 'var(--paper)', 'stroke-width': String(2 / ppm) }));
    return k;
  };
  const shots = app.tarShots;
  const total = totalScore(T, shots, hole);
  const saveSeries = () => {
    if (shots.length < 1) { toast('Touchez les impacts sur la cible'); return; }
    const off = imp || aim;
    set((st) => M.replaceGun(st, M.addSession(M.activeGun(st), { dist: sh.dist, loadId: load.id, target: tar.target, coldFirst: false, met: metForCalc(st), wind: { speed: st.shot.windSpeed, hour: st.shot.windHour },
      cran: ci ? ci.used : null, event: ev ? ev.id : null, aim: tar.aim, offset: off, shots: shots.map((p) => ({ x: p.x - off.x, y: p.y - off.y })) })));
    toast('Série enregistrée · ' + total + ' points · +' + shots.length + ' coups aux compteurs');
    app.tarShots = [];
    openSheet('carnet-' + gun.id, () => carnetSheet(gun.id));
  };

  const i = ci ? ci.list.indexOf(ci.used) : -1;
  const setShot = (o) => { buzz(); set((x) => ({ ...x, shot: { ...x.shot, ...o } })); };
  let line1 = 'Distance hors de portée pour cette munition.', line2 = '';
  if (imp) {
    line1 = scope ? 'Lunette réglée selon l’écran Tir : impact au point visé · ' + pts + ' points' : 'Impact prévu : ' + cm(imp.y, 'haut', 'bas') + (Math.abs(imp.x) >= 5 ? ', ' + cm(imp.x, 'à droite', 'à gauche') : '') + ' · ' + pts + ' points';
    line2 = conf ? 'Zone probable 95 % : ±' + num(2 * conf.sy * 100, 0) + ' cm vertical, ±' + num(2 * conf.sz * 100, 0) + ' cm latéral' : '';
  }

  return h('main', { class: 'tar' },
    tipCard(['tar']),
    h('section', { class: 'card' },
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Cible' }, TAR_TARGETS.map((k) => h('button', { class: 'chip', 'aria-pressed': String(tar.target === k), onClick: () => { app.tarShots = []; tarSet({ target: k }); } }, TARGETS[k].name))),
      h('div', { class: 'grid2', style: { marginTop: '8px' } },
        h('button', { class: 'btn small', 'aria-pressed': String(tar.aim === 'centre'), onClick: () => tarSet({ aim: 'centre' }) }, 'Plein centre'),
        h('button', { class: 'btn small', 'aria-pressed': String(tar.aim === '6h'), onClick: () => tarSet({ aim: '6h' }) }, 'Visée à 6 h')),
      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('div', { class: 'grow' }, h('span', { class: 'label' }, 'Distance'), h('div', { class: 'mono', style: { fontSize: '20px', fontWeight: '700' } }, sh.dist + ' m')),
        [-50, -10, 10, 50].map((d) => h('button', { class: 'step mono', 'aria-label': (d > 0 ? 'Plus ' : 'Moins ') + Math.abs(d) + ' mètres', onClick: () => setShot({ dist: clamp(sh.dist + d, 10, 2500) }) }, (d > 0 ? '+' : '−') + Math.abs(d)))),
      ci ? h('div', { class: 'row', style: { marginTop: '8px' } },
        h('div', { class: 'grow' }, h('span', { class: 'label' }, 'Cran de hausse'), h('div', { class: 'mono', style: { fontSize: '20px', fontWeight: '700' } }, ci.used + ' m'), h('div', { class: 'muted', style: { fontSize: '12px' } }, (ci.used === ci.rec ? 'conseillé' : 'choisi · conseillé ' + ci.rec) + (tar.aim === '6h' ? ' en visée à 6 h' : ' en plein centre'))),
        h('button', { class: 'step', 'aria-label': 'Cran précédent', disabled: i <= 0 ? true : null, onClick: () => setShot({ cran: ci.list[i - 1] }) }, '−'),
        h('button', { class: 'step', 'aria-pressed': String(!sh.cran), onClick: () => setShot({ cran: null }) }, 'Auto'),
        h('button', { class: 'step', 'aria-label': 'Cran suivant', disabled: i >= ci.list.length - 1 ? true : null, onClick: () => setShot({ cran: ci.list[i + 1] }) }, '+')) : null),
    impactPad(T, { shots, sel: app.tarSel, label: 'Cible : touchez et glissez pour compter un impact', svg: { st: null, holeMm: hole, extra },
      onChange: (s2, sel) => { if (s2.length > shots.length) buzz(); app.tarShots = s2; app.tarSel = sel; ui({}); } }),
    selectionBar(shots, app.tarSel, () => { app.tarShots = shots.filter((_, k) => k !== app.tarSel); app.tarSel = null; ui({}); }),
    h('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('b', null, line1),
      line2 ? h('span', { class: 'muted', style: { fontSize: '13px' } }, line2) : null,
      tar.aim === '6h' ? h('span', { class: 'muted', style: { fontSize: '13px' } }, 'Visée à 6 h : le guidon effleure le bas du visuel noir, ' + num(T.black / 20, 0) + ' cm sous le centre. Pour toucher le centre, la balle doit monter d’autant.') : null,
      h('span', { class: 'muted', style: { fontSize: '12px' } }, T.name + ' : visuel noir ' + T.black + ' mm (zones ' + T.blackFrom + ' à 10)' + (T.cordon ? ', cordon ' + num(T.cordon, 1).replace(',0', '') + ' mm' : '') + (T.blackConfirmed ? '' : ', cote à vérifier sur le règlement') + ' · règlement TAR 2025-2026.')),
    h('section', { class: 'card' },
      h('div', { class: 'row' }, h('span', { class: 'label grow' }, ev ? 'Points de l’épreuve' : 'Série'), h('b', { class: 'mono', style: { fontSize: '20px' } }, total + ' pts'), h('span', { class: 'muted', style: { fontSize: '13px' } }, ' · ' + shots.length + ' impact' + (shots.length > 1 ? 's' : ''))),
      h('div', { class: 'muted', style: { fontSize: '12px', margin: '4px 0 8px' } }, shots.length ? 'Derniers : ' + shots.slice(-10).map((p) => score(T, p.x, p.y, hole)).join(' · ') : 'Touchez le centre de chaque trou sur la cible : Kronos compte les points (ligne touchée = zone supérieure).'),
      h('div', { class: 'grid3' },
        h('button', { class: 'btn', onClick: () => { app.tarShots = shots.slice(0, -1); app.tarSel = null; ui({}); } }, 'Annuler'),
        h('button', { class: 'btn', onClick: () => { app.tarShots = []; app.tarSel = null; ui({}); } }, 'Effacer'),
        h('button', { class: 'btn primary', onClick: saveSeries }, 'Enregistrer'))),
    matchCard(ev));
}
