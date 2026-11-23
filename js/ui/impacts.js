// Saisie des impacts sur une cible dessinée : toucher-glisser avec loupe, sélection, déplacement.
//  - toucher la cible : une loupe ×4 suit le doigt, l'impact est posé au lever ;
//  - toucher un impact : il est sélectionné (puis « Supprimer l'impact ») ;
//  - glisser un impact : il est déplacé.
import { h } from './dom.js';
import { targetSvg } from './carnet.js';
import { nearestShot } from '../engine/grouping.js';

const LOUPE_PX = 132, LOUPE_ZOOM = 4, HIT_MIN_PX = 7, MOVE_PX = 4;

/**
 * @param {object} T cible (TARGETS)
 * @param {object} o { shots, sel, svg: options de targetSvg, label, onChange(shots, sel) }
 */
export function impactPad(T, o) {
  const svgOpts = { ...o.svg, shots: o.shots, sel: o.sel };
  const svg = targetSvg(T, svgOpts);
  const pad = h('div', { class: 'target pad', role: 'img', 'aria-label': o.label || 'Cible : touchez pour placer un impact' }, svg);
  let drag = null;

  const view = () => svg.viewBox.baseVal;
  const toMm = (e) => {
    const r = svg.getBoundingClientRect(), v = view();
    return { x: v.x + (e.clientX - r.left) / r.width * v.width, y: -(v.y + (e.clientY - r.top) / r.height * v.height), pxPerMm: r.width / v.width };
  };

  function showLoupe(e, p) {
    if (!drag.loupe) {
      const w = view().width / LOUPE_ZOOM;
      drag.lw = w;
      drag.lsvg = targetSvg(T, { ...svgOpts, view: [p.x - w / 2, -p.y - w / 2, w, w] });
      drag.lsvg.style.aspectRatio = '1 / 1';
      drag.lmark = h('circle', { r: String(Math.max((o.svg.holeMm || 7.8) / 2, w / 18)), fill: 'var(--cyan)', 'fill-opacity': '0.55', stroke: 'var(--paper)', 'stroke-width': String(w / 200) });
      drag.lsvg.appendChild(drag.lmark);
      drag.loupe = h('div', { class: 'loupe', 'aria-hidden': 'true' }, drag.lsvg, h('span', { class: 'cross' }));
      document.body.appendChild(drag.loupe);
    }
    const w = drag.lw;
    drag.lsvg.setAttribute('viewBox', [p.x - w / 2, -p.y - w / 2, w, w].join(' '));
    drag.lmark.setAttribute('cx', String(p.x)); drag.lmark.setAttribute('cy', String(-p.y));
    const left = Math.min(window.innerWidth - LOUPE_PX - 8, Math.max(8, e.clientX - LOUPE_PX / 2));
    const top = e.clientY - LOUPE_PX - 48 < 8 ? e.clientY + 48 : e.clientY - LOUPE_PX - 48;
    Object.assign(drag.loupe.style, { left: left + 'px', top: top + 'px' });
  }
  function end() { if (drag && drag.loupe) drag.loupe.remove(); }

  pad.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    try { pad.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
    const p = toMm(e);
    // on ne sélectionne qu'en touchant le point dessiné : un nouvel impact peut être posé tout près d'un autre
    const holeMm = Math.max((o.svg.holeMm || 7.8) / 2, 5 / p.pxPerMm);
    const hit = nearestShot(o.shots, p, Math.max(holeMm, HIT_MIN_PX / p.pxPerMm));
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, hit, moved: false, p, slop: e.pointerType === 'touch' ? 8 : MOVE_PX };
    drag.el = hit >= 0 ? svg.querySelector('circle[data-i="' + hit + '"]') : null;
    showLoupe(e, p);
  });
  pad.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = toMm(e);
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > drag.slop) drag.moved = true;
    drag.p = p;
    if (drag.el && drag.moved) { drag.el.setAttribute('cx', String(p.x)); drag.el.setAttribute('cy', String(-p.y)); }
    showLoupe(e, p);
  });
  const finish = (e, cancel) => {
    if (!drag || e.pointerId !== drag.id) return;
    end();
    const d = drag; drag = null;
    if (cancel) { o.onChange(o.shots, o.sel); return; }
    const q = { x: Math.round(d.p.x), y: Math.round(d.p.y) };
    if (d.hit >= 0 && d.moved) { const s = o.shots.slice(); s[d.hit] = q; o.onChange(s, d.hit); }
    else if (d.hit >= 0) o.onChange(o.shots, o.sel === d.hit ? null : d.hit);
    else o.onChange([...o.shots, q], null);
  };
  pad.addEventListener('pointerup', (e) => finish(e, false));
  pad.addEventListener('pointercancel', (e) => finish(e, true));
  return pad;
}

/** Texte d'aide et bouton de suppression de l'impact sélectionné. */
export function selectionBar(shots, sel, onDelete) {
  if (sel === null || sel === undefined || !shots[sel]) return null;
  return h('div', { class: 'row selbar' },
    h('span', { class: 'grow', style: { fontSize: '13px' } }, h('b', null, 'Impact n° ' + (sel + 1)), ' sélectionné : faites-le glisser pour le déplacer.'),
    h('button', { class: 'btn small danger', onClick: onDelete }, 'Supprimer l’impact'));
}
