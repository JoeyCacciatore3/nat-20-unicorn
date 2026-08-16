// particles.js — pooled rainbow contrail + horn sparkles (points, additive)
const MAX = 320;
const P = new Float32Array(MAX * 8); // x y z vx vy vz life hue
let n = 0;

export const spawn = (x, y, z, vx, vy, vz, life, hue) => {
  if (n >= MAX) return;
  P.set([x, y, z, vx, vy, vz, life, hue], n * 8);
  n++;
};

export const update = (dt) => {
  for (let i = 0; i < n; i++) {
    const k = i * 8;
    P[k + 6] -= dt;
    if (P[k + 6] <= 0) { P.copyWithin(k, --n * 8, n * 8 + 8); i--; continue; }
    P[k] += P[k + 3] * dt; P[k + 1] += P[k + 4] * dt; P[k + 2] += P[k + 5] * dt;
    P[k + 4] += 1.6 * dt; // gentle float upward
  }
};

const hue2 = (h) => [
  Math.min(Math.max(Math.abs(h * 6 - 3) - 1, 0), 1),
  Math.min(Math.max(2 - Math.abs(h * 6 - 2), 0), 1),
  Math.min(Math.max(2 - Math.abs(h * 6 - 4), 0), 1),
];

// fill interleaved x,y,z,r,g,b,life — returns particle count
const OUT = new Float32Array(MAX * 7);
export const fill = () => {
  for (let i = 0; i < n; i++) {
    const k = i * 8, o = i * 7, l = Math.min(P[k + 6], 1);
    const [r, g, b] = hue2(P[k + 7] % 1);
    OUT[o] = P[k]; OUT[o + 1] = P[k + 1]; OUT[o + 2] = P[k + 2];
    OUT[o + 3] = r; OUT[o + 4] = g; OUT[o + 5] = b; OUT[o + 6] = l;
  }
  return { data: OUT, count: n };
};
