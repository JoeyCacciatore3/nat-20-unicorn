// world.js — UNI-CORN, the last savior: the full connected map (audited).
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes, 4 gloom crystal (shot breaks).
//
// ============================ MAP LAWS (Joe, locked) ============================
// L1 TWO-TILE LAW    — hazard pits are <=2 tiles deep: always jumpable out.
// L2 RUNG LAW        — every vertical shaft has one-way rungs every <=2 tiles.
// L3 SPACING LAW     — pre-ability routes: rises <=2, gaps <=3. Double-jump
//                      routes: rises <=3, gaps <=5. Dash gaps: <=8.
// L4 CEILING LAW     — anything you must jump over needs >=2 tiles of clearance
//                      above its top edge.
// L5 GATE LAW        — an ability wall must be provably impassable without its
//                      ability and provably passable with it (incl. ceiling).
// L6 RETURN LAW      — every standable cell reachable with moveset M must reach
//                      a campfire using M. ENFORCED BY tools/map-audit.mjs — the
//                      build FAILS if any stuck spot exists. No exceptions.
// L7 DEATH LAW       — spikes/void always hurt + return to last safe ground;
//                      death always returns to a campfire. (engine, main.js)
// ================================================================================
export const T = 16, W = 280, H = 72;
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---- MAP GEOMETRY TABLE ----
// One row = one box: [x, y, w, h, v?] (v omitted = solid). ORDER MATTERS —
// later rows overwrite earlier (carves cut into mass). Add platforms/zones by
// adding rows; tools/map-audit.mjs proves every law still holds at build time.
const MAP = [
// ---- envelope ----
[0, 0, 3, H], [277, 0, 3, H],
[3, 60, 274, 12],                      // ground + underground mass

// ---- GLOOM MEADOW (surface, x158-277) ----
[170, 60, 3, 2, 0], [170, 61, 3, 1, 3],   // pits: 2 deep (L1), spikes, floor below
[196, 60, 5, 2, 0], [196, 61, 5, 1, 3], [197, 59, 3, 1, 2],
[233, 60, 3, 2, 0], [233, 61, 3, 1, 3],
[175, 57, 4, 1, 2], [181, 55, 4, 1, 2], [188, 57, 5, 1, 2],
[205, 56, 4, 1, 2], [212, 54, 4, 1, 2], [220, 57, 6, 1, 2],
[240, 56, 4, 1, 2], [247, 54, 4, 1, 2],
[210, 51, 3, 1, 2], [218, 49, 3, 1, 2],   // DJ high route (motes)
[262, 59, 3, 1], [265, 58, 3, 2], [268, 57, 3, 3], [271, 56, 3, 4], // shard tower
[274, 58, 3, 1, 2],                    // rung behind the tower (audit: stuck corner)

// ---- ROOT CAVES (x150-256, carved) ----
[150, 66, 107, 4, 0],                  // main corridor
[175, 63, 18, 7, 0],                   // tall room W
[215, 64, 20, 6, 0],                   // tall room E
[162, 60, 3, 6, 0],                    // entry shaft (L2 rungs)
[162, 62, 3, 1, 2], [162, 64, 3, 1, 2], [162, 66, 3, 1, 2], [162, 68, 3, 1, 2],
[246, 60, 3, 6, 0],                    // loop shaft (L2 rungs)
[246, 62, 3, 1, 2], [246, 64, 3, 1, 2], [246, 66, 3, 1, 2], [246, 68, 3, 1, 2],
// HEAL ALCOVE (L5): high pocket in room E — the step platform needs a 4-tile
// rise (double jump only), entry column open on the left. No rung adjacency.
[222, 61, 8, 3, 0], [224, 63, 6, 1], [219, 66, 3, 1, 2],
[184, 69, 3, 1, 3], [228, 69, 3, 1, 3],   // floor spike patches (3 wide, tall rooms)

// ---- WEST CLIFFS (x40-118, DJ terraces) ----
[114, 56, 2, 4],                       // 4-tile DJ gate wall
[100, 57, 8, 3], [88, 54, 8, 6], [76, 51, 8, 9], [64, 48, 8, 12], [52, 45, 8, 15],
// audit fix: fill the canyons between terrace towers (were 12-deep no-exit traps)
[60, 48, 4, 12], [72, 51, 4, 9], [84, 54, 4, 6],
// audit fix: vine ladder up the west terrace face — the far-west strip (fall
// zone from the treetops) had no way back. Rungs every 2 tiles (L2).
[49, 57, 3, 1, 2], [49, 55, 3, 1, 2], [49, 53, 3, 1, 2], [49, 51, 3, 1, 2],
[49, 49, 3, 1, 2], [49, 47, 3, 1, 2], [49, 45, 3, 1, 2],

// ---- TREETOPS (x40-118): L3-compliant zig-zag, rises 3 / gaps <=5 ----
[62, 42, 4, 1, 2], [68, 39, 4, 1, 2], [74, 36, 4, 1, 2], [80, 33, 4, 1, 2],
[74, 30, 4, 1, 2], [68, 27, 3, 1, 2], [63, 26, 3, 1, 2],
[52, 26, 8, 2],                        // shot-shard ledge + summit campfire
// descent-only mote detour (fall east off the climb; always exits to the surface)
[86, 36, 4, 1, 2], [94, 39, 4, 1, 2], [102, 42, 4, 1, 2],

// ---- SUMMIT (x10-60): bridge platform after the crystal, then tight chain ----
[48, 18, 2, 10, 4],                    // GLOOM CRYSTAL barrier (shot breaks 3x3)
[46, 24, 3, 1, 2],                     // bridge — first step past the barrier
[40, 23, 4, 1, 2], [34, 20, 3, 1, 2], [28, 17, 3, 1, 2], [22, 14, 3, 1, 2],
[10, 12, 9, 2],                        // peak ledge (widened — L3 landing)

// ---- GLOOM HEART (x10-139, carved) ----
[10, 64, 130, 6, 0],
[108, 60, 3, 4, 0],                    // entry shaft (L2 rungs)
[108, 62, 3, 1, 2], [108, 64, 3, 1, 2], [108, 66, 3, 1, 2], [108, 68, 3, 1, 2],
[80, 69, 7, 1, 3],                     // spike lake, 7 wide — DASH gate (audit: 10 was uncrossable even with dash)

// ---- PADDOCK extras ----
[124, 54, 4, 1, 2],                    // DJ hub perch (mote)

];
for (const m of MAP) box(...m);

