// props.js — static world dressing: the campfire paddock (fence + gate), per-region
// trees/rocks, and a d6 on the wood past the island that sells the tabletop fiction.
import { compose } from './core.js';
import { surfaceHeight } from './terrain.js';
import { regionCenter } from './zones.js';

// rows: [prim(0 cube/1 cone), x,y,z, rx,ry, sx,sy,sz, r,g,b, emis]
export const buildProps = () => {
  const hy = surfaceHeight(0, 0); // camp hill top (after zone deltas)
  const rows = [
    // ---- the camp: a fire at the paddock's heart (rest spot, tiny landmark glow)
    [0, 0, hy + .18, 0,   0, .5,  1.4, .34, 1.4,  .35, .24, .16, 0],  // log ring
    [1, 0, hy + .62, 0,   0, 0,   .5, .95, .5,    1, .55, .15, .9],   // flame
    // ---- tabletop clutter, out on the wood past the island ----
    [0,  36, 1.1, -30,  .35, .7,  2.2, 2.2, 2.2,  .90, .88, .82, 0],  // d6 ivory — just past the island rim, inside fog range
  ];
  // ---- paddock fence: posts + two rails around the home hill, gate faces +Z
  const N = 14, step = (6.283 - .6) / (N - 1);
  for (let i = 0; i < N; i++) {
    const a = .3 + i * step, x = Math.sin(a) * 9, z = Math.cos(a) * 9;
    rows.push([0, x, surfaceHeight(x, z) + .55, z, 0, a, .22, 1.1, .22, .52, .38, .24, 0]);
    if (i < N - 1) {
      const am = a + step / 2, mx = Math.sin(am) * 9, mz = Math.cos(am) * 9, my = surfaceHeight(mx, mz);
      rows.push([0, mx, my + .8, mz, 0, am, 3.9, .12, .1, .52, .38, .24, 0]);
    }
  }
  // region dressing — each chapter gets its own "unpainted minis":
  // trees (odd regions lean tall/forest, even squat/mushroom) + rocks.
  for (let i = 0; i < 7; i++) {
    const [cx, cz] = regionCenter(i);
    for (let n = 0; n < 7; n++) {
      const a = i * 2.3 + n * 2.71, d = 4 + ((n * 37 + i * 53) % 126) / 9;
      const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
      const y = surfaceHeight(x, z);
      if (y < .4) continue; // stay off the table/shore
      if (n < 4) { // tree: trunk + crown (species varies by region parity)
        const tall = i & 1 ? 1.3 + (n % 3) * .3 : .8;
        rows.push([0, x, y + tall * .45, z, 0, a, .16, tall, .16, .38, .28, .2, 0]);
        rows.push([1, x, y + tall * (i & 1 ? 1.05 : .95), z, 0, a * 2,
          i & 1 ? .8 : 1.15, i & 1 ? 1.5 : .6, i & 1 ? .8 : 1.15, .2, .3, .24, 0]);
      } else { // rock
        const rs = .3 + (n % 3) * .22;
        rows.push([0, x, y + rs * .4, z, .3, a, rs * 1.4, rs, rs, .42, .4, .44, 0]);
      }
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
