import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homography, project, convexQuad, rectify } from '../js/engine/homography.js';

const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

test('homographie : envoie les 4 coins sur les 4 cibles, et un point intérieur de façon cohérente', () => {
  const src = [{ x: -425, y: 425 }, { x: 425, y: 425 }, { x: 425, y: -425 }, { x: -425, y: -425 }];
  const dst = [{ x: 120, y: 80 }, { x: 900, y: 140 }, { x: 860, y: 1000 }, { x: 60, y: 930 }];
  const H = homography(src, dst);
  src.forEach((p, i) => { const q = project(H, p); assert.ok(near(q.x, dst[i].x, 1e-6) && near(q.y, dst[i].y, 1e-6)); });
  const back = homography(dst, src);
  const c = project(back, project(H, { x: 37, y: -112 }));
  assert.ok(near(c.x, 37, 1e-6) && near(c.y, -112, 1e-6), 'aller-retour');
});

test('homographie dégénérée et quadrilatère croisé', () => {
  const sq = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  assert.equal(homography(sq, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]), null);
  assert.equal(convexQuad(sq), true);
  assert.equal(convexQuad([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 1 }]), false);
});

test('redressement : un damier vu de biais retrouve ses cases à plat', () => {
  // image source 200×200 : la cible (100×100 mm) occupe un trapèze ; le quart haut-gauche de la cible est noir
  const sw = 200, sh = 200, corners = [{ x: 60, y: 20 }, { x: 140, y: 20 }, { x: 190, y: 180 }, { x: 10, y: 180 }];
  const toImg = homography([{ x: -50, y: 50 }, { x: 50, y: 50 }, { x: 50, y: -50 }, { x: -50, y: -50 }], corners);
  const toTgt = homography(corners, [{ x: -50, y: 50 }, { x: 50, y: 50 }, { x: 50, y: -50 }, { x: -50, y: -50 }]);
  const src = new Uint8ClampedArray(sw * sh * 4).fill(255);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const p = project(toTgt, { x: x + 0.5, y: y + 0.5 });
    if (p.x < 0 && p.y > 0) { const i = (y * sw + x) * 4; src[i] = src[i + 1] = src[i + 2] = 0; }
  }
  const out = rectify(src, sw, sh, corners, 100, 100, 100);
  assert.equal(out.width, 100); assert.equal(out.height, 100);
  const px = (u, v) => out.data[(v * 100 + u) * 4];
  assert.equal(px(20, 20), 0, 'haut gauche noir'); assert.equal(px(80, 20), 255); assert.equal(px(20, 80), 255); assert.equal(px(80, 80), 255);
  assert.ok(project(toImg, { x: 0, y: 0 }).y < 100, 'le haut du carton, plus loin, est tassé : le centre de la cible apparaît au-dessus du milieu de l’image');
});
