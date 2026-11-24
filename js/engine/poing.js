// Armes de poing en TAR : contrôle du matériel selon le règlement FFTir 2025-2026 (annexe A-830, fiches 830 à 832).

/** Calibres autorisés (annexe A-830), avec les noms usuels équivalents. */
export const CALIBRES_POING = [
  ['7,65 Browning', '32 ACP', '7,65 mm Browning'], ['7,65 Long', '7,65 MAS', '7,65 French Long'], ['7,62 Nagant'], ['7,65 Parabellum', '7,65 Luger'],
  ['7,62 Tokarev', '7,62x25'], ['7,63 Mauser'], ['7,65 Mannlicher'],
  ['8 mm 1892', '8 mm Lebel revolver'], ['8 mm Roth Steyr', '8,2 mm Roth M7'], ['8 mm Gasser'], ['8 mm Nambu'],
  ['38 Long Colt', '38 Colt Navy', '38 Long CF'], ['38 Spécial', '38 Special', '38 Spl'], ['38 Smith et Wesson', '38 S&W'], ['380 British'],
  ['9 mm Parabellum', '9 mm Para', '9 mm Luger', '9x19'], ['9 mm Browning court', '9x17', '380 ACP', '380 Auto'], ['9 mm Browning long'], ['9 mm Largo', '9x23 Largo'],
  ['9 mm Makarov', '9x18'], ['9 mm Mauser'], ['9 mm Glisenti'], ['9 mm Steyr'],
  ['45 ACP', '45 Auto', '.45 ACP'], ['45 Rim'], ['45 Colt', '45 Long Colt'], ['455 Webley'], ['455 SL', '455 Webley auto', '455 Webley & Scott']
];
const norm = (s) => String(s || '').toLowerCase().replace(/[\s.,]/g, '').replace('é', 'e').replace('mm', '');

/** Nom officiel du calibre s'il est autorisé, sinon null. */
export function calibrePoing(cal) {
  const n = norm(cal);
  if (!n) return null;
  for (const names of CALIBRES_POING) if (names.some((x) => norm(x) === n || n.startsWith(norm(x)))) return names[0];
  if (n.includes('357')) return null; // 357 Magnum : seulement avec la munition de 38 Spécial (à préciser dans le calibre)
  return null;
}

/** Accessoires interdits par l'annexe A-830 (clé → libellé). */
export const INTERDITS_POING = {
  fibre: 'Visée en fibre optique ou laser',
  magwell: 'Puits de chargeur proéminent',
  comp: 'Compensateur ou contrepoids',
  rail: 'Rail Picatinny au-dessus du canon',
  grip: 'Poignée souple, appui-paume ou grip ajouté',
  allege: 'Arme allégée'
};

export const CANON_MAX_MM = { pistolet: 130, revolver: 155 };
export const DETENTE_MIN_KG = 1.36;

/**
 * Contrôle d'une arme de poing.
 * @param {object} g arme : { cal, barrelMm, hand: { type, triggerKg, cat, interdits: {…}, ammo38 } }
 * @returns {{checks: Array<{k:string, rule:string, v:string, ok:boolean|null}>, events: string[], ok: boolean}}
 */
export function checkPoing(g) {
  const hd = g.hand || {}, type = hd.type === 'revolver' ? 'revolver' : 'pistolet';
  const cal = calibrePoing(g.cal) || (norm(g.cal).includes('357') && hd.ammo38 ? '38 Spécial (arme en 357 Magnum)' : null);
  const max = CANON_MAX_MM[type];
  const bad = Object.keys(INTERDITS_POING).filter((k) => hd.interdits && hd.interdits[k]);
  const checks = [
    { k: 'Calibre', rule: 'liste de l’annexe A-830 (7,62 à 11,60 mm)', v: g.cal || '?', ok: g.cal ? !!cal : null },
    { k: 'Longueur du canon', rule: type + ' : ' + max / 10 + ' cm au plus, filetage compris' + (hd.cat === 'authentique' ? ' (sauf armes de l’annexe A-832)' : ''), v: g.barrelMm ? (g.barrelMm / 10).toFixed(1).replace('.', ',') + ' cm' : '?', ok: g.barrelMm ? (g.barrelMm <= max || hd.cat === 'authentique') : null },
    { k: 'Poids de détente', rule: '1,360 kg au moins', v: hd.triggerKg ? hd.triggerKg.toFixed(2).replace('.', ',') + ' kg' : '?', ok: hd.triggerKg ? hd.triggerKg >= DETENTE_MIN_KG : null },
    { k: 'Visée', rule: 'organes fixes et ouverts', v: g.sight && g.sight.kind === 'iron' && !(hd.interdits && hd.interdits.fibre) ? 'fixe' : 'non conforme', ok: !!(g.sight && g.sight.kind === 'iron' && !(hd.interdits && hd.interdits.fibre)) },
    { k: 'Accessoires', rule: 'rien de l’annexe A-830 (fibre, puits, compensateur, rail, grip…)', v: bad.length ? bad.length + ' interdit' + (bad.length > 1 ? 's' : '') : 'aucun', ok: !bad.length }
  ];
  const ok = checks.every((c) => c.ok !== false);
  const events = ok ? (hd.cat === 'authentique' ? ['832', '831'] : ['830', '831']) : [];
  return { checks, events, ok, interdits: bad.map((k) => INTERDITS_POING[k]) };
}
