// Panneaux du bas : choix du profil, météo, compteur, formulaires, confirmation.
import { h, icon } from './dom.js';
import { num, int, timeFr, parseNum, dateFr } from './format.js';
import { app, set, closeSheet, openSheet, toast, M } from '../app.js';
import { fetchMeteo, windHour } from '../data/meteo.js';
import { AMMO, SIGHTS } from '../data/catalog.js';
import { qnhFromStation, stationFromQnh } from '../engine/atmo.js';

export function frame(title, ...body) {
  return h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'grab' }),
    h('header', null, h('h3', null, title), h('button', { class: 'icon-btn', onClick: closeSheet, 'aria-label': 'Fermer' }, icon('close'))),
    ...body);
}

/** Champ de saisie numérique ou texte. Renvoie { el, get }. */
export function field(label, value, o = {}) {
  const id = 'f_' + Math.random().toString(36).slice(2, 8);
  const input = h('input', { id, type: 'text', inputmode: o.text ? 'text' : 'decimal', value: value === undefined || value === null ? '' : String(value).replace('.', o.text ? '.' : ','), autocomplete: 'off', placeholder: o.placeholder || '' });
  const el = h('div', { class: 'field' }, h('label', { for: id }, label), input, o.help ? h('span', { class: 'help' }, o.help) : null);
  return { el, input, get: () => (o.text ? input.value.trim() : parseNum(input.value)) };
}

function select(label, value, options) {
  const id = 'f_' + Math.random().toString(36).slice(2, 8);
  const sel = h('select', { id }, options.map(([v, l]) => h('option', { value: v, selected: v === value ? true : null }, l)));
  return { el: h('div', { class: 'field' }, h('label', { for: id }, label), sel), get: () => sel.value, sel };
}

/* ---------- Profil actif ---------- */
export function profileSheet() {
  const s = app.state;
  return frame('Arme et munition',
    h('h2', null, 'Arme'),
    s.guns.map((g) => h('button', { class: 'item' + (g.id === s.gunId ? ' on' : ''), onClick: () => { app.sheetEl = null; set((x) => ({ ...x, gunId: g.id })); } },
      h('span', { class: 'grow' }, h('b', null, g.name), h('small', null, (g.cal || 'calibre ?') + ' · ' + (g.sight.kind === 'scope' ? 'lunette ' + g.sight.unit : 'visée mécanique') + ' · zéro ' + g.zero + ' m')))),
    h('h2', null, 'Munition'),
    M.activeGun(s).loads.map((l) => h('button', { class: 'item' + (l.id === M.activeGun(s).loadId ? ' on' : ''), onClick: () => { set((x) => M.replaceGun(x, { ...M.activeGun(x), loadId: l.id })); closeSheet(); } },
      h('span', { class: 'grow' }, h('b', null, l.name), h('small', null, l.model + ' ' + num(l.bc, 3) + ' · ' + int(l.v0) + ' m/s' + (l.measured ? ' mesurée' : ' annoncée'))))),
    h('button', { class: 'btn block', onClick: () => { closeSheet(); app.view = 'armes'; app.armeId = s.gunId; set((x) => x); } }, 'Gérer les armes et munitions'));
}

