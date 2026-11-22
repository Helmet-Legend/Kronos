// Onglet Armes : liste, fiche d'arme, munitions, compteur de coups.
import { h, icon } from './dom.js';
import { num, int, dateFr } from './format.js';
import { app, set, ui, openSheet, confirm, toast, M } from '../app.js';
import { gunSheet, loadSheet, catalogSheet, shotsSheet } from './sheets.js';
import { millerSg } from '../engine/solver.js';
import { carnetSheet, sessionStats } from './carnet.js';
import { mmToMoa } from '../engine/grouping.js';
import { backupBanner } from './reglages.js';
import { hausseCard } from './hausse.js';
import { chronoSheet } from './chrono.js';
import { tipCard } from './aide.js';

const TWIST = { R: 'à droite', L: 'à gauche', '?': 'sens inconnu' };

export function renderArmes() {
  const s = app.state;
  const g = app.armeId && s.guns.find((x) => x.id === app.armeId);
  return g ? gunDetail(g) : gunList(s);
}

function gunList(s) {
  return h('main', null,
    tipCard(['arm']),
    backupBanner(),
    s.guns.map((g) => {
      const l = M.activeLoad(g);
      return h('button', { class: 'item' + (g.id === s.gunId ? ' on' : ''), onClick: () => ui({ armeId: g.id }) },
        h('span', { class: 'grow' }, h('b', null, g.name),
          h('small', null, (g.cal || 'calibre ?') + ' · ' + l.name),
          h('small', null, int(g.counter.total) + ' coups au total · ' + int(g.counter.since) + ' depuis le nettoyage')),
        g.id === s.gunId ? h('span', { class: 'label', style: { color: 'var(--amber)' } }, 'active') : null);
    }),
    h('button', { class: 'btn block', style: { borderStyle: 'dashed', color: 'var(--amber)' }, onClick: () => openSheet('gun-new', () => gunSheet(null)) }, '+ Ajouter une arme'));
}

