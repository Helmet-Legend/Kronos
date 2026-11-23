// Catalogue de départ. BC publiés par les fabricants (G1 et G7 quand disponible).
// Les V0 sont celles annoncées pour un canon d'environ 61 cm : mesurez la vôtre au chrono.

export const AMMO = [
  { id: 'hm178', brand: 'Hornady Match', name: '178 gr ELD Match', cal: '.308 Winchester', grains: 178, dMm: 7.82, lenMm: 34.9, g1: 0.547, g7: 0.275, v0: 792 },
  { id: 'fgm175', brand: 'Federal Gold Medal Match', name: '175 gr Sierra MatchKing', cal: '.308 Winchester', grains: 175, dMm: 7.82, lenMm: 31.5, g1: 0.505, g7: 0.250, v0: 792 },
  { id: 'fgm168', brand: 'Federal Gold Medal Match', name: '168 gr Sierra MatchKing', cal: '.308 Winchester', grains: 168, dMm: 7.82, lenMm: 30.9, g1: 0.462, g7: 0.218, v0: 808 },
  { id: 'lap167', brand: 'Lapua', name: '167 gr Scenar', cal: '.308 Winchester', grains: 167, dMm: 7.83, lenMm: 31.3, g1: 0.446, g7: 0.223, v0: 820 },
  { id: 'hm140', brand: 'Hornady Match', name: '140 gr ELD Match', cal: '6.5 Creedmoor', grains: 140, dMm: 6.71, lenMm: 35.6, g1: 0.646, g7: 0.326, v0: 826 },
  { id: 'hm147', brand: 'Hornady Match', name: '147 gr ELD Match', cal: '6.5 Creedmoor', grains: 147, dMm: 6.71, lenMm: 37.7, g1: 0.697, g7: 0.351, v0: 821 },
  { id: 'fgm77', brand: 'Federal Gold Medal Match', name: '77 gr Sierra MatchKing', cal: '.223 Remington', grains: 77, dMm: 5.69, lenMm: 25.0, g1: 0.372, g7: 0.182, v0: 829 },
  { id: 'ss198', brand: 'Surplus militaire', name: 's.S. 198 gr', cal: '7,92x57 IS', grains: 198, dMm: 8.22, lenMm: 33.0, g1: 0.495, g7: 0, v0: 760 },
  { id: 'js196', brand: 'Générique', name: '196 gr FMJ', cal: '7,92x57 IS', grains: 196, dMm: 8.20, lenMm: 31.0, g1: 0.40, g7: 0, v0: 745 },
  { id: 'mas139', brand: 'Surplus militaire', name: 'Balle 1929C 139 gr', cal: '7,5x54 MAS', grains: 139, dMm: 7.84, lenMm: 29.0, g1: 0.40, g7: 0, v0: 820 }
];

export const SIGHTS = [
  { id: 'ffp-mrad', name: 'Lunette MRAD, clic 0,1', kind: 'scope', unit: 'MRAD', click: 0.1, sightH: 0.045 },
  { id: 'moa-14', name: 'Lunette MOA, clic 1/4', kind: 'scope', unit: 'MOA', click: 0.25, sightH: 0.045 },
  { id: 'moa-18', name: 'Lunette MOA, clic 1/8', kind: 'scope', unit: 'MOA', click: 0.125, sightH: 0.050 },
  { id: 'iron-tan', name: 'Hausse tangentielle (type K98k)', kind: 'iron', sightH: 0.028, tangent: { min: 100, max: 2000, step: 100 } },
  { id: 'iron-ring', name: 'Hausse à œilleton ou dioptre', kind: 'iron', sightH: 0.030, tangent: { min: 200, max: 1200, step: 100 } },
  { id: 'iron-fix', name: 'Visée mécanique fixe', kind: 'iron', sightH: 0.025 }
];