/* ---------- Météo ---------- */
export function meteoSheet() {
  const m = app.state.met;
  const status = h('div', { class: 'muted', style: { fontSize: '13px' } }, m.source === 'auto' && m.at ? 'Dernière mise à jour à ' + timeFr(m.at) + (m.alt !== null && m.alt !== undefined ? ' · altitude ' + m.alt + ' m' : '') : 'Saisie manuelle');
  const t = field('Température (°C)', m.t);
  const pm = m.pMode === 'qnh' ? 'qnh' : 'station';
  const pSel = select('Pression', pm, [['station', 'Pression au stand (station)'], ['qnh', 'QNH (ramenée au niveau de la mer)']]);
  const p = field('Pression (hPa)', m.p, { help: 'Le baromètre du téléphone ou la station du stand donnent la pression au stand. Les bulletins météo donnent le QNH.' });
  const rh = field('Humidité (%)', m.rh);
  const alt = field('Altitude du stand (m)', m.alt ?? 0, { help: 'Sert à convertir le QNH en pression au stand.' });
  const az = field('Direction du tir (°, 0 = nord)', m.azimuth ?? '', { placeholder: 'ex. 270', help: 'Facultatif : permet de convertir le vent météo en heures.' });

  const saveManual = () => {
    const v = { t: t.get(), p: p.get(), rh: rh.get(), alt: alt.get() };
    if (![v.t, v.p, v.rh].every(isFinite) || v.t < -40 || v.t > 60 || v.p < 500 || v.p > 1100 || v.rh < 0 || v.rh > 100) { toast('Vérifiez les valeurs : °C entre −40 et 60, hPa entre 500 et 1100, % entre 0 et 100'); return; }
    const azv = az.get();
    set((s) => ({ ...s, met: { ...s.met, ...v, alt: isFinite(v.alt) ? v.alt : 0, pMode: pSel.get(), source: 'manual', azimuth: isFinite(azv) ? azv : null } }));
    closeSheet(); toast('Météo enregistrée');
  };
  const auto = async (btn) => {
    btn.disabled = true; btn.textContent = 'Localisation…';
    try {
      const r = await fetchMeteo();
      set((s) => ({ ...s, met: { ...s.met, t: r.t, p: r.p, rh: r.rh, alt: r.alt ?? s.met.alt, pMode: 'station', source: 'auto', at: new Date().toISOString(), wind: r.wind } }));
      closeSheet(); toast('Météo à jour : ' + num(r.t, 0) + ' °C, ' + r.p + ' hPa, ' + r.rh + ' %');
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Réessayer';
      toast(e.message || 'Météo indisponible');
    }
  };
  const autoBtn = h('button', { class: 'btn primary block', onClick: (e) => auto(e.currentTarget) }, 'Météo automatique (GPS)');

  let windBox = null;
  if (m.wind) {
    const azv = m.azimuth;
    windBox = h('div', { class: 'card' },
      h('div', { class: 'label' }, 'Vent météo (à 10 m du sol)'),
      h('div', { class: 'mono', style: { fontSize: '18px', fontWeight: '700', margin: '4px 0' } }, num(m.wind.speed, 1) + ' m/s, du ' + m.wind.dir + '°'),
      h('div', { class: 'muted', style: { fontSize: '12px', marginBottom: '8px' } }, 'Au sol le vent est souvent plus faible et plus irrégulier : fiez-vous aux drapeaux du stand.'),
      isFinite(azv) && azv !== null
        ? h('button', { class: 'btn block', onClick: () => { const hr = windHour(m.wind.dir, azv); set((s) => ({ ...s, shot: { ...s.shot, windSpeed: m.wind.speed, windHour: hr } })); closeSheet(); toast('Vent réglé : ' + num(m.wind.speed, 1) + ' m/s de ' + hr + ' h'); } }, 'Utiliser ce vent pour le tir')
        : h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Indiquez la direction du tir ci-dessous pour convertir ce vent en heures.'));
  }

  return frame('Météo',
    status, autoBtn,
    h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Données Open-Meteo (CC BY 4.0). Hors ligne, saisissez les valeurs à la main.'),
    windBox,
    h('h2', null, 'Saisie manuelle'),
    h('div', { class: 'grid2' }, t.el, rh.el), pSel.el, p.el, alt.el, az.el,
    h('button', { class: 'btn primary block', onClick: saveManual }, 'Enregistrer'));
}

/* ---------- Compteur de coups ---------- */
export function shotsSheet() {
  const g = M.activeGun(app.state);
  const add = (n) => { set((s) => M.replaceGun(s, M.addShots(M.activeGun(s), n))); closeSheet(); toast('+' + n + ' coups · total ' + int(g.counter.total + n)); };
  const custom = field('Autre nombre', '', { placeholder: 'ex. 37' });
  return frame('Compter des coups',
    h('div', { class: 'muted' }, g.name + ' · total ' + int(g.counter.total) + ' · depuis le nettoyage ' + int(g.counter.since)),
    h('div', { class: 'grid4' }, [5, 10, 20, 50].map((n) => h('button', { class: 'step mono', onClick: () => add(n) }, '+' + n))),
    custom.el,
    h('button', { class: 'btn primary block', onClick: () => { const n = Math.round(custom.get()); if (!(n > 0 && n < 2000)) { toast('Entre 1 et 1999 coups'); return; } add(n); } }, 'Ajouter'));
}

/* ---------- Confirmation ---------- */
export function confirmSheet({ title, text, ok, danger, onOk }) {
  return frame(title,
    h('p', { style: { margin: '0', lineHeight: '1.5' } }, text),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onClick: closeSheet }, 'Annuler'),
      h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onClick: () => { closeSheet(); onOk(); } }, ok)));
}

