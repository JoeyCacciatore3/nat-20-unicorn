// props.js — static world dressing: the house on its hill + tabletop clutter
// (dice, pencil, rulebook) that sells the diorama fiction at the rim.
import { compose } from './core.js';
import { surfaceHeight } from './terrain.js';

// rows: [prim(0 cube/1 cone), x,y,z, rx,ry, sx,sy,sz, r,g,b, emis]
export const buildProps = () => {
  const hy = surfaceHeight(0, 0); // house hill top (after zone deltas)
  const rows = [
    // ---- the house (diorama centerpiece, placeholder for P3 build slots) ----
    [0, 0, hy + 1.5, 0,     0, .0,   4.4, 3.0, 3.8,  .58, .52, .46, 0],  // walls
    [1, 0, hy + 3.0, 0,     0, 0,    6.4, 2.6, 5.8,  .48, .30, .28, 0],  // roof cone
    [0, 0, hy + 1.1, 1.95,  0, 0,    1.0, 2.2, .18,  .30, .24, .20, 0],  // door (+Z)
    [0, 1.5, hy + 4.2, -.9, 0, .3,   .5, 2.4, .5,    .45, .40, .38, 0],  // chimney
    // ---- tabletop clutter, out on the wood past the island ----
    [0,  78, 1.1, -52,  .35, .7,  2.2, 2.2, 2.2,  .90, .88, .82, 0],  // d6 ivory
  ];
  // ---- paddock fence: posts + two rails around the home hill, gate faces +Z (door side)
  const N = 14, step = (6.283 - .6) / (N - 1);
  for (let i = 0; i < N; i++) {
    const a = .3 + i * step, x = Math.sin(a) * 9, z = Math.cos(a) * 9;
    rows.push([0, x, surfaceHeight(x, z) + .55, z, 0, a, .22, 1.1, .22, .52, .38, .24, 0]);
    if (i < N - 1) {
      const am = a + step / 2, mx = Math.sin(am) * 9, mz = Math.cos(am) * 9, my = surfaceHeight(mx, mz);
      rows.push([0, mx, my + .8, mz, 0, am, 3.9, .12, .1, .52, .38, .24, 0]);
    }
  }
  // precompute static matrices once
  return rows.map(r => ({
    prim: r[0],
    m: compose(r[1], r[2], r[3], r[4], r[5], 0, 0, 0, r[6], r[7], r[8]),
    c: [r[9], r[10], r[11]],
    emis: r[12],
  }));
};
