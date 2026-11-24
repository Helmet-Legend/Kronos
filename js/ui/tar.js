// Écran TAR : cible réglementaire, visée plein centre ou à 6 h, impact prévu, points, mode match chronométré.
import { h } from './dom.js';
import { num, int } from './format.js';
import { app, set, ui, compute, cranInfo, toast, confirm, openSheet, metForCalc, buzz, M } from '../app.js';
import { solve } from '../engine/solver.js';
import { confidence } from '../engine/confidence.js';
import { TARGETS, EVENTS, aimPoint, score, totalScore, matchClock, phaseTarget, phaseScored, eventScore } from '../engine/targets.js';
import { checkPoing } from '../engine/poing.js';
import { carnetSheet } from './carnet.js';
import { impactPad, selectionBar } from './impacts.js';
import { tipCard } from './aide.js';

const TAR_TARGETS = ['C200', 'C200_50', 'C50'];
const POING_TARGETS = ['C50', 'VITESSE'];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const cm = (mm, pos, neg) => (Math.abs(mm) < 5 ? 'au centre' : num(Math.abs(mm) / 10, 0) + ' cm ' + (mm > 0 ? pos : neg));
const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

const tarSet = (o) => set((s) => ({ ...s, settings: { ...s.settings, tar: { ...tarOf(s), ...o } } }));
const tarOf = (s) => ({ target: 'C200', aim: 'centre', ...(s.settings.tar || {}) });

/* ---------- Chrono de match ---------- */
let timer = null;
const elapsed = (m) => ((m.paused ? m.pausedAt : Date.now()) - m.start) / 1000;
const COUNTDOWN = 3; // secondes de « Prêts ? » avant « Feu ! »

// Bips du pas de tir (Web Audio, lancé par un toucher sur « Départ »)
let audio = null;
function beep(freq = 880, ms = 150, at = 0) {
  if (tarOf(app.state).sound === false) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime + at, o = audio.createOscillator(), g = audio.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01); g.gain.setValueAtTime(0.25, t0 + ms / 1000); g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000 + 0.03);
    o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + ms / 1000 + 0.05);
  } catch (e) { /* pas de son sur cet appareil */ }
}
const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignoré */ } };
function setCmd(m, text, kind) {
  m.cmd = text; m.cmdKind = kind;
  const el = document.getElementById('match-cmd');
  if (el) { el.textContent = text; el.className = 'cmd ' + (kind || ''); }
}
/** Commande affichée quand rien n'est en cours. */
const idleCmd = (m, ev, c) => (c.done ? 'Épreuve terminée' : m.cmd && m.cmdKind === 'stop' ? m.cmd : c.left >= ev.phases[c.index][1] - 0.5 ? 'En attente · touchez Départ' : 'En pause');

function tick() {
  const m = app.match;
  if (!m || (m.paused && !m.countdown) || app.view !== 'tar') { stopTimer(); return; }
  const ev = EVENTS.find((e) => e.id === m.eventId);
  if (m.countdown) {
    // « Prêts ? » : compte à rebours avant le départ de la série
    const left = Math.ceil((m.countdown - Date.now()) / 1000);
    if (left > 0) { if (left !== m.lastCount) { m.lastCount = left; beep(660, 90); setCmd(m, 'Prêts ? ' + left, 'ready'); } return; }
    m.countdown = null; m.lastCount = null;
    m.start += Date.now() - m.pausedAt; m.paused = false;
    beep(1320, 450); vibrate(200); setCmd(m, 'Feu !', 'feu');
    ui({});
    return;
  }
  const c = matchClock(ev.phases, elapsed(m));
  if (c.index !== m.lastPhase || c.done) {
    vibrate([300, 120, 300]); beep(520, 350); beep(520, 350, 0.5);
    if (c.done) { m.paused = true; m.pausedAt = m.start + ev.phases.reduce((a, p) => a + p[1], 0) * 1000; m.cmd = 'Cessez le feu ! Épreuve terminée'; m.cmdKind = 'stop'; }
    else {
      // fin de phase : le chrono s'arrête au début de la phase suivante, le tireur relance « Départ »
      const b = ev.phases.slice(0, c.index).reduce((a, p) => a + p[1], 0);
      m.paused = true; m.pausedAt = m.start + b * 1000;
      m.cmd = 'Cessez le feu ! · ' + ev.phases[m.lastPhase][0] + ' terminée'; m.cmdKind = 'stop';
    }
    m.lastPhase = c.index; stopTimer();
    ui({});
    return;
  }
  // Seuls le chrono et la commande changent : on ne redessine pas l'écran (un toucher sur la cible ne doit jamais être perdu).
  const el = document.getElementById('match-clock');
  if (el) {
    const s = Math.ceil(c.left);
    if (s !== m.lastSec) {
      m.lastSec = s;
      el.textContent = mmss(s); el.classList.toggle('warn', c.left <= warnAt(ev.phases[c.index][1]));
      if (s <= 3 && s >= 1 && ev.phases[c.index][1] > 15) beep(880, 70); // trois dernières secondes d'une longue phase
    }
  } else ui({});
}
const warnAt = (dur) => Math.min(30, dur / 4);
function startTimer() { if (!timer) timer = setInterval(tick, 200); }
function stopTimer() { clearInterval(timer); timer = null; }