/* ---------- Formulaire arme (identité + visée) ---------- */
export function gunSheet(gunId) {
  const isNew = !gunId;
  const g = isNew ? M.newGun() : app.state.guns.find((x) => x.id === gunId);
  const name = field('Nom', g.name, { text: true });
  const cal = field('Calibre', g.cal, { text: true, placeholder: 'ex. .308 Winchester' });
  const barrel = field('Longueur du canon (mm)', g.barrelMm);
  const twist = field('Pas de rayure (mm par tour)', g.twist, { help: '1:10 pouces = 254 mm · 1:11 = 279 mm · 1:12 = 305 mm' });
  const dir = select('Sens des rayures', g.twistDir, [['R', 'À droite (le plus courant)'], ['L', 'À gauche'], ['?', 'Je ne sais pas']]);
  const kind = select('Visée', g.sight.kind, [['scope', 'Lunette à tourelles'], ['iron', 'Visée mécanique']]);
  const unit = select('Unité des tourelles', g.sight.unit || 'MRAD', [['MRAD', 'MRAD (mil)'], ['MOA', 'MOA']]);
  const click = field('Valeur d’un clic', g.sight.click ?? 0.1, { help: 'MRAD : souvent 0,1 · MOA : souvent 0,25 (1/4) ou 0,125 (1/8)' });
  const sightH = field('Hauteur de visée (mm)', Math.round(g.sightH * 1000), { help: 'Du centre du canon au centre de la lunette ou du guidon' });
  const zero = field('Distance de zéro (m)', g.zero);
  const disp = field('Dispersion arme + tireur (MOA)', g.dispersionMoa ?? 1.5, { help: 'Votre groupement habituel à 100 m en MOA (1 MOA ≈ 2,9 cm). Sert à la zone probable d’impact.' });
  const presets = h('div', { class: 'chips' }, SIGHTS.map((p) => h('button', { class: 'chip', type: 'button', onClick: () => {
    kind.sel.value = p.kind; if (p.unit) unit.sel.value = p.unit; if (p.click) click.input.value = String(p.click).replace('.', ','); sightH.input.value = String(Math.round(p.sightH * 1000)); sync();
  } }, p.name)));
  const scopeBox = h('div', { class: 'grid2' }, unit.el, click.el);
  const sync = () => { scopeBox.style.display = kind.get() === 'scope' ? '' : 'none'; };
  kind.sel.addEventListener('change', sync); sync();
  const errors = h('div', { class: 'errors', role: 'alert' });

  const save = () => {
    const ng = { ...g, name: name.get(), cal: cal.get(), barrelMm: barrel.get(), twist: twist.get(), twistDir: dir.get(),
      sight: kind.get() === 'scope' ? { kind: 'scope', unit: unit.get(), click: click.get() } : { kind: 'iron' },
      sightH: sightH.get() / 1000, zero: zero.get(), dispersionMoa: disp.get() };
    const e = M.checkGun(ng);
    if (e.length) { errors.textContent = e.join(' · '); return; }
    if (isNew) app.armeId = ng.id;
    set((s) => (isNew ? { ...s, guns: [...s.guns, ng], gunId: ng.id } : M.replaceGun(s, ng)));
    closeSheet(); toast(isNew ? 'Arme ajoutée' : 'Arme enregistrée');
  };
  return frame(isNew ? 'Nouvelle arme' : 'Modifier l’arme',
    name.el, cal.el, h('div', { class: 'grid2' }, barrel.el, twist.el), dir.el,
    h('h2', null, 'Visée'), presets, kind.el, scopeBox, h('div', { class: 'grid2' }, sightH.el, zero.el), disp.el,
    errors, h('button', { class: 'btn primary block', onClick: save }, 'Enregistrer'));
}