// ---- regions ----
// Static regions — hue only defines zone tint. Rebloom system removed:
// world palette is fixed at boot, no per-boss color change.
export const regions = [
  { x0: 118, x1: 158, y0: 40, y1: 64, h: .12 },
  { x0: 158, x1: 280, y0: 0, y1: 64, h: .33 },
  { x0: 140, x1: 280, y0: 64, y1: 72, h: .08 },
  { x0: 0, x1: 140, y0: 64, y1: 72, h: .78 },
  { x0: 0, x1: 64, y0: 0, y1: 30, h: .62 },
  { x0: 40, x1: 118, y0: 0, y1: 48, h: .45 },
  { x0: 0, x1: 118, y0: 0, y1: 64, h: .55 },
  { x0: 0, x1: 280, y0: 0, y1: 72, h: .12 },
];
export const regionAt = (px, py) => regions.find(r => px >= r.x0 * T && px < r.x1 * T && py >= r.y0 * T && py < r.y1 * T) || regions[7];

// ---- entity seeds ----
export const seeds = {
  // ONE home campfire (Joe): the Paddock hearth is the only rest/save/respawn.
  // The Return Law auditor proves every reachable cell can get back to it.
  fires: [[132.5, 59.5]],
  // boss arenas: guardian index → bit is 1<<i (5 bosses, bits 1/2/4/8/16)
  bosses: [[258, 57], [226, 67], [56, 23], [14, 10], [22, 67]],
  // Chests — hand-placed exploration rewards. All drops come from enemies +
  // these 6 chests; no scattered map currency (design pivot v9). Contents
  // are fixed: 15 sparks + full heal each. Bit index in oc bitfield.
  chests: [
    [219.5, 48.3],  // 0 — Meadow high route (DJ-only)
    [186, 68.3],    // 1 — Root Caves W tall room
    [252, 67.3],    // 2 — Root Caves E loop
    [83, 50.3],     // 3 — West Cliffs terrace
    [56, 25.3],     // 4 — Treetops crest (SHOT-gated shard nearby)
    [12, 11.3],     // 5 — Summit peak (post-DASH)
  ],
  foes: [
    [174, 58, 1], [186, 58, 1], [206, 54, 1], [216, 58, 2], [230, 58, 2], [245, 58, 2], [260, 58, 3],
    [180, 66, 1], [200, 68, 2], [225, 66, 2], [248, 68, 3],
    [92, 52, 1], [78, 49, 2],
    [75, 35, 2],
    [34, 19, 2],
    [60, 68, 3], [40, 68, 3], [22, 68, 2],
  ],
};
// DECORATIONS — [x, y, type]. type: 0=tree, 1=grass, 2=rock. Placed on solid ground.
// Nearly free in bytes — draw code is shared, these are just coordinates.
export const DECO = [
  // Meadow (right side, main platform)
  [142, 59, 0], [155, 59, 0], [170, 59, 1], [178, 59, 1], [195, 59, 0], [210, 59, 1],
  [238, 59, 0], [250, 59, 1], [265, 59, 0], [275, 59, 1],
  [145, 59, 1], [162, 59, 2], [202, 59, 2], [228, 59, 1], [255, 59, 2],
  // Root caves (underground, rows 66-70)
  [168, 70, 2], [190, 70, 1], [210, 70, 2], [235, 70, 1], [255, 70, 2],
  [175, 70, 1], [220, 70, 1], [245, 70, 2],
  // West cliffs & treetops
  [85, 52, 0], [95, 52, 1], [70, 48, 0], [60, 44, 1],
  [50, 24, 0], [45, 24, 1], [38, 24, 2],
  // Summit area
  [18, 10, 2], [10, 10, 1], [25, 10, 1],
  // Gloom caves
  [30, 70, 2], [45, 70, 1], [55, 70, 2], [15, 70, 1],
];
