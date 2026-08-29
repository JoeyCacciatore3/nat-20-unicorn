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

// ---- envelope ----
box(0, 0, 3, H); box(277, 0, 3, H);
box(3, 60, 274, 12);                      // ground + underground mass

// ---- GLOOM MEADOW (surface, x158-277) ----
box(170, 60, 3, 2, 0); box(170, 61, 3, 1, 3);   // pits: 2 deep (L1), spikes, floor below
box(196, 60, 5, 2, 0); box(196, 61, 5, 1, 3); box(197, 59, 3, 1, 2);
box(233, 60, 3, 2, 0); box(233, 61, 3, 1, 3);
box(175, 57, 4, 1, 2); box(181, 55, 4, 1, 2); box(188, 57, 5, 1, 2);
box(205, 56, 4, 1, 2); box(212, 54, 4, 1, 2); box(220, 57, 6, 1, 2);
box(240, 56, 4, 1, 2); box(247, 54, 4, 1, 2);
box(210, 51, 3, 1, 2); box(218, 49, 3, 1, 2);   // DJ high route (motes)
box(262, 59, 3, 1); box(265, 58, 3, 2); box(268, 57, 3, 3); box(271, 56, 3, 4); // shard tower
box(274, 58, 3, 1, 2);                    // rung behind the tower (audit: stuck corner)

// ---- ROOT CAVES (x150-256, carved) ----
box(150, 66, 107, 4, 0);                  // main corridor
box(175, 63, 18, 7, 0);                   // tall room W
box(215, 64, 20, 6, 0);                   // tall room E
box(162, 60, 3, 6, 0);                    // entry shaft (L2 rungs)
box(162, 62, 3, 1, 2); box(162, 64, 3, 1, 2); box(162, 66, 3, 1, 2); box(162, 68, 3, 1, 2);
box(246, 60, 3, 6, 0);                    // loop shaft (L2 rungs)
box(246, 62, 3, 1, 2); box(246, 64, 3, 1, 2); box(246, 66, 3, 1, 2); box(246, 68, 3, 1, 2);
// HEAL ALCOVE (L5): high pocket in room E — the step platform needs a 4-tile
// rise (double jump only), entry column open on the left. No rung adjacency.
box(222, 61, 8, 3, 0); box(224, 63, 6, 1); box(219, 66, 3, 1, 2);
box(184, 69, 3, 1, 3); box(228, 69, 3, 1, 3);   // floor spike patches (3 wide, tall rooms)

// ---- WEST CLIFFS (x40-118, DJ terraces) ----
box(114, 56, 2, 4);                       // 4-tile DJ gate wall
box(100, 57, 8, 3); box(88, 54, 8, 6); box(76, 51, 8, 9); box(64, 48, 8, 12); box(52, 45, 8, 15);
// audit fix: fill the canyons between terrace towers (were 12-deep no-exit traps)
box(60, 48, 4, 12); box(72, 51, 4, 9); box(84, 54, 4, 6);
// audit fix: vine ladder up the west terrace face — the far-west strip (fall
// zone from the treetops) had no way back. Rungs every 2 tiles (L2).
box(49, 57, 3, 1, 2); box(49, 55, 3, 1, 2); box(49, 53, 3, 1, 2); box(49, 51, 3, 1, 2);
box(49, 49, 3, 1, 2); box(49, 47, 3, 1, 2); box(49, 45, 3, 1, 2);

// ---- TREETOPS (x40-118): L3-compliant zig-zag, rises 3 / gaps <=5 ----
box(62, 42, 4, 1, 2); box(68, 39, 4, 1, 2); box(74, 36, 4, 1, 2); box(80, 33, 4, 1, 2);
box(74, 30, 4, 1, 2); box(68, 27, 3, 1, 2); box(63, 26, 3, 1, 2);
box(52, 26, 8, 2);                        // shot-shard ledge + summit campfire
// descent-only mote detour (fall east off the climb; always exits to the surface)
box(86, 36, 4, 1, 2); box(94, 39, 4, 1, 2); box(102, 42, 4, 1, 2);

// ---- SUMMIT (x10-60): bridge platform after the crystal, then tight chain ----
box(48, 18, 2, 10, 4);                    // GLOOM CRYSTAL barrier (shot breaks 3x3)
box(46, 24, 3, 1, 2);                     // bridge — first step past the barrier
box(40, 23, 4, 1, 2); box(34, 20, 3, 1, 2); box(28, 17, 3, 1, 2); box(22, 14, 3, 1, 2);
box(10, 12, 9, 2);                        // peak ledge (widened — L3 landing)

// ---- GLOOM HEART (x10-139, carved) ----
box(10, 64, 130, 6, 0);
box(108, 60, 3, 4, 0);                    // entry shaft (L2 rungs)
box(108, 62, 3, 1, 2); box(108, 64, 3, 1, 2); box(108, 66, 3, 1, 2); box(108, 68, 3, 1, 2);
box(80, 69, 7, 1, 3);                     // spike lake, 7 wide — DASH gate (audit: 10 was uncrossable even with dash)

// ---- PADDOCK extras ----
box(124, 54, 4, 1, 2);                    // DJ hub perch (mote)

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
  shards: [
    [272.5, 54.3, 1],    // DOUBLE JUMP — meadow tower (base kit)
    [226, 61.7, 2],      // RAINBOW HEAL — caves alcove, behind the DJ step
    [54, 24.3, 4],       // RAINBOW SHOT — treetops ledge (DJ)
    [13, 10.3, 8],       // AIR DASH — summit peak (shot + DJ)
    [16, 67.5, 16],      // HEART SHARD — gloom heart (dash)
  ],
  // boss arenas: index-aligned with shards — the guardian stands here until slain
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