/* ---------- Formulaire munition ---------- */
export function loadSheet(gunId, loadId, preset) {
  const g = app.state.guns.find((x) => x.id === gunId);
  const isNew = !loadId;
  const l = isNew ? M.newLoad(preset || {}) : g.loads.find((x) => x.id === loadId);
  const name = field('Nom', l.name, { text: true });
  const model = select('Modèle de BC', l.model, [['G1', 'G1 (le plus courant sur les boîtes)'], ['G7', 'G7 (balles de match à culot en dépouille)']]);
  const bc = field('BC (lb/in²)', l.bc);
  const v0 = field('V0 (m/s)', l.v0, { help: 'Vitesse à la bouche, à la température de référence' });
  const refT = field('Température de référence (°C)', l.refTemp ?? 15);
  const sens = field('Sensibilité poudre (m/s par °C)', l.sens ?? 0, { help: 'Souvent 0,3 à 1. Mettez 0 si vous ne savez pas.' });
  const meas = select('Origine de la V0', l.measured ? 'oui' : 'non', [['non', 'Annoncée par le fabricant'], ['oui', 'Mesurée au chronographe']]);
  const gr = field('Masse (grains)', l.grains);
  const d = field('Diamètre (mm)', l.dMm);
  const len = field('Longueur de la balle (mm)', l.lenMm, { help: 'Pour la stabilité et la dérive gyroscopique' });
  const errors = h('div', { class: 'errors', role: 'alert' });
  const save = () => {
    const nl = { ...l, name: name.get(), model: model.get(), bc: bc.get(), v0: v0.get(), refTemp: refT.get(), sens: sens.get(), measured: meas.get() === 'oui', grains: gr.get(), dMm: d.get(), lenMm: len.get() };
    const e = M.checkLoad(nl);
    if (e.length) { errors.textContent = e.join(' · '); return; }
    set((s) => {
      const cur = s.guns.find((x) => x.id === gunId);
      const ng = isNew ? { ...cur, loads: [...cur.loads, nl], loadId: nl.id } : M.updateLoad(cur, nl);
      return M.replaceGun(s, ng);
    });
    closeSheet(); toast(isNew ? 'Munition ajoutée et sélectionnée' : 'Munition enregistrée');
  };
  return frame(isNew ? 'Nouvelle munition' : 'Modifier la munition',
    name.el, h('div', { class: 'grid2' }, model.el, bc.el), h('div', { class: 'grid2' }, v0.el, meas.el), h('div', { class: 'grid2' }, refT.el, sens.el),
    h('h2', null, 'Balle'), h('div', { class: 'grid2' }, gr.el, d.el), len.el,
    errors, h('button', { class: 'btn primary block', onClick: save }, 'Enregistrer'));
}

/* ---------- Catalogue ---------- */
export function catalogSheet(gunId) {
  const g = app.state.guns.find((x) => x.id === gunId);
  const pick = (a) => {
    const useG7 = a.g7 > 0;
    const preset = { name: a.brand + ' ' + a.name, model: useG7 ? 'G7' : 'G1', bc: useG7 ? a.g7 : a.g1, v0: a.v0, grains: a.grains, dMm: a.dMm, lenMm: a.lenMm, sens: 0.5 };
    openSheet('load-new', () => loadSheet(gunId, null, preset));
  };
  const sameCal = (a) => g.cal && a.cal.replace(/\s/g, '').toLowerCase().slice(0, 4) === g.cal.replace(/\s/g, '').toLowerCase().slice(0, 4);
  const list = AMMO.slice().sort((a, b) => Number(sameCal(b)) - Number(sameCal(a)));
  return frame('Catalogue de munitions',
    h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Les données sont reprises dans un formulaire que vous pouvez corriger. Mesurez votre V0 au chrono.'),
    list.map((a) => h('button', { class: 'item' + (sameCal(a) ? ' on' : ''), onClick: () => pick(a) },
      h('span', { class: 'grow' }, h('b', null, a.brand + ' · ' + a.name), h('small', null, a.cal + ' · G1 ' + num(a.g1, 3) + (a.g7 ? ' · G7 ' + num(a.g7, 3) : '') + ' · ' + a.v0 + ' m/s')))));
}

export { dateFr };
