// Catalogue de munitions. Chaque fiche est reprise dans un formulaire modifiable.
// Les V0 sont celles annoncées pour un canon d'environ 60 cm : mesurez la vôtre au chrono.
// verify: true = données non vérifiées sur la documentation du fabricant (src dit d'où elles viennent) ;
// bcEst: true = BC estimé (valeur typique pour ce type d'ogive), absent de la source.
// Les calibres de chasse figurent ici pour le tir sportif : Kronos n'est pas une application de chasse.

export const DISCIPLINES = { TAR: 'TAR', TLD: 'TLD', CC: 'Calibres de chasse' };

const T = 'Tableau comparatif TAR & TLD (novembre 2026)';
const C = 'Tableau comparatif des calibres courants (novembre 2026)';

export const AMMO = [
  // Fabricants (BC publiés)
  { id: 'hm178', brand: 'Hornady Match', name: '178 gr ELD Match', cal: '.308 Winchester', grains: 178, dMm: 7.82, lenMm: 34.9, g1: 0.547, g7: 0.275, v0: 792, disc: ['TLD'] },
  { id: 'fgm175', brand: 'Federal Gold Medal Match', name: '175 gr Sierra MatchKing', cal: '.308 Winchester', grains: 175, dMm: 7.82, lenMm: 31.5, g1: 0.505, g7: 0.250, v0: 792, disc: ['TLD', 'TAR'] },
  { id: 'fgm168', brand: 'Federal Gold Medal Match', name: '168 gr Sierra MatchKing', cal: '.308 Winchester', grains: 168, dMm: 7.82, lenMm: 30.9, g1: 0.462, g7: 0.218, v0: 808, disc: ['TAR', 'TLD'] },
  { id: 'lap167', brand: 'Lapua', name: '167 gr Scenar', cal: '.308 Winchester', grains: 167, dMm: 7.83, lenMm: 31.3, g1: 0.446, g7: 0.223, v0: 820, disc: ['TLD'] },
  { id: 'hm140', brand: 'Hornady Match', name: '140 gr ELD Match', cal: '6.5 Creedmoor', grains: 140, dMm: 6.71, lenMm: 35.6, g1: 0.646, g7: 0.326, v0: 826, disc: ['TLD'] },
  { id: 'hm147', brand: 'Hornady Match', name: '147 gr ELD Match', cal: '6.5 Creedmoor', grains: 147, dMm: 6.71, lenMm: 37.7, g1: 0.697, g7: 0.351, v0: 821, disc: ['TLD'] },
  { id: 'fgm77', brand: 'Federal Gold Medal Match', name: '77 gr Sierra MatchKing', cal: '.223 Remington', grains: 77, dMm: 5.69, lenMm: 25.0, g1: 0.372, g7: 0.182, v0: 829, disc: ['TAR', 'TLD'] },
  { id: 'ss198', brand: 'Surplus militaire', name: 's.S. 198 gr', cal: '7,92x57 IS', grains: 198, dMm: 8.22, lenMm: 33.0, g1: 0.495, g7: 0, v0: 760, disc: ['TAR'], verify: true, src: 'valeurs usuelles de collectionneurs' },
  { id: 'js196', brand: 'Générique', name: '196 gr FMJ', cal: '7,92x57 IS', grains: 196, dMm: 8.20, lenMm: 31.0, g1: 0.40, g7: 0, v0: 745, disc: ['TAR'], verify: true, src: 'valeurs usuelles', bcEst: true },
  { id: 'mas139', brand: 'Surplus militaire', name: 'Balle 1929C 139 gr', cal: '7,5x54 MAS', grains: 139, dMm: 7.84, lenMm: 29.0, g1: 0.40, g7: 0, v0: 820, disc: ['TAR'], verify: true, src: 'valeurs usuelles', bcEst: true },

  // TAR : munitions réglementaires et match (BC G1)
  { id: 'tar22', brand: 'Match', name: '40 gr standard', cal: '.22 LR', grains: 40, dMm: 5.69, g1: 0.130, g7: 0, v0: 325, disc: ['TAR'], verify: true, src: T },
  { id: 'tar30c', brand: 'Réglementaire', name: '110 gr FMJ RN', cal: '.30 M1 Carbine', grains: 110, dMm: 7.82, g1: 0.175, g7: 0, v0: 600, disc: ['TAR'], verify: true, src: T },
  { id: 'tar762x39', brand: 'Réglementaire', name: '123 gr FMJ', cal: '7,62x39', grains: 123, dMm: 7.92, g1: 0.265, g7: 0, v0: 715, disc: ['TAR'], verify: true, src: T },
  { id: 'tar223', brand: 'Match', name: '69 gr HPBT', cal: '.223 Remington', grains: 69, dMm: 5.69, g1: 0.305, g7: 0, v0: 880, disc: ['TAR'], verify: true, src: T },
  { id: 'tarmas150', brand: 'Réglementaire', name: '150 gr FMJBT', cal: '7,5x54 MAS', grains: 150, dMm: 7.82, g1: 0.410, g7: 0, v0: 810, disc: ['TAR'], verify: true, src: T },
  { id: 'tar303', brand: 'Réglementaire', name: '174 gr FMJBT', cal: '.303 British', grains: 174, dMm: 7.92, g1: 0.490, g7: 0, v0: 745, disc: ['TAR'], verify: true, src: T },
  { id: 'tar54r', brand: 'Match', name: '174 gr HPBT', cal: '7,62x54R', grains: 174, dMm: 7.92, g1: 0.490, g7: 0, v0: 795, disc: ['TAR'], verify: true, src: T },
  { id: 'targp11', brand: 'Réglementaire', name: 'GP11 174 gr', cal: '7,5x55 Suisse', grains: 174, dMm: 7.77, g1: 0.505, g7: 0, v0: 780, disc: ['TAR'], verify: true, src: T },
  { id: 'tar65se', brand: 'Match', name: '139 gr HPBT', cal: '6,5x55 SE', grains: 139, dMm: 6.71, g1: 0.578, g7: 0, v0: 820, disc: ['TAR'], verify: true, src: T },
  { id: 'tar8x57', brand: 'Réglementaire', name: '196 gr FMJBT', cal: '7,92x57 IS', grains: 196, dMm: 8.22, g1: 0.520, g7: 0, v0: 770, disc: ['TAR'], verify: true, src: T },
  { id: 'tar3006', brand: 'Match', name: '168 gr HPBT', cal: '.30-06 Springfield', grains: 168, dMm: 7.82, g1: 0.462, g7: 0, v0: 845, disc: ['TAR'], verify: true, src: T },

  // TLD : munitions de match (BC G7)
  { id: 'tld6br', brand: 'Match', name: '105 gr HPBT', cal: '6mm BR Norma', grains: 105, dMm: 6.17, g1: 0, g7: 0.275, v0: 860, disc: ['TLD'], verify: true, src: T },
  { id: 'tld6547', brand: 'Lapua', name: '139 gr Scenar', cal: '6,5x47 Lapua', grains: 139, dMm: 6.71, g1: 0, g7: 0.290, v0: 850, disc: ['TLD'], verify: true, src: T },
  { id: 'tld6cm', brand: 'Hornady Match', name: '108 gr ELD Match', cal: '6mm Creedmoor', grains: 108, dMm: 6.17, g1: 0, g7: 0.270, v0: 915, disc: ['TLD'], verify: true, src: T },
  { id: 'tld65prc', brand: 'Hornady Match', name: '147 gr ELD Match', cal: '6,5 PRC', grains: 147, dMm: 6.71, g1: 0, g7: 0.351, v0: 890, disc: ['TLD'], verify: true, src: T },
  { id: 'tld284', brand: 'Match', name: '180 gr Hybrid', cal: '.284 Winchester', grains: 180, dMm: 7.21, g1: 0, g7: 0.345, v0: 860, disc: ['TLD'], verify: true, src: T },
  { id: 'tld300wm', brand: 'Match', name: '215 gr Hybrid', cal: '.300 Win Mag', grains: 215, dMm: 7.82, g1: 0, g7: 0.354, v0: 870, disc: ['TLD'], verify: true, src: T },
  { id: 'tld300nm', brand: 'Match', name: '230 gr Hybrid', cal: '.300 Norma Magnum', grains: 230, dMm: 7.82, g1: 0, g7: 0.382, v0: 900, disc: ['TLD'], verify: true, src: T },
  { id: 'tld338lm', brand: 'Lapua', name: '300 gr Scenar', cal: '.338 Lapua Magnum', grains: 300, dMm: 8.58, g1: 0, g7: 0.400, v0: 840, disc: ['TLD'], verify: true, src: T },
  { id: 'tld375ct', brand: 'Match', name: '377 gr monolithique', cal: '.375 CheyTac', grains: 377, dMm: 9.53, g1: 0, g7: 0.480, v0: 910, disc: ['TLD'], verify: true, src: T },
  { id: 'tld50', brand: 'Hornady', name: '750 gr A-Max', cal: '.50 BMG', grains: 750, dMm: 12.95, g1: 0, g7: 0.510, v0: 860, disc: ['TLD'], verify: true, src: T },

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

export const SIGHTS = [
  { id: 'ffp-mrad', name: 'Lunette MRAD, clic 0,1', kind: 'scope', unit: 'MRAD', click: 0.1, sightH: 0.045 },
  { id: 'moa-14', name: 'Lunette MOA, clic 1/4', kind: 'scope', unit: 'MOA', click: 0.25, sightH: 0.045 },
  { id: 'moa-18', name: 'Lunette MOA, clic 1/8', kind: 'scope', unit: 'MOA', click: 0.125, sightH: 0.050 },
  { id: 'iron-tan', name: 'Hausse tangentielle (type K98k)', kind: 'iron', sightH: 0.028, tangent: { min: 100, max: 2000, step: 100 } },
  { id: 'iron-ring', name: 'Hausse à œilleton ou dioptre', kind: 'iron', sightH: 0.030, tangent: { min: 200, max: 1200, step: 100 } },
  { id: 'iron-fix', name: 'Visée mécanique fixe', kind: 'iron', sightH: 0.025 }
];