/** Remonte l'écran : le chrono et la cible entière sont visibles ensemble. */
const toTop = () => requestAnimationFrame(() => { const el = document.querySelector('main.tar'); if (el) el.scrollTop = 0; });

/** Départ (avec « Prêts ? » en début de série), reprise ou pause. */
function startStop(ev) {
  const m = app.match, c = matchClock(ev.phases, elapsed(m));
  buzz();
  if (m.countdown) { m.countdown = null; m.lastCount = null; m.cmd = null; }
  else if (m.paused) {
    if (c.left >= ev.phases[c.index][1] - 0.5) { m.countdown = Date.now() + COUNTDOWN * 1000; m.lastCount = null; beep(660, 1); toTop(); }
    else { m.start += Date.now() - m.pausedAt; m.paused = false; m.cmd = 'Feu !'; m.cmdKind = 'feu'; beep(1320, 300); }
    startTimer();
  } else { m.paused = true; m.pausedAt = Date.now(); m.cmd = null; stopTimer(); }
  ui({});
}

function matchCard(ev, gun) {
  const m = app.match;
  if (!m) {
    const poing = gun.type === 'poing', ok = poing ? checkPoing(gun).events : null;
    return h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Match'),
      h('div', { class: 'chips', style: { margin: '8px 0' } }, EVENTS.filter((e) => e.kind === (poing ? 'poing' : 'epaule')).map((e) => h('button', { class: 'chip', onClick: () => {
        app.tarShots = []; app.tarSel = null;
        app.match = { eventId: e.id, start: Date.now(), paused: true, pausedAt: Date.now(), lastPhase: 0, per: {} };
        set((s) => ({ ...s, shot: { ...s.shot, dist: e.dist }, settings: { ...s.settings, tar: { ...tarOf(s), target: e.target } } }));
        toTop();
      } }, e.name + (ok && !ok.includes(e.id) ? ' (non admise)' : '')))),
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '0', lineHeight: '1.45' } }, poing
        ? 'Choisir une épreuve règle la cible et la distance (25 m). Chaque série s’arrête seule : « Départ » lance la suivante. Règlement TAR FFTir 2025-2026, fiches 830 à 832.'
        : 'Choisir une épreuve règle la cible et la distance, puis prépare le chrono. Chaque phase s’arrête seule : « Départ » lance la suivante. Règlement TAR FFTir 2025-2026. Les épreuves à 200 m peuvent se tirer à 100 m sur C200 50 % par dérogation (Dx uniquement).'));
  }
  return null;
}

