// Catalogue de munitions. Chaque fiche est reprise dans un formulaire modifiable.
// Les V0 sont celles annoncées pour un canon d'environ 60 cm : mesurez la vôtre au chrono.
// src : d'où vient le BC (vérifié sur la documentation du fabricant le 23/11/2026 quand verify est absent) ;
// verify: true = BC non confirmé par le fabricant ou sources divergentes ;
// bcEst: true = BC estimé (valeur typique pour ce type d'ogive), absent de la source.
// Les calibres de chasse figurent ici pour le tir sportif : Kronos n'est pas une application de chasse.

export const DISCIPLINES = { TAR: 'TAR', TLD: 'TLD', POING: 'Arme de poing', CC: 'Calibres de chasse' };

const T = 'Tableau comparatif TAR & TLD (novembre 2026)';
const C = 'Tableau comparatif des calibres courants (novembre 2026)';

export const AMMO = [
  // Fabricants (BC publiés)
  { id: 'hm178', brand: 'Hornady Match', name: '178 gr ELD Match', cal: '.308 Winchester', grains: 178, dMm: 7.82, lenMm: 34.9, g1: 0.547, g7: 0.275, v0: 792, disc: ['TLD'], src: 'Hornady (table des BC)' },
  { id: 'fgm175', brand: 'Federal Gold Medal Match', name: '175 gr Sierra MatchKing', cal: '.308 Winchester', grains: 175, dMm: 7.82, lenMm: 31.5, g1: 0.505, g7: 0.250, v0: 792, disc: ['TLD', 'TAR'], src: 'Sierra, Federal' },
  { id: 'fgm168', brand: 'Federal Gold Medal Match', name: '168 gr Sierra MatchKing', cal: '.308 Winchester', grains: 168, dMm: 7.82, lenMm: 30.9, g1: 0.462, g7: 0.218, v0: 808, disc: ['TAR', 'TLD'], src: 'Sierra (G1) ; G7 mesuré par Applied Ballistics' },
  { id: 'lap167', brand: 'Lapua', name: '167 gr Scenar', cal: '.308 Winchester', grains: 167, dMm: 7.83, lenMm: 31.3, g1: 0.446, g7: 0.223, v0: 820, disc: ['TLD'], src: 'Lapua (fiche produit)' },
  { id: 'hm140', brand: 'Hornady Match', name: '140 gr ELD Match', cal: '6.5 Creedmoor', grains: 140, dMm: 6.71, lenMm: 35.6, g1: 0.646, g7: 0.326, v0: 826, disc: ['TLD'], src: 'Hornady (table des BC)' },
  { id: 'hm147', brand: 'Hornady Match', name: '147 gr ELD Match', cal: '6.5 Creedmoor', grains: 147, dMm: 6.71, lenMm: 37.7, g1: 0.697, g7: 0.351, v0: 821, disc: ['TLD'], src: 'Hornady (table des BC)' },
  { id: 'fgm77', brand: 'Federal Gold Medal Match', name: '77 gr Sierra MatchKing', cal: '.223 Remington', grains: 77, dMm: 5.69, lenMm: 25.0, g1: 0.372, g7: 0.182, v0: 829, disc: ['TAR', 'TLD'], src: 'Sierra' },
  { id: 'ss198', brand: 'Surplus militaire', name: 's.S. 198 gr', cal: '7,92x57 IS', grains: 198, dMm: 8.22, lenMm: 33.0, g1: 0.495, g7: 0, v0: 760, disc: ['TAR'], verify: true, src: 'valeurs usuelles de collectionneurs' },
  { id: 'js196', brand: 'Générique', name: '196 gr FMJ', cal: '7,92x57 IS', grains: 196, dMm: 8.20, lenMm: 31.0, g1: 0.40, g7: 0, v0: 745, disc: ['TAR'], verify: true, src: 'valeurs usuelles', bcEst: true },
  { id: 'mas139', brand: 'Surplus militaire', name: 'Balle 1929C 139 gr', cal: '7,5x54 MAS', grains: 139, dMm: 7.84, lenMm: 29.0, g1: 0.40, g7: 0, v0: 820, disc: ['TAR'], verify: true, src: 'valeurs usuelles', bcEst: true },

  // TAR : munitions réglementaires et match (BC G1)
  { id: 'tar22', brand: 'Lapua', name: 'Center-X 40 gr', cal: '.22 LR', grains: 40, dMm: 5.69, g1: 0.172, g7: 0, v0: 327, disc: ['TAR'], src: 'Lapua (fiche produit Center-X)' },
  { id: 'tar30c', brand: 'Hornady', name: '110 gr FMJ', cal: '.30 M1 Carbine', grains: 110, dMm: 7.82, g1: 0.178, g7: 0, v0: 607, disc: ['TAR'], src: 'Hornady et Magtech (Sellier & Bellot annonce 0,154)' },
  { id: 'tar762x39', brand: 'Réglementaire', name: '123 gr FMJ', cal: '7,62x39', grains: 123, dMm: 7.92, g1: 0.265, g7: 0, v0: 715, disc: ['TAR'], verify: true, src: T },
  { id: 'tar223', brand: 'Sierra', name: '69 gr MatchKing', cal: '.223 Remington', grains: 69, dMm: 5.69, g1: 0.305, g7: 0, v0: 880, disc: ['TAR'], src: 'Sierra (G1 0,301 à 0,317 selon la vitesse)' },
  { id: 'tarmas150', brand: 'Réglementaire', name: '150 gr FMJBT', cal: '7,5x54 MAS', grains: 150, dMm: 7.82, g1: 0.410, g7: 0, v0: 810, disc: ['TAR'], verify: true, src: T },
  { id: 'tar303', brand: 'Réglementaire', name: '174 gr FMJBT', cal: '.303 British', grains: 174, dMm: 7.92, g1: 0.490, g7: 0, v0: 745, disc: ['TAR'], verify: true, src: T },
  { id: 'tar54r', brand: 'Sierra', name: '174 gr MatchKing', cal: '7,62x54R', grains: 174, dMm: 7.92, g1: 0.499, g7: 0.249, v0: 795, disc: ['TAR'], src: 'Sierra (balle .311 174 gr SMK)' },
  { id: 'targp11', brand: 'Réglementaire', name: 'GP11 174 gr', cal: '7,5x55 Suisse', grains: 174, dMm: 7.77, g1: 0.505, g7: 0, v0: 780, disc: ['TAR'], verify: true, src: 'sources divergentes : G1 0,505 à 0,514, ou 0,545 (G7 0,274) selon k31.ch' },
  { id: 'tar65se', brand: 'Lapua', name: '139 gr Scenar', cal: '6,5x55 SE', grains: 139, dMm: 6.71, g1: 0.578, g7: 0.290, v0: 820, disc: ['TAR'], src: 'Lapua (balle 139 gr Scenar)' },
  { id: 'tar8x57', brand: 'Sellier & Bellot', name: '196 gr FMJ', cal: '7,92x57 IS', grains: 196, dMm: 8.22, g1: 0.509, g7: 0.256, v0: 770, disc: ['TAR'], src: 'Sellier & Bellot (SB857JSA)' },
  { id: 'tar3006', brand: 'Sierra', name: '168 gr MatchKing', cal: '.30-06 Springfield', grains: 168, dMm: 7.82, g1: 0.462, g7: 0, v0: 845, disc: ['TAR'], src: 'Sierra (balle 168 gr SMK)' },

  // TLD : munitions de match (BC G7)
  { id: 'tld6br', brand: 'Lapua', name: '105 gr Scenar', cal: '6mm BR Norma', grains: 105, dMm: 6.17, g1: 0.472, g7: 0.236, v0: 850, disc: ['TLD'], src: 'Lapua (cartouche 4316046)' },
  { id: 'tld6547', brand: 'Lapua', name: '139 gr Scenar', cal: '6,5x47 Lapua', grains: 139, dMm: 6.71, g1: 0.578, g7: 0.290, v0: 820, disc: ['TLD'], src: 'Lapua (catalogue)' },
  { id: 'tld6cm', brand: 'Hornady Match', name: '108 gr ELD Match', cal: '6mm Creedmoor', grains: 108, dMm: 6.17, g1: 0.536, g7: 0.270, v0: 915, disc: ['TLD'], src: 'Hornady (table des BC)' },
  { id: 'tld65prc', brand: 'Hornady Match', name: '147 gr ELD Match', cal: '6,5 PRC', grains: 147, dMm: 6.71, g1: 0.697, g7: 0.351, v0: 890, disc: ['TLD'], src: 'Hornady (table des BC)' },
  { id: 'tld284', brand: 'Berger', name: '180 gr Hybrid Target', cal: '.284 Winchester', grains: 180, dMm: 7.21, g1: 0.680, g7: 0.349, v0: 860, disc: ['TLD'], src: 'Berger (catalogue 2021)' },
  { id: 'tld300wm', brand: 'Berger', name: '215 gr Hybrid Target', cal: '.300 Win Mag', grains: 215, dMm: 7.82, g1: 0.691, g7: 0.354, v0: 870, disc: ['TLD'], src: 'Berger (catalogue 2024)' },
  { id: 'tld300nm', brand: 'Berger', name: '230 gr Hybrid Target', cal: '.300 Norma Magnum', grains: 230, dMm: 7.82, g1: 0, g7: 0.368, v0: 900, disc: ['TLD'], src: 'Berger (catalogue 2024)' },
  { id: 'tld338lm', brand: 'Lapua', name: '300 gr Scenar', cal: '.338 Lapua Magnum', grains: 300, dMm: 8.58, g1: 0.736, g7: 0.368, v0: 820, disc: ['TLD'], src: 'Lapua (cartouche 4318013)' },
  { id: 'tld375ct', brand: 'Cutting Edge', name: '377 gr MTAC', cal: '.375 CheyTac', grains: 377, dMm: 9.53, g1: 0.874, g7: 0.447, v0: 910, disc: ['TLD'], verify: true, src: 'fiche technique 2025 (mesure Applied Ballistics), une seule source' },
  { id: 'tld50', brand: 'Hornady', name: '750 gr A-Max', cal: '.50 BMG', grains: 750, dMm: 12.95, g1: 1.050, g7: 0.510, v0: 860, disc: ['TLD'], verify: true, src: 'G1 1,050 publié par Hornady ; G7 non publié (0,510 à 0,524 selon les revendeurs)' },

  // Arme de poing (TAR 830 à 832)
  { id: 'p9sb', brand: 'Sellier & Bellot', name: '124 gr FMJ', cal: '9 mm Parabellum', grains: 124, dMm: 9.02, g1: 0.152, g7: 0, v0: 360, disc: ['POING'], src: 'Sellier & Bellot (G1) ; V0 annoncée pour un canon de 12 à 13 cm' },
  { id: 'p45sb', brand: 'Sellier & Bellot', name: '230 gr FMJ', cal: '45 ACP', grains: 230, dMm: 11.48, g1: 0.213, g7: 0, v0: 260, disc: ['POING'], src: 'Sellier & Bellot (fiche FMJ 230 gr)' },
  { id: 'p9115', brand: 'Sellier & Bellot', name: '115 gr FMJ', cal: '9 mm Parabellum', grains: 115, dMm: 9.02, g1: 0.13, g7: 0, v0: 380, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles (V0 pour un canon de 12 cm environ), à vérifier' },
  { id: 'p38wc', brand: 'Générique', name: '148 gr wadcutter', cal: '38 Spécial', grains: 148, dMm: 9.07, g1: 0.055, g7: 0, v0: 215, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles (canon de 15 cm), à vérifier ; balle de cible plate' },
  { id: 'p38lrn', brand: 'Générique', name: '158 gr LRN', cal: '38 Spécial', grains: 158, dMm: 9.07, g1: 0.146, g7: 0, v0: 240, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles (canon de 15 cm), à vérifier' },
  { id: 'p45230', brand: 'Générique', name: '200 gr SWC (cible)', cal: '45 ACP', grains: 200, dMm: 11.48, g1: 0.15, g7: 0, v0: 240, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles de rechargement de cible, à vérifier' },
  { id: 'p762tok', brand: 'Sellier & Bellot', name: '85 gr FMJ', cal: '7,62 Tokarev', grains: 85, dMm: 7.85, g1: 0.12, g7: 0, v0: 450, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles, à vérifier' },
  { id: 'p9mak', brand: 'Sellier & Bellot', name: '95 gr FMJ', cal: '9 mm Makarov', grains: 95, dMm: 9.27, g1: 0.09, g7: 0, v0: 300, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles, à vérifier' },
  { id: 'p762nag', brand: 'Générique', name: '98 gr FMJ', cal: '7,62 Nagant', grains: 98, dMm: 7.82, g1: 0.1, g7: 0, v0: 250, disc: ['POING'], verify: true, bcEst: true, src: 'valeurs usuelles, à vérifier' },

  // Calibres de chasse, pour le tir (BC G1 estimés : absents de la source)
  { id: 'cc222', brand: 'Standard', name: '55 gr', cal: '.222 Remington', grains: 55, dMm: 5.69, g1: 0.23, g7: 0, v0: 960, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc243', brand: 'Standard', name: '100 gr', cal: '.243 Winchester', grains: 100, dMm: 6.17, g1: 0.38, g7: 0, v0: 900, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc270', brand: 'Standard', name: '130 gr', cal: '.270 Winchester', grains: 130, dMm: 7.04, g1: 0.40, g7: 0, v0: 930, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc7x64', brand: 'Standard', name: '154 gr', cal: '7x64', grains: 154, dMm: 7.24, g1: 0.37, g7: 0, v0: 860, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc7rm', brand: 'Standard', name: '150 gr', cal: '7mm Remington Magnum', grains: 150, dMm: 7.24, g1: 0.42, g7: 0, v0: 945, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc308', brand: 'Standard', name: '165 gr', cal: '.308 Winchester', grains: 165, dMm: 7.82, g1: 0.40, g7: 0, v0: 815, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc3006', brand: 'Standard', name: '180 gr', cal: '.30-06 Springfield', grains: 180, dMm: 7.82, g1: 0.43, g7: 0, v0: 820, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc300wm', brand: 'Standard', name: '180 gr', cal: '.300 Win Mag', grains: 180, dMm: 7.82, g1: 0.45, g7: 0, v0: 905, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc8x57', brand: 'Standard', name: '196 gr', cal: '7,92x57 IS', grains: 196, dMm: 8.22, g1: 0.33, g7: 0, v0: 780, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc8x57r', brand: 'Standard', name: '196 gr (JRS, à bourrelet)', cal: '8x57 JRS', grains: 196, dMm: 8.22, g1: 0.33, g7: 0, v0: 740, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc93x62', brand: 'Standard', name: '285 gr', cal: '9,3x62', grains: 285, dMm: 9.30, g1: 0.35, g7: 0, v0: 725, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc93x74', brand: 'Standard', name: '285 gr', cal: '9,3x74 R', grains: 285, dMm: 9.30, g1: 0.35, g7: 0, v0: 695, disc: ['CC'], verify: true, src: C, bcEst: true },
  { id: 'cc338wm', brand: 'Standard', name: '225 gr', cal: '.338 Win Mag', grains: 225, dMm: 8.58, g1: 0.40, g7: 0, v0: 850, disc: ['CC'], verify: true, src: C, bcEst: true }
];

/**
 * Armes de poing préremplies (fiches du fabricant ; le pas de rayure et la hauteur de visée sont à vérifier).
 * twist en mm par tour, triggerKg = poids de détente d'origine.
 */
// Modèles d'armes de poing. Seuls les Glock sont repris de la fiche du fabricant ; le reste vient des valeurs usuelles
// du modèle (verify: true) : canon, pas et sens à vérifier sur l'arme, poids de détente à mesurer (null).
// cat : 'recente' (830, 831) ou 'authentique' (annexe A-832 : 832, 831). ammo38 : revolver 357 tiré en 38 Spécial.
const PV = 'valeurs usuelles du modèle, à vérifier sur votre arme';
export const HANDGUNS = [
  { id: 'glock17', name: 'Glock 17', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 114, twist: 250, twistDir: 'R', triggerKg: 2.65, sightH: 0.016, cat: 'recente', src: 'Glock : canon 114 mm, détente 26 à 28 N selon la génération ; pas et hauteur de visée à vérifier' },
  { id: 'glock19', name: 'Glock 19', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 102, twist: 250, twistDir: 'R', triggerKg: 2.65, sightH: 0.016, cat: 'recente', src: 'Glock : canon 102 mm, détente 26 à 28 N ; pas et hauteur de visée à vérifier' },
  { id: 'glock34', name: 'Glock 34', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 135, twist: 250, twistDir: 'R', triggerKg: 2.65, sightH: 0.016, cat: 'recente', src: 'Glock : canon 135 mm, trop long pour le TAR (13 cm au plus)' },
  { id: 'glock21', name: 'Glock 21', cal: '45 ACP', type: 'pistolet', barrelMm: 117, twist: 400, twistDir: 'R', triggerKg: 2.5, sightH: 0.016, cat: 'recente', src: 'Glock : canon 117 mm ; pas, détente et hauteur de visée à vérifier' },
  { id: 'glock30s', name: 'Glock 30S', cal: '45 ACP', type: 'pistolet', barrelMm: 96, twist: 400, twistDir: 'R', triggerKg: 2.85, sightH: 0.016, cat: 'recente', src: 'Glock : canon 96 mm, détente 28 N ; pas et hauteur de visée à vérifier' },
  { id: 'cz75b', name: 'CZ 75 B', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 120, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.017, cat: 'recente', verify: true, src: PV },
  { id: 'czshadow2', name: 'CZ Shadow 2', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 125, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.018, cat: 'recente', verify: true, src: PV + ' ; visée fibre d’origine interdite en TAR' },
  { id: 'beretta92', name: 'Beretta 92 FS', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 125, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.017, cat: 'recente', verify: true, src: PV },
  { id: 'p226', name: 'SIG Sauer P226', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 112, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.018, cat: 'recente', verify: true, src: PV },
  { id: 'p320', name: 'SIG Sauer P320 Full Size', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 120, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.018, cat: 'recente', verify: true, src: PV },
  { id: 'usp9', name: 'HK USP 9', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 108, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.017, cat: 'recente', verify: true, src: PV },
  { id: 'pdp45', name: 'Walther PDP 4,5 pouces', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 114, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.017, cat: 'recente', verify: true, src: PV },
  { id: 'mp9', name: 'Smith & Wesson M&P9 2.0', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 108, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.017, cat: 'recente', verify: true, src: PV },
  { id: 'colt1911', name: 'Colt Government 1911', cal: '45 ACP', type: 'pistolet', barrelMm: 127, twist: 406, twistDir: 'L', triggerKg: null, sightH: 0.016, cat: 'recente', verify: true, src: PV },
  { id: 'sw686', name: 'Smith & Wesson 686 6 pouces', cal: '357 Magnum', type: 'revolver', barrelMm: 152, twist: 476, twistDir: 'R', triggerKg: null, sightH: 0.020, cat: 'recente', ammo38: true, verify: true, src: PV + ' ; en TAR, tiré avec des munitions de 38 Spécial' },
  { id: 'mr73', name: 'Manurhin MR 73 Sport 6 pouces', cal: '357 Magnum', type: 'revolver', barrelMm: 152, twist: 476, twistDir: 'R', triggerKg: null, sightH: 0.020, cat: 'recente', ammo38: true, verify: true, src: PV + ' ; en TAR, tiré avec des munitions de 38 Spécial' },
  { id: 'm1911a1', name: 'Colt M1911A1 (réglementaire)', cal: '45 ACP', type: 'pistolet', barrelMm: 127, twist: 406, twistDir: 'L', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'mas50', name: 'MAS 1950', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 112, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'pa15', name: 'MAB PA 15', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 114, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'hp35', name: 'Browning HP 35', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 118, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'p38', name: 'Walther P38', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 125, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'p08', name: 'Luger P08', cal: '9 mm Parabellum', type: 'pistolet', barrelMm: 100, twist: 250, twistDir: 'R', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'tt33', name: 'Tokarev TT-33', cal: '7,62 Tokarev', type: 'pistolet', barrelMm: 116, twist: 240, twistDir: 'R', triggerKg: null, sightH: 0.015, cat: 'authentique', verify: true, src: PV },
  { id: 'pm', name: 'Makarov PM', cal: '9 mm Makarov', type: 'pistolet', barrelMm: 93, twist: 240, twistDir: 'R', triggerKg: null, sightH: 0.014, cat: 'authentique', verify: true, src: PV },
  { id: 'nagant95', name: 'Nagant 1895', cal: '7,62 Nagant', type: 'revolver', barrelMm: 114, twist: 240, twistDir: 'R', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV },
  { id: 'lebel92', name: 'Revolver 1892 (Lebel)', cal: '8 mm 1892', type: 'revolver', barrelMm: 117, twist: 240, twistDir: '?', triggerKg: null, sightH: 0.016, cat: 'authentique', verify: true, src: PV + ' ; pas et sens non trouvés' },
  { id: 'sw1917', name: 'Smith & Wesson M1917', cal: '45 ACP', type: 'revolver', barrelMm: 140, twist: 406, twistDir: 'R', triggerKg: null, sightH: 0.017, cat: 'authentique', verify: true, src: PV },
  { id: 'webley6', name: 'Webley Mk VI', cal: '455 Webley', type: 'revolver', barrelMm: 152, twist: 508, twistDir: '?', triggerKg: null, sightH: 0.017, cat: 'authentique', verify: true, src: PV + ' ; pas et sens non trouvés' }
];

// Modèles d'armes d'épaule (TAR et armes historiques) : calibre, canon, pas et sens usuels, à vérifier sur l'arme.
// tangent : graduations de la hausse en mètres quand elles sont connues ; les hausses en yards (armes anglo-saxonnes) ne sont pas préremplies.
const RV = 'valeurs usuelles du modèle, à vérifier sur votre arme';
export const RIFLES = [
  { id: 'k98k', name: 'Mauser K98k', cal: '7,92x57 IS', barrelMm: 600, twist: 240, twistDir: 'R', sightH: 0.028, tangent: { min: 100, max: 2000, step: 100 }, verify: true, src: RV },
  { id: 'mas36', name: 'MAS 36', cal: '7,5x54 MAS', barrelMm: 575, twist: 270, twistDir: 'L', sightH: 0.030, tangent: { min: 200, max: 1200, step: 100 }, verify: true, src: RV },
  { id: 'mas4956', name: 'MAS 49/56', cal: '7,5x54 MAS', barrelMm: 521, twist: 270, twistDir: 'L', sightH: 0.030, tangent: { min: 200, max: 1200, step: 100 }, verify: true, src: RV },
  { id: 'garand', name: 'M1 Garand', cal: '.30-06 Springfield', barrelMm: 610, twist: 254, twistDir: 'R', sightH: 0.030, verify: true, src: RV + ' ; hausse en yards' },
  { id: 'm1903', name: 'Springfield M1903', cal: '.30-06 Springfield', barrelMm: 610, twist: 254, twistDir: 'R', sightH: 0.030, verify: true, src: RV + ' ; hausse en yards' },
  { id: 'm1carbine', name: 'Carabine US M1', cal: '.30 M1 Carbine', barrelMm: 458, twist: 508, twistDir: 'R', sightH: 0.030, verify: true, src: RV + ' ; hausse en yards' },
  { id: 'no4', name: 'Lee-Enfield No4 Mk1', cal: '.303 British', barrelMm: 640, twist: 254, twistDir: 'L', sightH: 0.030, verify: true, src: RV + ' ; hausse en yards' },
  { id: 'smle', name: 'Lee-Enfield SMLE No1 Mk3', cal: '.303 British', barrelMm: 640, twist: 254, twistDir: 'L', sightH: 0.028, verify: true, src: RV + ' ; hausse en yards' },
  { id: 'mosin', name: 'Mosin-Nagant 91/30', cal: '7,62x54R', barrelMm: 730, twist: 240, twistDir: 'R', sightH: 0.028, tangent: { min: 100, max: 2000, step: 100 }, verify: true, src: RV },
  { id: 'k31', name: 'Schmidt-Rubin K31', cal: '7,5x55 Suisse', barrelMm: 652, twist: 270, twistDir: 'R', sightH: 0.028, tangent: { min: 100, max: 1500, step: 100 }, verify: true, src: RV },
  { id: 'm96', name: 'Mauser suédois M96', cal: '6,5x55 SE', barrelMm: 739, twist: 200, twistDir: 'R', sightH: 0.028, verify: true, src: RV },
  { id: 'sks', name: 'SKS', cal: '7,62x39', barrelMm: 520, twist: 240, twistDir: 'R', sightH: 0.028, tangent: { min: 100, max: 1000, step: 100 }, verify: true, src: RV },
  { id: 'ar15', name: 'AR-15 canon 20 pouces', cal: '.223 Remington', barrelMm: 508, twist: 178, twistDir: 'R', sightH: 0.065, verify: true, src: RV + ' ; pas de 178 ou 229 mm selon le canon' }
];

export const SIGHTS = [
  { id: 'ffp-mrad', name: 'Lunette MRAD, clic 0,1', kind: 'scope', unit: 'MRAD', click: 0.1, sightH: 0.045 },
  { id: 'moa-14', name: 'Lunette MOA, clic 1/4', kind: 'scope', unit: 'MOA', click: 0.25, sightH: 0.045 },
  { id: 'moa-18', name: 'Lunette MOA, clic 1/8', kind: 'scope', unit: 'MOA', click: 0.125, sightH: 0.050 },
  { id: 'iron-tan', name: 'Hausse tangentielle (type K98k)', kind: 'iron', sightH: 0.028, tangent: { min: 100, max: 2000, step: 100 } },
  { id: 'iron-ring', name: 'Hausse à œilleton ou dioptre', kind: 'iron', sightH: 0.030, tangent: { min: 200, max: 1200, step: 100 } },
  { id: 'iron-fix', name: 'Visée mécanique fixe', kind: 'iron', sightH: 0.025 }
];