function gunDetail(g) {
  const s = app.state, l = M.activeLoad(g);
  const sightTxt = g.sight.kind === 'scope' ? 'Lunette ' + g.sight.unit + ', clic ' + num(g.sight.click, g.sight.click < 0.1 ? 3 : 2) : 'Visée mécanique';
  const sg = millerSg({ grains: l.grains, dMm: l.dMm, lenMm: l.lenMm, twistMm: g.twist, v: l.v0, t: 15, p: 1013.25 });
  const sgTxt = sg === null ? '—' : num(sg, 2) + (sg < 1 ? ' · instable' : sg < 1.4 ? ' · limite' : ' · stable');
  const sgCol = sg === null ? 'var(--fg)' : sg < 1 ? 'var(--red)' : sg < 1.4 ? 'var(--amber)' : 'var(--cyan)';
  const c = g.counter;
  const log = c.log.slice(-8).reverse();

  return h('main', null,
    h('div', { class: 'row' },
      h('button', { class: 'icon-btn', onClick: () => ui({ armeId: null }), 'aria-label': 'Retour à la liste' }, icon('back')),
      h('div', { class: 'grow' }, h('div', { style: { fontSize: '18px', fontWeight: '700' } }, g.name), h('div', { class: 'muted', style: { fontSize: '13px' } }, g.cal || 'calibre ?')),
      g.id !== s.gunId ? h('button', { class: 'btn small primary', onClick: () => { set((x) => ({ ...x, gunId: g.id })); toast(g.name + ' est l’arme active'); } }, 'Utiliser') : h('span', { class: 'label', style: { color: 'var(--amber)' } }, 'active')),

    h('section', { class: 'card' },
      h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Arme et visée'), h('button', { class: 'btn small', onClick: () => openSheet('gun-' + g.id, () => gunSheet(g.id)) }, 'Modifier')),
      kv('Canon', int(g.barrelMm) + ' mm'),
      kv('Pas de rayure', int(g.twist) + ' mm · ' + TWIST[g.twistDir]),
      kv('Visée', sightTxt),
      kv('Hauteur de visée', int(g.sightH * 1000) + ' mm'),
      g.sight.kind === 'iron' && g.sight.tangent ? kv('Hausse', 'graduée de ' + g.sight.tangent.min + ' à ' + g.sight.tangent.max + ' m') : kv('Zéro', g.zero + ' m'),
      kv('Dispersion arme + tireur', num(g.dispersionMoa ?? 1.5, 1) + ' MOA')),

    g.sight.kind === 'iron' && g.sight.tangent ? hausseCard(g) : null,

    h('section', { class: 'card' },
      h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Munitions')),
      g.loads.map((x) => h('div', { class: 'row', style: { padding: '8px 0', borderBottom: '1px solid var(--border)' } },
        h('button', { class: 'chip', 'aria-pressed': String(x.id === g.loadId), 'aria-label': 'Utiliser ' + x.name, onClick: () => set((st) => M.replaceGun(st, { ...g, loadId: x.id })) }, x.id === g.loadId ? 'active' : 'choisir'),
        h('div', { class: 'grow' }, h('div', { style: { fontWeight: '700', fontSize: '14px' } }, x.name), h('div', { class: 'muted', style: { fontSize: '12px' } }, x.model + ' ' + num(x.bc, 3) + ' · ' + int(x.v0) + ' m/s ' + (x.measured ? 'mesurée' : 'annoncée'))),
        h('button', { class: 'btn small', onClick: () => openSheet('load-' + x.id, () => loadSheet(g.id, x.id)), 'aria-label': 'Modifier ' + x.name }, 'Modifier'),
        g.loads.length > 1 ? h('button', { class: 'btn small danger', 'aria-label': 'Supprimer ' + x.name, onClick: () => confirm({ title: 'Supprimer la munition ?', text: x.name + ' sera supprimée de ' + g.name + '.', ok: 'Supprimer', danger: true, onOk: () => { set((st) => M.replaceGun(st, M.removeLoad(st.guns.find((y) => y.id === g.id), x.id))); toast('Munition supprimée'); } }) }, '×') : null)),
      h('div', { class: 'grid2', style: { marginTop: '10px' } },
        h('button', { class: 'btn small', onClick: () => openSheet('catalog', () => catalogSheet(g.id)) }, 'Depuis le catalogue'),
        h('button', { class: 'btn small', onClick: () => openSheet('load-new', () => loadSheet(g.id, null)) }, 'Saisie manuelle')),
      h('button', { class: 'btn small block', style: { marginTop: '8px' }, onClick: () => openSheet('chrono-' + l.id, () => chronoSheet(g.id, l.id)) }, 'Chronographe · ' + l.name + ((l.chronoLog || []).length ? ' (' + l.chronoLog.length + ')' : '')),
      kv('Stabilité (Miller)', h('span', { style: { color: sgCol, fontWeight: '700' } }, sgTxt)),
      carnetCard(g, l)),

    tipCard(['ent']),
    h('section', { class: 'card' },
      h('span', { class: 'label' }, 'Compteur de coups'),
      h('div', { class: 'grid2', style: { margin: '8px 0' } },
        h('div', null, h('div', { class: 'big mono' }, int(c.total)), h('div', { class: 'muted', style: { fontSize: '12px' } }, 'au total, jamais remis à zéro')),
        h('div', null, h('div', { class: 'big mono', style: { color: 'var(--cyan)' } }, int(c.since)), h('div', { class: 'muted', style: { fontSize: '12px' } }, 'depuis le dernier nettoyage'))),
      h('div', { class: 'grid2' },
        h('button', { class: 'btn small primary', onClick: () => { if (s.gunId !== g.id) set((x) => ({ ...x, gunId: g.id })); openSheet('shots', shotsSheet); } }, '+ Coups'),
        h('button', { class: 'btn small', onClick: () => confirm({ title: 'Nettoyage fait ?', text: 'Le compteur depuis le nettoyage repart à zéro. Le total (' + int(c.total) + ' coups) est conservé.', ok: 'Nettoyage fait', onOk: () => { set((st) => M.replaceGun(st, M.cleaned(st.guns.find((y) => y.id === g.id)))); toast('Nettoyage enregistré'); } }) }, 'Nettoyage fait')),
      log.length ? h('div', { style: { marginTop: '8px' } },
        log.map((e) => kv(dateFr(e.d), e.k === 'nettoyage' ? 'nettoyage' : e.k === 'annulé' ? h('s', { class: 'muted' }, '+' + e.n + ' coups') : '+' + e.n + ' coups')),
        c.log.some((e) => e.k === 'tir') ? h('button', { class: 'btn small ghost block', onClick: () => confirm({ title: 'Annuler la dernière saisie ?', text: 'Pour corriger une erreur de frappe. La ligne reste barrée dans l’historique.', ok: 'Annuler la saisie', onOk: () => set((st) => M.replaceGun(st, M.undoLast(st.guns.find((y) => y.id === g.id)))) }) }, 'Annuler la dernière saisie') : null) : null),

    s.guns.length > 1 ? h('button', { class: 'btn danger block', onClick: () => confirm({ title: 'Supprimer ' + g.name + ' ?', text: 'L’arme, ses munitions et son compteur (' + int(c.total) + ' coups) seront supprimés. Exportez une sauvegarde avant si besoin.', ok: 'Supprimer', danger: true, onOk: () => { app.armeId = null; set((st) => M.removeGun(st, g.id)); toast('Arme supprimée'); } }) }, 'Supprimer cette arme') : null);
}

function carnetCard(g, l) {
  const all = g.sessions || [], forLoad = all.filter((x) => x.loadId === l.id);
  const avg = forLoad.length ? forLoad.reduce((a, x) => a + mmToMoa(sessionStats(x).es, x.dist), 0) / forLoad.length : null;
  const sub = all.length ? all.length + ' séance' + (all.length > 1 ? 's' : '') + ' · groupe moyen ' + (avg === null ? '— avec cette munition' : num(avg, 1) + ' MOA avec ' + l.name) : 'Aucune séance : saisissez votre prochaine cible';
  return h('button', { class: 'item', style: { marginTop: '10px', borderColor: 'var(--cyan)' }, onClick: () => openSheet('carnet-' + g.id, () => carnetSheet(g.id)) },
    h('span', { class: 'grow' }, h('b', null, 'Carnet de séances'), h('small', null, sub)),
    h('span', { style: { color: 'var(--cyan)', fontWeight: '700', fontSize: '13px' } }, 'Ouvrir'));
}

function kv(k, v) { return h('div', { class: 'kv' }, h('span', null, k), h('span', null, v)); }