/** Bandeau de l'épreuve en cours : au-dessus de la cible, collé en haut de l'écran. */
function matchBar(ev) {
  const m = app.match;
  const c = matchClock(ev.phases, elapsed(m)), p = ev.phases[c.index];
  const jump = (i) => { const before = ev.phases.slice(0, i).reduce((a, q) => a + q[1], 0); const now = Date.now(); m.start = now - before * 1000; m.paused = true; m.pausedAt = now; m.countdown = null; m.cmd = null; m.lastPhase = i; stopTimer(); ui({}); };
  const running = !m.paused || m.countdown;
  const cmd = m.countdown ? 'Prêts ? ' + Math.max(1, Math.ceil((m.countdown - Date.now()) / 1000)) : !m.paused ? (m.cmd || 'Feu !') : idleCmd(m, ev, c);
  const kind = m.countdown ? 'ready' : !m.paused ? 'feu' : m.cmdKind === 'stop' ? 'stop' : '';
  const sound = tarOf(app.state).sound !== false;
  return h('section', { class: 'card match matchbar' },
    h('div', { class: 'row' },
      h('span', { class: 'label grow' }, ev.name),
      h('button', { class: 'chip', 'aria-pressed': String(sound), 'aria-label': sound ? 'Couper les bips' : 'Activer les bips', onClick: () => tarSet({ sound: !sound }) }, sound ? 'Bips' : 'Muet')),
    h('div', { class: 'row', style: { margin: '4px 0' } },
      h('div', { class: 'grow', style: { minWidth: '0' } },
        h('div', { style: { fontWeight: '700' } }, 'Phase ' + (c.index + 1) + '/' + ev.phases.length + ' · ' + c.name),
        h('div', { class: 'muted', style: { fontSize: '12px' } }, p[2] + ' coups' + (phaseScored(ev, c.index) ? '' : ', non comptés') + ' · ' + p[3] + ' · ' + mmss(p[1])),
        h('div', { id: 'match-cmd', class: 'cmd ' + kind, role: 'status' }, cmd)),
      h('div', { id: 'match-clock', class: 'clock-big mono' + (c.left <= warnAt(p[1]) && !c.done ? ' warn' : ''), role: 'timer', 'aria-label': 'Temps restant' }, mmss(Math.ceil(c.left)))),
    h('div', { class: 'grid3' },
      h('button', { class: 'btn' + (running ? '' : ' primary'), disabled: c.done ? true : null, onClick: () => startStop(ev) }, m.countdown ? 'Annuler' : m.paused ? (c.left >= p[1] - 0.5 ? 'Départ' : 'Reprendre') : 'Pause'),
      h('button', { class: 'btn', disabled: c.index >= ev.phases.length - 1 ? true : null, onClick: () => jump(c.index + 1) }, 'Phase suivante'),
      h('button', { class: 'btn danger', onClick: () => confirm({ title: 'Arrêter l’épreuve ?', text: 'Le chrono et le score de l’épreuve sont remis à zéro. Enregistrez avant si besoin.', ok: 'Arrêter', onOk: () => { stopTimer(); app.match = null; ui({}); } }) }, 'Arrêter')));
}

