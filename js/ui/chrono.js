// Mesures au chronographe et sensibilité de la poudre apprise.
import { h, fill } from './dom.js';
import { num, int, dateFr } from './format.js';
import { app, set, toast, M } from '../app.js';
import { frame, field } from './sheets.js';
import { powderFit, MIN_POINTS, MIN_SPAN } from '../engine/powder.js';

function chart(log, fit) {
  const W = 320, H = 120, ts = log.map((m) => m.t), vs = log.map((m) => m.v0);
  const t0 = Math.min(...ts) - 3, t1 = Math.max(...ts) + 3, v0 = Math.min(...vs) - 4, v1 = Math.max(...vs) + 4;
  const X = (t) => 28 + (t - t0) / (t1 - t0) * (W - 40), Y = (v) => 10 + (v1 - v) / (v1 - v0) * (H - 30);
  return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'V0 mesurée selon la température de la poudre' },
    h('line', { x1: '28', y1: String(H - 20), x2: String(W - 8), y2: String(H - 20), stroke: 'var(--border)' }),
    h('text', { x: '28', y: String(H - 4), fill: 'var(--muted)', 'font-size': '10' }, num(t0, 0) + ' °C'),
    h('text', { x: String(W - 8), y: String(H - 4), fill: 'var(--muted)', 'font-size': '10', 'text-anchor': 'end' }, num(t1, 0) + ' °C'),
    h('text', { x: '2', y: '14', fill: 'var(--muted)', 'font-size': '10' }, int(v1)),
    h('text', { x: '2', y: String(H - 22), fill: 'var(--muted)', 'font-size': '10' }, int(v0)),
    fit ? h('line', { x1: String(X(t0)), y1: String(Y(fit.at(t0))), x2: String(X(t1)), y2: String(Y(fit.at(t1))), stroke: fit.ok ? 'var(--amber)' : 'var(--muted)', 'stroke-width': '2', 'stroke-dasharray': fit.ok ? null : '5 4' }) : null,
    log.map((m) => h('circle', { cx: String(X(m.t)), cy: String(Y(m.v0)), r: '5', fill: 'var(--cyan)' })));
}

export function chronoSheet(gunId, loadId) {
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
  const tF = field('Température de la poudre (°C)', app.state.met.t, { help: 'Mesurez la poudre (cartouches à l’ombre), pas seulement l’air.' });
  const vF = field('V0 moyenne (m/s)', '');
  const nF = field('Nombre de tirs', '');
  const sdF = field('Écart-type (m/s, facultatif)', '');
  const err = h('div', { class: 'errors', role: 'alert' });

  function draw() {
    const gun = app.state.guns.find((g) => g.id === gunId), l = gun && gun.loads.find((x) => x.id === loadId);
    if (!l) { fill(body, h('p', null, 'Munition introuvable.')); return; }
    const log = l.chronoLog || [];
    const fit = powderFit(log);
    const add = () => {
      const m = { t: tF.get(), v0: vF.get(), n: nF.get(), sd: sdF.get() };
      if (!isFinite(m.t) || m.t < -40 || m.t > 70) { err.textContent = 'Température entre −40 et 70 °C'; return; }
      if (!isFinite(m.v0) || m.v0 < 100 || m.v0 > 1500) { err.textContent = 'V0 entre 100 et 1500 m/s'; return; }
      err.textContent = '';
      set((s) => M.replaceGun(s, M.addChrono(s.guns.find((g) => g.id === gunId), loadId, { t: m.t, v0: m.v0, n: isFinite(m.n) ? Math.round(m.n) : null, sd: isFinite(m.sd) ? m.sd : null })));
      vF.input.value = ''; nF.input.value = ''; sdF.input.value = '';
      toast('Mesure ajoutée'); draw();
    };
    const apply = () => {
      set((s) => M.replaceGun(s, M.applyChrono(s.guns.find((g) => g.id === gunId), loadId, fit)));
      const nl = app.state.guns.find((g) => g.id === gunId).loads.find((x) => x.id === loadId);
      toast('V0 mesurée : ' + int(nl.v0) + ' m/s à ' + num(nl.refTemp ?? 15, 0) + ' °C' + (fit && fit.ok ? ' · sensibilité ' + num(nl.sens, 2) : ''));
      draw();
    };
    let fitTxt;
    if (!fit) fitTxt = log.length ? 'Une mesure : elle peut servir de V0 mesurée.' : 'Aucune mesure. Notez la V0 moyenne de chaque série au chronographe avec la température de la poudre.';
    else if (!fit.ok) fitTxt = 'Sensibilité provisoire : ' + num(fit.slope, 2) + ' m/s par °C. Pour conclure : au moins ' + MIN_POINTS + ' mesures sur ' + MIN_SPAN + ' °C d’écart (actuellement ' + fit.n + ' sur ' + num(fit.span, 0) + ' °C).';
    else fitTxt = 'Sensibilité apprise : ' + num(fit.slope, 2) + ' m/s par °C (R² ' + num(fit.r2, 2) + (fit.r2 < 0.6 ? ', mesures dispersées' : '') + ') · V0 à ' + num(l.refTemp ?? 15, 0) + ' °C : ' + int(fit.at(l.refTemp ?? 15)) + ' m/s.';
    fill(body,
      h('div', { class: 'muted', style: { fontSize: '13px' } }, l.name + ' · actuellement ' + int(l.v0) + ' m/s à ' + num(l.refTemp ?? 15, 0) + ' °C (' + (l.measured ? 'mesurée' : 'annoncée') + '), sensibilité ' + num(l.sens || 0, 2) + ' m/s par °C'),
      h('div', { class: 'grid2' }, tF.el, vF.el), h('div', { class: 'grid2' }, nF.el, sdF.el), err,
      h('button', { class: 'btn block', onClick: add }, 'Ajouter la mesure'),
      log.length >= 2 ? h('div', { class: 'card' }, chart(log, fit)) : null,
      h('div', { class: fit && fit.ok ? 'notice info' : 'card', style: { fontSize: '13px', lineHeight: '1.45' } }, fitTxt),
      log.length ? h('button', { class: 'btn primary block', onClick: apply }, fit && fit.ok ? 'Appliquer V0 et sensibilité' : 'Utiliser la dernière mesure comme V0') : null,
      log.length ? h('div', null, h('h2', null, 'Mesures'),
        log.slice().reverse().map((m) => h('div', { class: 'row', style: { padding: '6px 0', borderBottom: '1px solid var(--border)' } },
          h('span', { class: 'grow mono', style: { fontSize: '14px' } }, dateFr(m.d) + ' · ' + num(m.t, 0) + ' °C · ' + int(m.v0) + ' m/s' + (m.n ? ' · ' + m.n + ' tirs' : '') + (m.sd ? ' · σ ' + num(m.sd, 1) : '')),
          h('button', { class: 'icon-btn', style: { width: '44px', height: '44px', color: 'var(--red)' }, 'aria-label': 'Supprimer la mesure du ' + dateFr(m.d), onClick: () => { set((s) => M.replaceGun(s, M.removeChrono(s.guns.find((g) => g.id === gunId), loadId, m.id))); draw(); } }, '×')))) : null,
      h('p', { class: 'muted', style: { fontSize: '12px', margin: '0', lineHeight: '1.45' } }, 'Une V0 mesurée réduit l’incertitude de la zone probable (±12 m/s si annoncée). Mesurez la poudre à différentes saisons pour apprendre sa sensibilité.'));
  }
  draw();
  return frame('Chronographe', body);
}
