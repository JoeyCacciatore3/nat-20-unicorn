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
    [0,  83, 1.0, -46,  .1, 1.9,  2.0, 2.0, 2.0,  .75, .22, .20, 0],  // d6 red
    [0, -70, 1.2,  68,  .5, .9,   2.4, 2.4, 2.4,  .30, .55, .80, 0],  // d6 blue
    [0,  55, .25,  86,  0, .6,   14.0, .5, .8,    .85, .70, .25, 0],  // pencil
    [0, -88, .6,   28,  0, -.35, 10.0, 1.2, 14.0, .45, .18, .16, 0],  // rulebook
    [0, -86.5, 1.35, 26.8, 0, -.35, 6.5, .3, 9.5, .82, .78, .70, 0],  // open page
  ];
  // precompute static matrices once
  return rows.map(r => ({
    prim: r[0],
    m: compose(r[1], r[2], r[3], r[4], r[5], 0, 0, 0, r[6], r[7], r[8]),
    c: [r[9], r[10], r[11]],
    emis: r[12],
  }));
};
