// world.js — NAT 20 UNICORN v2: the full connected map (Phase 2).
// 6 regions: Paddock hub, Gloom Meadow (E), Root Caves (under E), West Cliffs,
// Treetops/Summit (up W), Gloom Heart (under W). Tiles: 0 air, 1 solid,
// 2 one-way platform, 3 spikes, 4 gloom crystal (solid until Rainbow Shot).
//
// SPACING LAW: single jump rise ~2.6 tiles / reach ~4; double +~2; dash +~4.
//   Pre-shard routes: <=2-tile rises, <=3-tile gaps. DJ gates: 3-4 tile rises.
//   Dash gate: the 10-tile spike lake in the Gloom Heart.
// NO-SOFTLOCK LAW (Joe): (a) every pit is <=2 tiles deep — always jumpable out,
//   (b) spikes hurt + return you to last safe ground, (c) every vertical shaft
//   has one-way platforms at <=2-tile spacing so you can always climb back up.
export const T = 16, W = 280, H = 72;
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---- envelope ----
box(0, 0, 3, H); box(277, 0, 3, H);       // world walls
box(3, 60, 274, 12);                      // ground + underground mass (caves carved below)

// ---- GLOOM MEADOW (surface, x158-277) ----
// shallow spike pits: 2 deep, spikes at row 61, floor row 62 — jumpable out
box(170, 60, 3, 2, 0); box(170, 61, 3, 1, 3);
box(196, 60, 5, 2, 0); box(196, 61, 5, 1, 3); box(197, 59, 3, 1, 2); // hop platform
box(233, 60, 3, 2, 0); box(233, 61, 3, 1, 3);
// platform chains (<=2-tile rises pre-DJ)
box(175, 57, 4, 1, 2); box(181, 55, 4, 1, 2); box(188, 57, 5, 1, 2);
box(205, 56, 4, 1, 2); box(212, 54, 4, 1, 2); box(220, 57, 6, 1, 2);
box(240, 56, 4, 1, 2); box(247, 54, 4, 1, 2);
// DJ-gated high route with stardust motes
box(210, 51, 3, 1, 2); box(218, 49, 3, 1, 2);
// shard tower steps (1-tile rises)
box(262, 59, 3, 1); box(265, 58, 3, 2); box(268, 57, 3, 3); box(271, 56, 3, 4);

// ---- ROOT CAVES (x150-256, rows 63-69, carved) ----
box(150, 66, 107, 4, 0);                  // main corridor
box(175, 63, 18, 7, 0);                   // tall room W
box(215, 64, 20, 6, 0);                   // tall room E (lore stone)
box(162, 60, 3, 6, 0);                    // entry shaft from meadow
box(162, 62, 3, 1, 2); box(162, 64, 3, 1, 2); box(162, 66, 3, 1, 2); box(162, 68, 3, 1, 2); // climbable
box(246, 60, 3, 6, 0);                    // exit shaft (loop back to meadow)
box(246, 62, 3, 1, 2); box(246, 64, 3, 1, 2); box(246, 66, 3, 1, 2); box(246, 68, 3, 1, 2);
box(208, 66, 2, 4);                       // DJ wall — gates the east caves
box(184, 69, 4, 1, 3); box(228, 69, 4, 1, 3); // floor spike patches (crossable hops)

// ---- WEST CLIFFS (x40-118, DJ terraces) ----
box(114, 56, 2, 4);                       // 4-tile gate wall (DJ)
box(100, 57, 8, 3); box(88, 54, 8, 6); box(76, 51, 8, 9); box(64, 48, 8, 12); box(52, 45, 8, 15);

// ---- TREETOPS (x40-118, rows 26-45) ----
box(62, 42, 4, 1, 2); box(70, 39, 4, 1, 2); box(78, 42, 4, 1, 2); box(86, 36, 4, 1, 2);
box(94, 39, 4, 1, 2); box(102, 42, 4, 1, 2);
box(96, 33, 3, 1, 2); box(88, 30, 3, 1, 2); box(80, 27, 3, 1, 2); box(72, 30, 3, 1, 2); box(64, 27, 3, 1, 2);
box(52, 26, 8, 2);                        // shot-shard ledge (+ summit campfire)

// ---- SUMMIT (x10-60, rows 10-27) ----
box(48, 18, 2, 10, 4);                    // GLOOM CRYSTAL barrier — Rainbow Shot breaks it
box(40, 23, 4, 1, 2); box(33, 20, 3, 1, 2); box(26, 17, 3, 1, 2); box(19, 14, 3, 1, 2);
box(10, 12, 6, 2);                        // peak ledge — AIR DASH shard