/* ---------- Écran ---------- */
export function renderTar() {
  const s = app.state, tar = tarOf(s), sh = s.shot;
  const cmp = compute(s, [sh.dist]);
  const { gun, load } = cmp;
  const poing = gun.type === 'poing';
  const ev = app.match ? EVENTS.find((e) => e.id === app.match.eventId) : null;
  const clock = ev ? matchClock(ev.phases, elapsed(app.match)) : null;
  const pIdx = clock ? clock.index : null;
  const pCode = ev ? phaseTarget(ev, pIdx) : null;
  const pData = ev ? (app.match.per[pIdx] = app.match.per[pIdx] || { shots: [], gongs: [false, false, false, false, false] }) : null;
  const tgtKey = ev ? (pCode === 'GONG' ? ev.target : pCode) : ((poing ? POING_TARGETS : TAR_TARGETS).includes(tar.target) ? tar.target : (poing ? 'C50' : 'C200'));
  const T = TARGETS[tgtKey];
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
  if (app.match && (!app.match.paused || app.match.countdown)) startTimer();

  const extra = (ppm) => {
    const k = [];
    // guidon : lame montant jusqu'au point visé
    const bw = Math.max(T.w * 0.035, 6 / ppm);
    k.push(h('rect', { x: String(aim.x - bw / 2), y: String(-aim.y), width: String(bw), height: String(T.h), fill: 'var(--post)', opacity: '0.9' }));
    if (imp && conf) k.push(h('ellipse', { cx: String(imp.x), cy: String(-imp.y), rx: String(Math.min(T.w, 2 * conf.sz * 1000)), ry: String(Math.min(T.h, 2 * conf.sy * 1000)), fill: 'var(--amber)', 'fill-opacity': '0.15', stroke: 'var(--amber)', 'stroke-width': String(2 / ppm), 'stroke-dasharray': (8 / ppm) + ' ' + (6 / ppm) }));
    if (imp) k.push(h('circle', { cx: String(imp.x), cy: String(-imp.y), r: String(7 / ppm), fill: 'var(--amber)', stroke: 'var(--paper)', 'stroke-width': String(2 / ppm) }));
    return k;
  };
  const shots = ev ? pData.shots : app.tarShots;
  const setShots = (s2) => { if (ev) pData.shots = s2; else app.tarShots = s2; };
  const es = ev ? eventScore(ev, app.match.per, hole) : null;
  const total = es ? es.total : totalScore(T, shots, hole);
  const saveSeries = () => {
    if (ev) { saveEvent(); return; }
    if (shots.length < 1) { toast('Touchez les impacts sur la cible'); return; }
    const off = imp || aim;
    set((st) => M.replaceGun(st, M.addSession(M.activeGun(st), { dist: sh.dist, loadId: load.id, target: tar.target, coldFirst: false, met: metForCalc(st), wind: { speed: st.shot.windSpeed, hour: st.shot.windHour },
      cran: ci ? ci.used : null, event: ev ? ev.id : null, aim: tar.aim, offset: off, shots: shots.map((p) => ({ x: p.x - off.x, y: p.y - off.y })) })));
    toast('Série enregistrée · ' + total + ' points · +' + shots.length + ' coups aux compteurs');
    app.tarShots = [];
    openSheet('carnet-' + gun.id, () => carnetSheet(gun.id));
  };
  // Épreuve : les impacts comptés sur papier vont au carnet (une séance par cible) ; tous les coups tirés vont aux compteurs.
  function saveEvent() {
    const off = imp || aim, byT = {};
    let fired = 0;
    ev.phases.forEach((p, i) => {
      const d = app.match.per[i]; if (!d) return;
      const code = phaseTarget(ev, i);
      fired += code === 'GONG' ? (d.gongs.some(Boolean) || i <= pIdx ? p[2] : 0) : d.shots.length;
      if (code !== 'GONG' && phaseScored(ev, i)) (byT[code] = byT[code] || []).push(...d.shots);
    });
    const papers = Object.entries(byT).filter(([, v]) => v.length);
    if (!fired) { toast('Rien à enregistrer pour l’instant'); return; }
    set((st) => {
      let g = M.activeGun(st), counted = 0;
      for (const [code, list] of papers) {
        g = M.addSession(g, { dist: sh.dist, loadId: load.id, target: code, coldFirst: false, met: metForCalc(st), wind: { speed: st.shot.windSpeed, hour: st.shot.windHour },
          cran: ci ? ci.used : null, event: ev.id, aim: tar.aim, offset: off, shots: list.map((p) => ({ x: p.x - off.x, y: p.y - off.y })) });
        counted += list.length;
      }
      if (fired > counted) g = M.addShots(g, fired - counted, 'épreuve ' + ev.id);
      return M.replaceGun(st, g);
    });
    toast('Épreuve ' + ev.id + ' : ' + es.total + ' / ' + es.max + ' points · +' + fired + ' coups aux compteurs');
    stopTimer(); app.match = null;
    openSheet('carnet-' + gun.id, () => carnetSheet(gun.id));
  }

  const gongCard = pCode === 'GONG' ? h('section', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
    h('span', { class: 'label' }, 'Gongs · touchez ceux qui sont tombés'),
    h('div', { class: 'gongs' }, pData.gongs.map((on, k) => h('button', { class: 'gong', 'aria-pressed': String(on), 'aria-label': 'Gong ' + (k + 1) + (on ? ' tombé' : ' debout'),
      onClick: () => { pData.gongs[k] = !on; buzz(); ui({}); } }, on ? '5' : String(k + 1)))),
    h('span', { class: 'muted', style: { fontSize: '12px' } }, pData.gongs.filter(Boolean).length + ' gong(s) tombé(s) · ' + pData.gongs.filter(Boolean).length * 5 + ' points sur 25 pour cette série')) : null;
  const i = ci ? ci.list.indexOf(ci.used) : -1;
  const setShot = (o) => { buzz(); set((x) => ({ ...x, shot: { ...x.shot, ...o } })); };
  let line1 = 'Distance hors de portée pour cette munition.', line2 = '';
  if (imp) {
    line1 = scope ? 'Lunette réglée selon l’écran Tir : impact au point visé · ' + pts + ' points' : 'Impact prévu : ' + cm(imp.y, 'haut', 'bas') + (Math.abs(imp.x) >= 5 ? ', ' + cm(imp.x, 'à droite', 'à gauche') : '') + ' · ' + pts + ' points';
    line2 = conf ? 'Zone probable 95 % : ±' + num(2 * conf.sy * 100, 0) + ' cm vertical, ±' + num(2 * conf.sz * 100, 0) + ' cm latéral' : '';
  }

  return h('main', { class: 'tar' + (ev ? ' in-match' : '') },
    ev ? matchBar(ev) : tipCard(['tar']),
    ev ? null : h('section', { class: 'card' },
      h('div', { class: 'chips', role: 'group', 'aria-label': 'Cible' }, (poing ? POING_TARGETS : TAR_TARGETS).map((k) => h('button', { class: 'chip', 'aria-pressed': String(tgtKey === k), disabled: ev ? true : null, onClick: () => { app.tarShots = []; tarSet({ target: k }); } }, TARGETS[k].name))),
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
    gongCard || impactPad(T, { shots, sel: app.tarSel, label: 'Cible : touchez et glissez pour compter un impact', svg: { st: null, holeMm: hole, extra },
      onChange: (s2, sel) => { if (s2.length > shots.length) buzz(); setShots(s2); app.tarSel = sel; ui({}); } }),
    gongCard ? null : selectionBar(shots, app.tarSel, () => { setShots(shots.filter((_, k) => k !== app.tarSel)); app.tarSel = null; ui({}); }),
    gongCard ? null : h('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
      h('b', null, line1),
      line2 ? h('span', { class: 'muted', style: { fontSize: '13px' } }, line2) : null,
      tar.aim === '6h' ? h('span', { class: 'muted', style: { fontSize: '13px' } }, 'Visée à 6 h : le guidon effleure le bas du visuel noir, ' + num(T.black / 20, 0) + ' cm sous le centre. Pour toucher le centre, la balle doit monter d’autant.') : null,
      h('span', { class: 'muted', style: { fontSize: '12px' } }, T.name + ' : visuel noir ' + T.black + ' mm (zones ' + T.blackFrom + ' à 10)' + (T.cordon ? ', cordon ' + num(T.cordon, 1).replace(',0', '') + ' mm' : '') + (T.blackConfirmed ? '' : ', cote à vérifier sur le règlement') + ' · règlement TAR 2025-2026.')),
    h('section', { class: 'card' },
      h('div', { class: 'row' }, h('span', { class: 'label grow' }, ev ? 'Points de l’épreuve' : 'Série'), h('b', { class: 'mono', style: { fontSize: '20px' } }, total + (es ? ' / ' + es.max : ' pts')), ev ? null : h('span', { class: 'muted', style: { fontSize: '13px' } }, ' · ' + shots.length + ' impact' + (shots.length > 1 ? 's' : ''))),
      es ? h('div', { style: { margin: '6px 0' } }, es.rows.map((r) => h('div', { class: 'kv' }, h('span', null, r.k), h('span', { class: 'mono' }, r.pts + ' / ' + r.max)))) : null,
      gongCard ? null : h('div', { class: 'muted', style: { fontSize: '12px', margin: '4px 0 8px' } }, shots.length ? (ev ? ev.phases[pIdx][0] + ' : ' : 'Derniers : ') + shots.slice(-10).map((p) => score(T, p.x, p.y, hole)).join(' · ') + (ev && !phaseScored(ev, pIdx) ? ' (essais, non comptés)' : '') : 'Touchez le centre de chaque trou sur la cible : Kronos compte les points (ligne touchée = zone supérieure).'),
      h('div', { class: 'grid3' },
        h('button', { class: 'btn', onClick: () => { if (gongCard) { const k = pData.gongs.lastIndexOf(true); if (k >= 0) pData.gongs[k] = false; } else setShots(shots.slice(0, -1)); app.tarSel = null; ui({}); } }, 'Annuler'),
        h('button', { class: 'btn', onClick: () => { if (gongCard) pData.gongs = [false, false, false, false, false]; else setShots([]); app.tarSel = null; ui({}); } }, 'Effacer'),
        h('button', { class: 'btn primary', onClick: saveSeries }, 'Enregistrer'))),
    ev ? null : matchCard(ev, gun));
}
