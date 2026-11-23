// Photo de cible : 4 coins du carton à placer, puis redressement (correction de perspective).
import { h } from './dom.js';
import { rectify, convexQuad } from '../engine/homography.js';

const MAX_SRC = 1600, OUT_W = 900, LOUPE_PX = 132, LOUPE_ZOOM = 3;
export const CORNER_NAMES = ['haut gauche', 'haut droit', 'bas droit', 'bas gauche'];

/** Charge une photo, réduite à 1 600 px au plus, avec ses pixels. */
export function loadPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_SRC / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), hh = Math.round(img.naturalHeight * k);
      const c = document.createElement('canvas'); c.width = w; c.height = hh;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, hh);
      URL.revokeObjectURL(url);
      resolve({ canvas: c, w, h: hh, url: c.toDataURL('image/jpeg', 0.85), data: ctx.getImageData(0, 0, w, hh).data });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Photo illisible')); };
    img.src = url;
  });
}

/** Coins par défaut : rectangle en retrait de 12 %. */
export const defaultCorners = (raw) => {
  const mx = raw.w * 0.12, my = raw.h * 0.12;
  return [{ x: mx, y: my }, { x: raw.w - mx, y: my }, { x: raw.w - mx, y: raw.h - my }, { x: mx, y: raw.h - my }];
};

/** Image redressée (URL) de la cible T vue par les 4 coins, ou null si les coins sont incohérents. */
export function rectifyPhoto(raw, corners, T) {
  if (!convexQuad(corners)) return null;
  const r = rectify(raw.data, raw.w, raw.h, corners, T.w, T.h, OUT_W);
  if (!r) return null;
  const c = document.createElement('canvas'); c.width = r.width; c.height = r.height;
  c.getContext('2d').putImageData(new ImageData(r.data, r.width, r.height), 0, 0);
  return c.toDataURL('image/jpeg', 0.9);
}

/** Éditeur des 4 coins : poignées à faire glisser, loupe pendant le geste. onChange(corners) au lever du doigt. */
export function cornerEditor(raw, corners, onChange) {
  const cs = corners.map((p) => ({ ...p }));
  const poly = h('polygon', { points: '', fill: 'rgba(56, 189, 248, .12)', stroke: 'var(--cyan)', 'stroke-width': String(raw.w / 250) });
  const overlay = h('svg', { viewBox: '0 0 ' + raw.w + ' ' + raw.h, class: 'cov', 'aria-hidden': 'true' }, poly);
  const handles = cs.map((p, i) => h('button', { class: 'corner', type: 'button', 'aria-label': 'Coin ' + CORNER_NAMES[i] + ' : faites glisser sur le coin du carton' }, String(i + 1)));
  const box = h('div', { class: 'cbox' }, h('img', { src: raw.url, alt: 'Photo de la cible', draggable: 'false' }), overlay, handles);
  const place = () => {
    poly.setAttribute('points', cs.map((p) => p.x + ',' + p.y).join(' '));
    handles.forEach((el, i) => { el.style.left = (cs[i].x / raw.w * 100) + '%'; el.style.top = (cs[i].y / raw.h * 100) + '%'; });
  };
  place();
  let loupe = null;
  const showLoupe = (e, p) => {
    if (!loupe) { loupe = h('canvas', { class: 'loupe', width: String(LOUPE_PX * 2), height: String(LOUPE_PX * 2), 'aria-hidden': 'true' }); document.body.appendChild(loupe); }
    const ctx = loupe.getContext('2d'), r = box.getBoundingClientRect(), k = raw.w / r.width;
    const half = LOUPE_PX / LOUPE_ZOOM * k;
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, loupe.width, loupe.height);
    ctx.drawImage(raw.canvas, p.x - half, p.y - half, half * 2, half * 2, 0, 0, loupe.width, loupe.height);
    ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(loupe.width / 2, 0); ctx.lineTo(loupe.width / 2, loupe.height); ctx.moveTo(0, loupe.height / 2); ctx.lineTo(loupe.width, loupe.height / 2); ctx.stroke();
    const left = Math.min(window.innerWidth - LOUPE_PX - 8, Math.max(8, e.clientX - LOUPE_PX / 2));
    const top = e.clientY - LOUPE_PX - 56 < 8 ? e.clientY + 56 : e.clientY - LOUPE_PX - 56;
    Object.assign(loupe.style, { left: left + 'px', top: top + 'px', width: LOUPE_PX + 'px', height: LOUPE_PX + 'px' });
  };
  handles.forEach((el, i) => {
    let id = null;
    const at = (e) => { const r = box.getBoundingClientRect(); return { x: Math.min(raw.w, Math.max(0, (e.clientX - r.left) / r.width * raw.w)), y: Math.min(raw.h, Math.max(0, (e.clientY - r.top) / r.height * raw.h)) }; };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; try { el.setPointerCapture(id); } catch (err) { /* ignoré */ } showLoupe(e, cs[i]); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; cs[i] = at(e); place(); showLoupe(e, cs[i]); });
    const up = (e) => { if (e.pointerId !== id) return; id = null; if (loupe) { loupe.remove(); loupe = null; } onChange(cs.map((p) => ({ ...p }))); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
  return box;
}
