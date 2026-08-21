// world.js — NAT 20 UNICORN v2: the connected map.
// One tile grid, painted by regions that bloom gray → color as shards free.
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes.
//
// SPACING LAW (all geometry derives from the jump physics in main.js):
//   single jump: rise ~2.6 tiles, reach ~4 tiles  → pre-shard routes use ≤2-tile
//   rises and ≤3-tile gaps (80% rule: never demand max capability).
//   double jump: rise ~4.7 tiles → gates are 4-tile walls / 3-tile terrace steps.
export const T = 16, W = 140, H = 30;
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---- geometry ----
box(0, 0, 3, H); box(137, 0, 3, H);   // world walls
box(3, 26, 134, 4);                   // baseline ground

// meadow pits (spikes at the bottom, floor beneath so you land hurt, not lost)
box(80, 26, 3, 4, 0); box(95, 26, 5, 4, 0);
box(80, 29, 3, 1, 1); box(95, 29, 5, 1, 1);
box(80, 28, 3, 1, 3); box(95, 28, 5, 1, 3);
box(96, 25, 2, 1, 2);                 // stepping platform across the wide pit

// meadow platforms (one-way, ≤2-tile rises — richer with double jump later)
box(85, 24, 4, 1, 2); box(90, 22, 4, 1, 2);
box(100, 24, 3, 1, 2); box(103, 22, 4, 1, 2); box(110, 20, 4, 1, 2);

// shard tower steps (east end — 1-tile rises, single-jump friendly)
box(125, 25, 3, 1); box(128, 24, 3, 2); box(131, 23, 3, 3);

// WEST GATE: 4-tile wall — the double-jump lock
box(38, 22, 2, 4);

// west cliff terraces (3-tile rises — each one a double-jump)
box(30, 23, 6, 3); box(22, 20, 6, 6); box(14, 17, 6, 9); box(6, 14, 6, 12);

// tease island — visible, 5 tiles above the plateau: future Wall Kick territory
box(5, 8, 4, 1);

// ---- regions: bloom 0 = gray doubt, 1 = painted. The paddock starts painted. ----
export const regions = [
  { x0: 40, x1: 70,  h: .12, b: 1, t: 1, n: 'The Paddock' },
  { x0: 70, x1: 140, h: .33, b: 0, t: 0, n: 'Gloom Meadow' },
  { x0: 0,  x1: 40,  h: .55, b: 0, t: 0, n: 'West Cliffs' },
];
export const regionAt = (px) => regions.find(r => px >= r.x0 * T && px < r.x1 * T) || regions[0];

// ---- entity seeds (tile coords; main.js scales by T) ----
export const seeds = {
  fire: [50.5, 25.5],
  lore: [57.5, 25.4],
  shard: [132.5, 21.3],   // shard 1: DOUBLE JUMP
  tease: [6.8, 6.4],      // ghost shard on the island (locked — wall kick, someday)
  sparks: [
    [76, 25.2], [81, 24.6], [86, 23.2], [88, 23.2], [91, 21.2], [93, 21.2],
    [96.5, 23.9], [101, 23.2], [104, 21.2], [106, 21.2], [111, 19.2], [113, 19.2],
    [117, 25.2], [123, 25.2], [129, 22.2],
    [33, 22.2], [25, 19.2], [17, 16.2], [9, 13.2], [6.3, 7.2], [7.5, 7.2],
  ],
  // [x, y, tier]: tier drives size, color, hp, xp — power you can read at a glance
  foes: [
    [75, 25, 1], [88, 25, 1], [104, 21, 1], [107, 25, 2],
    [118, 25, 2], [122, 25, 3], [33, 22, 1], [24, 19, 2],
  ],
};
