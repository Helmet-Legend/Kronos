// Développement de charge : échelle entre les bornes du manuel, mesures par palier, charge candidate.
import { h, fill } from './dom.js';
import { num, int, parseNum } from './format.js';
import { app, set, toast, confirm, openSheet, M } from '../app.js';
import { frame, field } from './sheets.js';
import { SIGNS, STEP_CHOICES, MAX_STEPS, buildSteps, analyzeLadder } from '../engine/ladder.js';
import { tipCard } from './aide.js';

const WARN = 'Kronos ne fournit aucune charge. Saisissez les bornes de votre manuel ou de la table du fabricant de poudre, commencez toujours à la charge de départ et arrêtez au premier signe de pression.';

export function ladderSheet(gunId, loadId) {
  const body = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
  const open = new Set(); // paliers dont la liste des signes est dépliée
  const getLoad = () => { const g = app.state.guns.find((x) => x.id === gunId); return g && g.loads.find((x) => x.id === loadId); };
  const upd = (fn) => set((s) => M.replaceGun(s, fn(s.guns.find((x) => x.id === gunId))));

  function setup(l) {
    const src = field('Source (obligatoire)', '', { text: true, placeholder: 'ex. manuel, édition et page', help: 'Manuel de rechargement (édition et page), table du fabricant de poudre…' });
    const pw = field('Poudre', l.powder || '', { text: true });
    const st = field('Charge de départ (gr)', ''), mx = field('Charge maximale (gr)', '');
    let step = 0.3;
    const err = h('div', { class: 'errors', role: 'alert' });
    const stepChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Écart entre paliers' });
    const drawChips = () => fill(stepChips, STEP_CHOICES.map((p) => h('button', { class: 'chip', 'aria-pressed': String(step === p), onClick: () => { step = p; drawChips(); } }, num(p, 1) + ' gr')));
    drawChips();
    const create = () => {
      const o = { source: src.get(), powder: pw.get(), start: st.get(), max: mx.get(), step, t: app.state.met.t };
      if (!o.source) { err.textContent = 'Indiquez la source de vos bornes (manuel, édition, page)'; return; }
      if (!(o.start > 0 && o.start < 150) || !(o.max > o.start && o.max < 150)) { err.textContent = 'Charge de départ puis charge maximale, entre 0 et 150 gr'; return; }
      if (!buildSteps(o.start, o.max, step)) { err.textContent = MAX_STEPS + ' paliers au plus : augmentez l’écart entre paliers'; return; }
      upd((g) => M.setLadder(g, loadId, o));
      toast('Échelle créée : ' + buildSteps(o.start, o.max, step).length + ' paliers'); draw();
    };
    return [src.el, pw.el, h('div', { class: 'grid2' }, st.el, mx.el), h('div', null, h('span', { class: 'label' }, 'Écart entre paliers'), h('div', { style: { marginTop: '6px' } }, stepChips)), err,
      h('button', { class: 'btn primary block', onClick: create }, 'Créer l’échelle')];
  }

  function stepRow(l, s, i, stopped) {
    const inp = (val, label, key) => h('input', { class: 'cell mono', type: 'text', inputmode: 'decimal', value: val === null || val === undefined ? '' : String(val).replace('.', ','), 'aria-label': label, disabled: stopped ? true : null,
      onChange: (e) => { const v = parseNum(e.target.value); upd((g) => M.updateLadderStep(g, loadId, i, { [key]: isFinite(v) ? v : null })); redrawKeepFocus(); } });
    const nSigns = (s.signs || []).length;
    return h('div', { class: 'lrow' + (stopped ? ' stop' : '') },
      h('div', { class: 'lmain' },
        h('b', { class: 'mono' }, num(s.gr, 1)),
        inp(s.v0, 'V0 au palier ' + num(s.gr, 1) + ' gr', 'v0'),
        inp(s.groupMm, 'Groupement au palier ' + num(s.gr, 1) + ' gr', 'groupMm'),
        stopped && !nSigns ? h('span', { class: 'tag', style: { color: 'var(--red)' } }, 'ARRÊT')
          : h('button', { class: 'mini sign' + (nSigns ? ' on' : ''), 'aria-expanded': String(open.has(i)), 'aria-label': 'Signes de pression au palier ' + num(s.gr, 1) + ' gr', onClick: () => { open.has(i) ? open.delete(i) : open.add(i); draw(); } }, nSigns ? '⚠ ' + nSigns : 'Signes')),
      open.has(i) ? h('div', { class: 'chips', style: { marginTop: '6px' } }, Object.entries(SIGNS).map(([k, label]) => {
        const on = (s.signs || []).includes(k);
        return h('button', { class: 'chip', 'aria-pressed': String(on), onClick: () => { upd((g) => M.updateLadderStep(g, loadId, i, { signs: on ? s.signs.filter((x) => x !== k) : [...(s.signs || []), k] })); draw(); } }, label);
      })) : null);
  }

  // la case touchée ensuite garde le focus (le clavier du téléphone reste ouvert)
  function redrawKeepFocus() {
    setTimeout(() => {
      const a = document.activeElement, lab = a && body.contains(a) ? a.getAttribute('aria-label') : null;
      draw();
      if (lab) { const el = [...body.querySelectorAll('[aria-label]')].find((x) => x.getAttribute('aria-label') === lab); if (el) el.focus(); }
    }, 0);
  }

  function draw() {
    const l = getLoad();
    if (!l) { fill(body, h('p', null, 'Munition introuvable.')); return; }
    const L = l.ladder;
    if (!L) { fill(body, tipCard(['ladder']), h('div', { class: 'notice' }, WARN), h('div', { class: 'muted', style: { fontSize: '13px' } }, l.name), setup(l)); return; }
    const a = analyzeLadder(L.steps);
    const cand = a.candidate;
    fill(body,
      tipCard(['ladder']),
      h('div', { class: 'notice' }, WARN),
      h('div', { class: 'muted', style: { fontSize: '13px', lineHeight: '1.45' } }, l.name + ' · ' + (L.powder || 'poudre ?') + ' · ' + num(L.start, 1) + ' à ' + num(L.max, 1) + ' gr par ' + num(L.step, 1) + ' · source : ' + L.source),
      h('div', { class: 'lrow head' }, h('div', { class: 'lmain' }, h('span', null, 'gr'), h('span', null, 'V0 m/s'), h('span', null, 'Groupe mm'), h('span', null, 'Pression'))),
      L.steps.map((s, i) => stepRow(l, s, i, a.stopAt !== null && i >= a.stopAt)),
      a.stopAt !== null ? h('div', { class: 'notice', style: { borderColor: 'var(--red)' } }, 'Signe de pression à ' + num(L.steps[a.stopAt].gr, 1) + ' gr : l’échelle s’arrête là. Ne tirez aucun palier supérieur.') : null,
      h('div', { class: cand ? 'notice info' : 'card', style: { fontSize: '14px', lineHeight: '1.5' } },
        cand ? [h('b', null, 'Charge candidate : ' + num(cand.gr, 1) + ' gr'), h('br'), 'V0 stable à ' + int(cand.spread) + ' m/s près de ' + num(cand.from, 1) + ' à ' + num(cand.to, 1) + ' gr. À confirmer par 3 groupements de 5 coups avant de l’adopter.'] : a.reason),
      cand ? h('button', { class: 'btn primary block', onClick: () => confirm({ title: 'Enregistrer ' + num(cand.gr, 1) + ' gr ?', text: 'La recette de ' + l.name + ' prend cette charge (' + (L.powder || 'poudre') + ', source : ' + L.source + ') et la V0 mesurée à ce palier.', ok: 'Enregistrer',
        onOk: () => { upd((g) => M.applyLadder(g, loadId, cand.gr, L.steps[cand.index].v0)); toast('Recette mise à jour : ' + num(cand.gr, 1) + ' gr'); openSheet('ladder-' + loadId, () => ladderSheet(gunId, loadId)); } }) }, 'Enregistrer dans la recette') : null,
      l.chargeGr ? h('div', { class: 'kv' }, h('span', null, 'Recette actuelle'), h('span', null, num(l.chargeGr, 1) + ' gr · ' + (l.powder || '') )) : null,
      h('button', { class: 'btn small ghost block', onClick: () => confirm({ title: 'Effacer l’échelle ?', text: 'Les mesures des paliers seront perdues. La recette enregistrée reste.', ok: 'Effacer', danger: true,
        onOk: () => { upd((g) => M.clearLadder(g, loadId)); openSheet('ladder-' + loadId, () => ladderSheet(gunId, loadId)); } }) }, 'Effacer l’échelle'));
  }
  draw();
  return frame('Développement de charge', body);
}
