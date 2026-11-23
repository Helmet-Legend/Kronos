// Solveur point-masse : intégration Runge-Kutta d'ordre 4 dans le repère de la ligne de visée.
// x : le long de la ligne de visée (vers la cible), y : perpendiculaire vers le haut, z : vers la droite.
// Validé contre des tables Federal et Hornady (voir tests/validation.test.js).

import { dragCoefficient } from './drag.js';
import { air, ICAO } from './atmo.js';
import { BC_SI, energyJ, toUnit, clicks } from './units.js';

const G = 9.80665;
const LAPSE = 0.0065;      // gradient de température standard (K/m)
const BARO_EXP = 5.25588; // exposant de la loi barométrique standard

/**
 * Trajectoire brute.
 * @param {object} o
 * @param {number} o.v0 vitesse initiale (m/s)
 * @param {number} o.bc coefficient balistique (lb/in²)
 * @param {'G1'|'G7'} o.model modèle de traînée
 * @param {number} o.rho masse volumique de l'air (kg/m³)
 * @param {number} o.c vitesse du son (m/s)
 * @param {number} o.h hauteur de visée au-dessus de l'axe du canon (m)
 * @param {number} o.alpha angle du canon par rapport à la ligne de visée (rad)
 * @param {number} [o.theta] angle de site (rad, positif vers le haut)
 * @param {number} [o.wx] vent le long de la ligne de visée (m/s, positif vers la cible)
 * @param {number} [o.wz] vent latéral (m/s, positif vers la droite)
 * @param {number} [o.tK] température au poste de tir (K). Si fournie, la densité et la vitesse du son
 *   suivent l'altitude de la balle (gradient standard −6,5 K/km, loi barométrique) : effet sensible sur les tirs en site.
 * @param {number[]} o.marks distances (m) où relever la trajectoire, croissantes
 * @param {number} [o.dt] pas de temps (s)
 * @returns {Array<{x:number,y:number,z:number,v:number,t:number}|undefined>}
 */
export function trajectory(o) {
  const dt = o.dt || 0.001;
  const k = Math.PI * o.rho / (8 * o.bc * BC_SI);
  const c = o.c, wx = o.wx || 0, wz = o.wz || 0, model = o.model || 'G1';
  const th = o.theta || 0, gx = -G * Math.sin(th), gy = -G * Math.cos(th);
  const sinT = Math.sin(th), cosT = Math.cos(th), tK = o.tK;
  // Rapport de densité et vitesse du son à l'altitude h (m) au-dessus du poste de tir.
  let kh = k, ch = c;
  const atAlt = (x, y) => {
    if (!tK) return;
    const T = tK - LAPSE * (x * sinT + y * cosT);
    const r = T / tK;
    kh = k * Math.pow(r, BARO_EXP - 1); // ρ/ρ0 = (P/P0)·(T0/T) = r^(n−1)
    ch = c * Math.sqrt(r);
  };
  const acc = (vx, vy, vz, out) => {
    const rx = vx - wx, rz = vz - wz;
    const vr = Math.sqrt(rx * rx + vy * vy + rz * rz);
    const fd = -kh * dragCoefficient(model, vr / ch) * vr;
    out[0] = fd * rx + gx; out[1] = fd * vy + gy; out[2] = fd * rz;
  };
  const a1 = [0, 0, 0], a2 = [0, 0, 0], a3 = [0, 0, 0], a4 = [0, 0, 0];
  let x = 0, y = -o.h, z = 0, t = 0;
  let vx = o.v0 * Math.cos(o.alpha), vy = o.v0 * Math.sin(o.alpha), vz = 0;
  const marks = o.marks, out = new Array(marks.length);
  let mi = 0;
  while (mi < marks.length && t < 20 && vx > 0) {
    atAlt(x, y);
    acc(vx, vy, vz, a1);
    const b2x = vx + dt / 2 * a1[0], b2y = vy + dt / 2 * a1[1], b2z = vz + dt / 2 * a1[2];
    acc(b2x, b2y, b2z, a2);
    const b3x = vx + dt / 2 * a2[0], b3y = vy + dt / 2 * a2[1], b3z = vz + dt / 2 * a2[2];
    acc(b3x, b3y, b3z, a3);
    const b4x = vx + dt * a3[0], b4y = vy + dt * a3[1], b4z = vz + dt * a3[2];
    acc(b4x, b4y, b4z, a4);
    const nx = x + dt / 6 * (vx + 2 * b2x + 2 * b3x + b4x);
    const ny = y + dt / 6 * (vy + 2 * b2y + 2 * b3y + b4y);
    const nz = z + dt / 6 * (vz + 2 * b2z + 2 * b3z + b4z);
    const nvx = vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
    const nvy = vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
    const nvz = vz + dt / 6 * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2]);
    while (mi < marks.length && nx >= marks[mi]) {
      const q = (marks[mi] - x) / (nx - x);
      const s0 = Math.hypot(vx, vy, vz), s1 = Math.hypot(nvx, nvy, nvz);
      out[mi] = { x: marks[mi], y: y + q * (ny - y), z: z + q * (nz - z), v: s0 + q * (s1 - s0), t: t + q * dt };
      mi++;
    }
    x = nx; y = ny; z = nz; vx = nvx; vy = nvy; vz = nvz; t += dt;
  }
  return out;
}