// ---- GLOOM HEART (x10-139, rows 64-69, carved) ----
box(10, 64, 130, 6, 0);                   // corridor
box(108, 60, 3, 4, 0);                    // entry shaft west of home
box(108, 62, 3, 1, 2); box(108, 64, 3, 1, 2); box(108, 66, 3, 1, 2); box(108, 68, 3, 1, 2);
box(78, 69, 10, 1, 3);                    // the spike lake — DASH gate (hazard, never a trap)

// ---- PADDOCK extras ----
box(124, 54, 4, 1, 2);                    // DJ-reachable hub perch (mote — teaches revisiting)

// ---- regions: [x0,x1,y0,y1, hue, bloom] — first match wins; hub starts painted ----
export const regions = [
  { x0: 118, x1: 158, y0: 40, y1: 64, h: .12, b: 1, t: 1, n: 'The Paddock' },
  { x0: 158, x1: 280, y0: 0, y1: 64, h: .33, b: 0, t: 0, n: 'Gloom Meadow' },
  { x0: 140, x1: 280, y0: 64, y1: 72, h: .08, b: 0, t: 0, n: 'Root Caves' },
  { x0: 0, x1: 140, y0: 64, y1: 72, h: .78, b: 0, t: 0, n: 'Gloom Heart' },
  { x0: 0, x1: 64, y0: 0, y1: 30, h: .62, b: 0, t: 0, n: 'Summit' },
  { x0: 40, x1: 118, y0: 0, y1: 48, h: .45, b: 0, t: 0, n: 'Treetops' },
  { x0: 0, x1: 118, y0: 0, y1: 64, h: .55, b: 0, t: 0, n: 'West Cliffs' },
  { x0: 0, x1: 280, y0: 0, y1: 72, h: .12, b: 1, t: 1, n: 'The Paddock' },
];
export const regionAt = (px, py) => regions.find(r => px >= r.x0 * T && px < r.x1 * T && py >= r.y0 * T && py < r.y1 * T) || regions[7];

// ---- entity seeds (tile coords) ----
export const seeds = {
  fires: [[132.5, 59.5], [57.5, 25.4]],   // hub + summit-ledge checkpoint
  lores: [[141.5, 59.4], [232, 68.4]],
  // shards: [x, y, ability bit] — DJ -> Heal -> Shot -> Dash -> Finale
  shards: [
    [272.5, 54.3, 1],    // DOUBLE JUMP — meadow tower
    [252, 67.5, 2],      // RAINBOW HEAL — deep caves (behind DJ wall)
    [54, 24.3, 4],       // RAINBOW SHOT — treetops ledge
    [13, 10.3, 8],       // AIR DASH — summit peak (behind gloom crystal)
    [16, 67.5, 16],      // HEART SHARD — gloom heart (behind spike lake)
  ],
  motes: [ // stardust: exploration XP (each ~ a small pack of kills)
    [211.5, 50.3], [219.5, 48.3], [152, 68.5], [255, 67.3], [104, 41.3],
    [11.5, 11.3], [136, 68.5], [83, 66.5], [126, 53.3],
  ],
  sparks: [
    [163, 59.2], [176, 56.5], [182, 54.5], [190, 56.5], [198.5, 58.3], [207, 55.5],
    [213, 53.5], [222, 56.5], [228, 59.2], [238, 59.2], [241, 55.5], [248, 53.5],
    [263, 58.2], [270, 55.2],
    [163.5, 61.3], [170, 68.5], [185, 63.5], [210, 68.5], [230, 64.5], [242, 68.5],
    [104, 56.2], [92, 53.2], [80, 50.2], [68, 47.2], [56, 44.2],
    [72, 38.2], [88, 35.2], [81, 26.2], [65, 26.2],
    [42, 22.2], [28, 16.2], [20, 13.2],
    [120, 68.5], [100, 68.5], [50, 68.5], [30, 68.5],
  ],
  foes: [
    [174, 58, 1], [186, 58, 1], [206, 54, 1], [216, 58, 2], [230, 58, 2], [245, 58, 2], [260, 58, 3],
    [180, 66, 1], [200, 68, 2], [225, 66, 2], [248, 68, 3],
    [92, 52, 1], [78, 49, 2],
    [87, 34, 2], [56, 24, 3],
    [34, 19, 2],
    [60, 68, 3], [40, 68, 3], [22, 68, 2],
  ],
};
