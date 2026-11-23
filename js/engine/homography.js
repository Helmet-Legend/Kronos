// Homographie plane (correction de perspective) : 4 points source → 4 points destination.
// Sert à redresser la photo d'une cible prise de biais à partir des 4 coins du carton.

/** Résout A·x = b (élimination de Gauss avec pivot partiel). */
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/**
 * Matrice 3×3 (tableau de 9) qui envoie chaque src[i] sur dst[i].
 * @param {Array<{x:number,y:number}>} src 4 points @param {Array<{x:number,y:number}>} dst 4 points
 * @returns {number[]|null} null si les points sont dégénérés (alignés, confondus)
 */
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

/** Applique l'homographie à un point. */
export function project(H, p) {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

/** Le quadrilatère (ordre des coins) est-il convexe et non croisé ? */
export function convexQuad(q) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(z) < 1e-9) return false;
    if (!sign) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false;
  }
  return true;
}

/**
 * Redresse une image : pixels RGBA source → image de la cible à plat (W × H mm, outW px de large).
 * corners : coins de la cible dans l'image source (haut gauche, haut droit, bas droit, bas gauche).
 * Échantillonnage au plus proche voisin.
 */
export function rectify(src, sw, sh, corners, Wmm, Hmm, outW) {
  const outH = Math.round(outW * Hmm / Wmm);
  const tgt = [{ x: -Wmm / 2, y: Hmm / 2 }, { x: Wmm / 2, y: Hmm / 2 }, { x: Wmm / 2, y: -Hmm / 2 }, { x: -Wmm / 2, y: -Hmm / 2 }];
  const Hm = homography(tgt, corners);
  if (!Hm) return null;
  const out = new Uint8ClampedArray(outW * outH * 4);
  for (let v = 0; v < outH; v++) {
    const y = Hmm / 2 - (v + 0.5) / outH * Hmm;
    for (let u = 0; u < outW; u++) {
      const x = -Wmm / 2 + (u + 0.5) / outW * Wmm;
      const w = Hm[6] * x + Hm[7] * y + Hm[8];
      const sx = Math.round((Hm[0] * x + Hm[1] * y + Hm[2]) / w), sy = Math.round((Hm[3] * x + Hm[4] * y + Hm[5]) / w);
      const o = (v * outW + u) * 4;
      if (sx >= 0 && sy >= 0 && sx < sw && sy < sh) {
        const i = (sy * sw + sx) * 4;
        out[o] = src[i]; out[o + 1] = src[i + 1]; out[o + 2] = src[i + 2]; out[o + 3] = 255;
      } else { out[o] = 40; out[o + 1] = 40; out[o + 2] = 40; out[o + 3] = 255; }
    }
  }
  return { data: out, width: outW, height: outH };
}