/**
 * Angle du canon (rad) qui fait croiser la ligne de visée à la distance de zéro, sans vent ni site.
 * Méthode de la sécante (la hauteur au zéro varie presque linéairement avec l'angle), dichotomie en secours.
 */
export function zeroAngle(o, zeroDist) {
  const yAt = (a) => {
    const r = trajectory({ ...o, alpha: a, marks: [zeroDist], dt: 0.0005, wx: 0, wz: 0, theta: 0 })[0];
    return r ? r.y : -1e9;
  };
  let a0 = 0, y0 = yAt(a0), a1 = 0.003, y1 = yAt(a1);
  for (let i = 0; i < 12 && y1 > -1e8 && y0 > -1e8; i++) {
    if (Math.abs(y1) < 1e-7) return a1;
    if (y1 === y0) break;
    const a2 = a1 - y1 * (a1 - a0) / (y1 - y0);
    if (!(a2 > -0.02 && a2 < 0.15)) break;
    a0 = a1; y0 = y1; a1 = a2; y1 = yAt(a1);
  }
  if (Math.abs(y1) < 1e-5) return a1;
  let lo = -0.02, hi = 0.15;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (yAt(mid) > 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Facteur de stabilité gyroscopique de Miller, corrigé de la vitesse et de l'atmosphère.
 * @param {object} p masse (gr), diamètre (mm), longueur (mm), pas (mm/tour), v (m/s), t (°C), pression (hPa)
 */
export function millerSg({ grains, dMm, lenMm, twistMm, v, t, p }) {
  if (!grains || !dMm || !lenMm || !twistMm) return null;
  const dIn = dMm / 25.4, tCal = (twistMm / 25.4) / dIn, lCal = lenMm / dMm;
  const base = 30 * grains / (tCal * tCal * Math.pow(dIn, 3) * lCal * (1 + lCal * lCal));
  return base * Math.pow(v * 3.28084 / 2800, 1 / 3) * ((t * 9 / 5 + 32) + 460) / 519 * 29.92 / (p * 0.02953);
}

/** Dérive gyroscopique (m) selon Litz : 1,25 · (Sg + 1,2) · t^1,83 pouces. */
export function spinDrift(sg, tof) {
  if (!sg || !tof) return 0;
  return 1.25 * (sg + 1.2) * Math.pow(tof, 1.83) * 0.0254;
}

/**
 * Composantes du vent pour une direction donnée en heures d'horloge (d'où vient le vent).
 * 12 h : vent de face, 3 h : vent venant de la droite (pousse la balle vers la gauche).
 */
export function windComponents(speed, hour) {
  const a = (hour % 12) * Math.PI / 6;
  return { wx: -speed * Math.cos(a), wz: -speed * Math.sin(a) };
}

/** Vitesse initiale corrigée de la température de la poudre. */
export function muzzleVelocity(load, tempC) {
  const ref = load.refTemp ?? 15;
  return load.v0 + (load.sens || 0) * (tempC - ref);
}

/**
 * Solution complète pour un profil et des conditions de tir.
 * @param {object} args
 * @param {object} args.gun { sightH (m), zero (m), twist (mm), twistDir 'R'|'L'|'?' }
 * @param {object} args.sight { kind 'scope'|'iron', unit 'MRAD'|'MOA', click }
 * @param {object} args.load { bc, model, v0, refTemp, sens, grains, dMm, lenMm }
 * @param {object} args.met { t, p, rh } conditions du jour
 * @param {object} [args.zeroMet] conditions du réglage du zéro (défaut : ICAO)
 * @param {object} args.shot { windSpeed (m/s), windHour, angleDeg }
 * @param {number[]} args.distances distances demandées (m)
 * @param {number} [args.alpha] angle du canon imposé (rad), par exemple celui d'un cran de hausse : pas de calcul de zéro
 */
export function solve({ gun, sight, load, met, zeroMet, shot, distances, alpha: alphaIn }) {
  const zm = zeroMet || ICAO;
  let alpha = alphaIn;
  if (alpha === undefined || alpha === null) {
    const az = air(zm.t, zm.p, zm.rh);
    const v0z = muzzleVelocity(load, zm.t);
    alpha = zeroAngle({ v0: v0z, bc: load.bc, model: load.model, rho: az.rho, c: az.c, h: gun.sightH, tK: zm.t + 273.15 }, gun.zero);
  }

  const a = air(met.t, met.p, met.rh);
  const v0 = muzzleVelocity(load, met.t);
  const w = windComponents((shot && shot.windSpeed) || 0, (shot && shot.windHour) || 12);
  const theta = ((shot && shot.angleDeg) || 0) * Math.PI / 180;
  const marks = [...new Set(distances.filter((d) => d > 0))].sort((p, q) => p - q);
  const raw = trajectory({ v0, bc: load.bc, model: load.model, rho: a.rho, c: a.c, h: gun.sightH, tK: met.t + 273.15, alpha, theta, wx: w.wx, wz: w.wz, marks });

  const sg = millerSg({ grains: load.grains, dMm: load.dMm, lenMm: load.lenMm, twistMm: gun.twist, v: v0, t: met.t, p: met.p });
  const spinSign = gun.twistDir === 'L' ? -1 : gun.twistDir === 'R' ? 1 : 0;

  const rows = marks.map((d, i) => {
    const r = raw[i];
    if (!r) return { d, reached: false };
    const sd = spinSign * spinDrift(sg, r.t);
    const zt = r.z + sd;
    const elMrad = -r.y / d * 1000;   // positif : il faut monter
    const wdMrad = -zt / d * 1000;    // positif : il faut corriger à droite
    const mach = r.v / a.c;
    return {
      d, reached: true,
      dropM: r.y, driftM: zt, windM: r.z, spinM: sd,
      elMrad, wdMrad,
      el: toUnit(elMrad, sight.unit), wd: toUnit(wdMrad, sight.unit),
      elClicks: sight.kind === 'scope' ? clicks(elMrad, sight.unit, sight.click) : null,
      wdClicks: sight.kind === 'scope' ? clicks(wdMrad, sight.unit, sight.click) : null,
      v: r.v, t: r.t, mach, energy: load.grains ? energyJ(load.grains, r.v) : null,
      regime: mach < 1 ? 'sub' : mach < 1.2 ? 'trans' : 'super'
    };
  });
  return { rows, v0, sg, alpha, air: a, spinKnown: spinSign !== 0 };
}
