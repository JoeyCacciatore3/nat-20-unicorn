// terrain.js — procedural heightfield island on the table.
// surfaceHeight() is THE height truth (bilinear over the same grid the mesh renders).
import { makeVao } from './core.js';

export const WORLD = 128;   // world units across
export const GRID = 96;     // grid quads per side
const G = GRID;
export const STEP = WORLD / G;
const V = G + 1;
const H = new Float32Array(V * V);
export const TABLE = 110;   // the physical table edge — beyond is the void

export const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const sm = t => t * t * (3 - 2 * t);
const vnoise = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

// baseline: rolling hills + center house hill, fading to the table at the rim.
// PURE — the zone export tool (tools/export-zone.mjs) imports this same function,
// so editor deltas are always diffs against exactly what the game generates.
export const baselineHeight = (x, z) => {
  const r = Math.hypot(x, z);
  const mask = 1 - sm(Math.min(Math.max((r - 28) / 14, 0), 1));
  const n = vnoise(x * .035 + 9, z * .035 + 7) * 5.2 + vnoise(x * .09, z * .09) * 1.6 + vnoise(x * .28, z * .28) * .35;
  const hill = 3.2 * Math.exp(-r * r / 130); // the house hill
  return (n + hill) * mask;
};

for (let j = 0; j < V; j++) for (let i = 0; i < V; i++)
  H[j * V + i] = baselineHeight(i * STEP - WORLD / 2, j * STEP - WORLD / 2);

// editor deltas: repeating [u16 vertex index LE, i8 height*8] triplets
export const applyDeltas = (bytes) => {
  for (let i = 0; i + 2 < bytes.length; i += 3) {
    const k = bytes[i] | (bytes[i + 1] << 8);
    H[k] += ((bytes[i + 2] << 24) >> 24) / 8;
  }
};

export const surfaceHeight = (x, z) => {
  const gx = (x + WORLD / 2) / STEP, gz = (z + WORLD / 2) / STEP;
  if (gx < 0 || gz < 0 || gx >= G || gz >= G) return 0;
  const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j, k = j * V + i;
  const a = H[k], b = H[k + 1], c = H[k + V], d = H[k + V + 1];
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
};

export const surfaceNormal = (x, z) => {
  const e = .6;
  const dx = surfaceHeight(x + e, z) - surfaceHeight(x - e, z);
  const dz = surfaceHeight(x, z + e) - surfaceHeight(x, z - e);
  const l = Math.hypot(dx, 2 * e, dz);
  return [-dx / l, 2 * e / l, -dz / l];
};

export const buildTerrain = (gl) => {
  const verts = new Float32Array(V * V * 9);
  let p = 0;
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const x = i * STEP - WORLD / 2, z = j * STEP - WORLD / 2, y = H[j * V + i];
    const [nx, ny, nz] = surfaceNormal(x, z);
    // pre-color world: muted grey by height + speckle, faint cool tint
    const g = .40 + y * .045 + (hash(i, j + 999) - .5) * .05;
    verts.set([x, y, z, nx, ny, nz, g * .96, g * .98, g * 1.05], p); p += 9;
  }
  const idx = new Uint16Array(G * G * 6);
  p = 0;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const k = j * V + i;
    idx.set([k, k + V, k + 1, k + 1, k + V, k + V + 1], p); p += 6;
  }
  return makeVao(gl, verts, idx, true);
};

// the wooden table the island sits on (finite — you can fall off the edge)
export const buildTable = (gl) => {
  const s = TABLE, y = -.02, c = [.30, .21, .13];
  const verts = new Float32Array([
    -s, y, -s, 0, 1, 0, ...c,
     s, y, -s, 0, 1, 0, ...c,
    -s, y,  s, 0, 1, 0, ...c,
     s, y,  s, 0, 1, 0, ...c,
  ]);
  return makeVao(gl, verts, new Uint16Array([0, 2, 1, 1, 2, 3]), true);
};
