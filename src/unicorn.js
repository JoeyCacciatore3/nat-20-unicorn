// unicorn.js — the player mini, composed from unit primitives (data rows, no assets)
import { makeVao } from './core.js';

// unit cube ±.5, per-face normals
export const buildCube = (gl) => {
  const verts = [], idx = [];
  for (let a = 0; a < 3; a++) for (let s = 1; s >= -1; s -= 2) {
    const b = (a + 1) % 3, c = (a + 2) % 3, base = verts.length / 6;
    for (let u = -1; u <= 1; u += 2) for (let v = -1; v <= 1; v += 2) {
      const q = [0, 0, 0], n = [0, 0, 0];
      q[a] = s * .5; q[b] = u * .5; q[c] = v * .5; n[a] = s;
      verts.push(...q, ...n);
    }
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  return makeVao(gl, new Float32Array(verts), new Uint16Array(idx), false);
};

// unit cone: base radius .5 at y=0, apex at y=1 (8 segments + base disc)
export const buildCone = (gl) => {
  const verts = [], idx = [], S = 8;
  for (let i = 0; i < S; i++) {
    const a0 = i / S * Math.PI * 2, a1 = (i + 1) / S * Math.PI * 2, am = (a0 + a1) / 2;
    const base = verts.length / 6;
    const nx = Math.cos(am) * .89, nz = Math.sin(am) * .89;
    verts.push(
      Math.cos(a0) * .5, 0, Math.sin(a0) * .5, nx, .45, nz,
      Math.cos(a1) * .5, 0, Math.sin(a1) * .5, nx, .45, nz,
      0, 1, 0, nx, .45, nz,
      Math.cos(a0) * .5, 0, Math.sin(a0) * .5, 0, -1, 0,
      Math.cos(a1) * .5, 0, Math.sin(a1) * .5, 0, -1, 0,
      0, 0, 0, 0, -1, 0,
    );
    idx.push(base, base + 2, base + 1, base + 3, base + 4, base + 5);
  }
  return makeVao(gl, new Float32Array(verts), new Uint16Array(idx), false);
};

// part rows: [prim(0 cube/1 cone), hx,hy,hz, baseRx, ox,oy,oz, sx,sy,sz, r,g,b, anim]
// anim: 0 none · 1 leg phase A · 2 leg phase B · 3 head nod · 4 tail sway · 5 body bob
const W = [.93, .93, .97];      // coat
const M = [.85, .35, .65];      // mane/tail
export const PARTS = [
  [0,   0, 1.02,   0,   0,    0, 0, 0,      .62, .50, 1.10, ...W, 5], // body
  [0,   0, 1.26,  .42, -.55,  0, .22, 0,    .26, .52, .30,  ...W, 5], // neck
  [0,   0, 1.78,  .62,  .1,   0, 0, .06,    .30, .30, .46,  ...W, 3], // head
  [0,   0, 1.70,  .92,  0,    0, 0, .05,    .18, .17, .24,  .82, .74, .80, 3], // muzzle
  [1,   0, 1.94,  .70, -.85,  0, 0, 0,      .11, .52, .11,  1, .82, .28, 3],   // horn
  [0,   0, 1.60,  .28, -.35,  0, .12, -.05, .15, .58, .46,  ...M, 5],  // mane
  [0,  .20, .78,  .34,  0,    0, -.34, 0,   .16, .70, .16,  ...W, 1],  // FR leg
  [0, -.20, .78,  .34,  0,    0, -.34, 0,   .16, .70, .16,  ...W, 2],  // FL leg
  [0,  .20, .78, -.34,  0,    0, -.34, 0,   .16, .70, .16,  ...W, 2],  // BR leg
  [0, -.20, .78, -.34,  0,    0, -.34, 0,   .16, .70, .16,  ...W, 1],  // BL leg
  [1,   0, 1.10, -.52, 2.45,  0, .1, 0,     .16, .62, .16,  ...M, 4],  // tail
];

// per-part animation → [extraRx, extraRy, extraY]
export const animPart = (anim, t, phase, run) => {
  const swing = Math.sin(phase) * .7 * run;
  const bob = Math.abs(Math.sin(phase)) * .09 * run + Math.sin(t * 2.1) * .012;
  switch (anim) {
    case 1: return [swing, 0, bob];
    case 2: return [-swing, 0, bob];
    case 3: return [Math.sin(phase) * .09 * run + Math.sin(t * 1.7) * .02, 0, bob];
    case 4: return [0, Math.sin(t * 3.1) * .35 + swing * .3, bob];
    case 5: return [0, 0, bob];
  }
  return [0, 0, 0];
};
