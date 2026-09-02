// world.js — UNICORN: 5-zone hub-and-spoke world.
// Unified world — one map (MEADOW). All 5 CORN bosses live in it; no portals.
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes.
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
//                      build FAILS if any stuck spot exists.
// L7 DEATH LAW       — spikes/void always hurt + return to last safe ground;
//                      death always returns to a campfire. (engine, main.js)
// ================================================================================
export const T = 16, W = 600, H = 120;
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---------- WORLD (unified MEADOW) ----------
// Expanded 2026-09-02: east extension x=280-475 (Phase 1), CAVE/CLIFFS/PEAK/DEPTHS absorbed
// (Phases 2-5, all 5 bosses relocated). Canvas 600x120 for 5-piece layout (top strip /
// left/center/right squares / bottom strip). Bottom stratum y=72-119 reserved for growth.
const MEADOW = {
  MAP: [
    // envelope (grid now 600x120 — MEADOW center band y=0-71, bottom stratum y=72-119 reserved for DEPTHS absorption)
    [0, 0, 3, H], [597, 0, 3, H],
    [3, 60, 594, 12],                      // ground + underground mass (rows 60-71 across full width)
    // Meadow surface (x158-277) — pits, platforms, DJ high route, stepped tower
    [170, 60, 3, 2, 0], [170, 61, 3, 1, 3],
    [196, 60, 5, 2, 0], [196, 61, 5, 1, 3], [197, 59, 3, 1, 2],
    [233, 60, 3, 2, 0], [233, 61, 3, 1, 3],
    [175, 57, 4, 1, 2], [181, 55, 4, 1, 2], [188, 57, 5, 1, 2],
    [205, 56, 4, 1, 2], [212, 54, 4, 1, 2], [220, 57, 6, 1, 2],
    [240, 56, 4, 1, 2], [247, 54, 4, 1, 2],
    [210, 51, 3, 1, 2], [218, 49, 3, 1, 2],   // DJ high route
    [262, 59, 3, 1], [265, 58, 3, 2], [268, 57, 3, 3], [271, 56, 3, 4],
    [274, 58, 3, 1, 2],
    // Descent corridor (x150-256, carved subterranean pocket, vestigial from CAVE portal removal)
    [150, 66, 107, 4, 0],
    [175, 63, 18, 7, 0],
    [215, 64, 20, 6, 0],
    [162, 60, 3, 6, 0],
    [162, 62, 3, 1, 2], [162, 64, 3, 1, 2], [162, 66, 3, 1, 2], [162, 68, 3, 1, 2],
    [246, 60, 3, 6, 0],
    [246, 62, 3, 1, 2], [246, 64, 3, 1, 2], [246, 66, 3, 1, 2], [246, 68, 3, 1, 2],
    [222, 61, 8, 3, 0], [224, 63, 6, 1], [219, 66, 3, 1, 2],
    [184, 69, 3, 1, 3], [228, 69, 3, 1, 3],
    // Western terraces (x40-118) — DJ climb to YELLOW CORN on canopy ledge
    [114, 56, 2, 4],
    [100, 57, 8, 3], [88, 54, 8, 6], [76, 51, 8, 9], [64, 48, 8, 12], [52, 45, 8, 15],
    [60, 48, 4, 12], [72, 51, 4, 9], [84, 54, 4, 6],
    [49, 57, 3, 1, 2], [49, 55, 3, 1, 2], [49, 53, 3, 1, 2], [49, 51, 3, 1, 2],
    [49, 49, 3, 1, 2], [49, 47, 3, 1, 2], [49, 45, 3, 1, 2],
    // Canopy zig-zag climb (x40-118) — DJ route up to YELLOW CORN ledge
    [62, 42, 4, 1, 2], [68, 39, 4, 1, 2], [74, 36, 4, 1, 2], [80, 33, 4, 1, 2],
    [74, 30, 4, 1, 2], [68, 27, 3, 1, 2], [63, 26, 3, 1, 2],
    [52, 26, 8, 2],
    [86, 36, 4, 1, 2], [94, 39, 4, 1, 2], [102, 42, 4, 1, 2],
    // Peak approach (x10-60) — DJ climb up to BLUE CORN on summit ledge
    [46, 24, 3, 1, 2],
    [40, 23, 4, 1, 2], [34, 20, 3, 1, 2], [28, 17, 3, 1, 2], [22, 14, 3, 1, 2],
    [10, 12, 9, 2],
    // Depths corridor (x10-139, deep west) — post-DASH route to VIOLET CORN
    [10, 64, 130, 6, 0],
    [108, 60, 3, 4, 0],
    [108, 62, 3, 1, 2], [108, 64, 3, 1, 2], [108, 66, 3, 1, 2], [108, 68, 3, 1, 2],
    [80, 69, 7, 1, 3],
    // Paddock DJ hub perch
    [124, 54, 4, 1, 2],
    // ---- EAST EXTENSION (x280-476) — post-hub exploration, full skill-kit showcase ----
    // Early run (x280-325): base pit + DJ terrace climb (rise-3 rungs, walkway rest)
    [288, 60, 3, 2, 0], [288, 61, 3, 1, 3],
    [295, 57, 6, 1, 2], [303, 54, 4, 1, 2], [309, 51, 4, 1, 2], [315, 48, 8, 1, 2],
    // Mid run (x330-380): DASH pit, long DJ walkway, LONG DASH pit, reward ledge
    [330, 60, 5, 2, 0], [330, 61, 5, 1, 3],
    [345, 57, 10, 1, 2],
    [360, 60, 8, 2, 0], [360, 61, 8, 1, 3],
    [372, 52, 6, 1, 2],
    // Vertical stack (x385-430): DJ zig-zag climb → TRI-JUMP upper landing → step-down
    [385, 55, 5, 1, 2], [392, 51, 5, 1, 2], [385, 47, 5, 1, 2], [392, 43, 5, 1, 2],
    [398, 38, 8, 1],
    [412, 43, 4, 1, 2], [418, 47, 4, 1, 2], [424, 51, 4, 1, 2], [430, 55, 4, 1, 2],
    // East end (x440-475): stepped tower echoing western motif + final walkway
    [440, 59, 3, 1], [443, 58, 3, 2], [446, 57, 3, 3], [449, 56, 3, 4], [452, 55, 3, 5],
    [458, 55, 6, 1, 2],
  ],
  fires: [[132.5, 59.5]],
  bosses: [                              // All 5 CORN bosses live in the unified MEADOW; bi picks the rainbow band
    [258, 57, 0],   // RED    — center MEADOW (original)
    [460, 54, 1],   // ORANGE — far east walkway (ex-CAVE, Phase 2)
    [56, 25, 2],    // YELLOW — canopy ledge (DJ-tier)
    [18, 11, 3],    // BLUE   — peak ledge east edge (DJ-tier)
    [35, 68, 4],    // VIOLET — depths corridor west (DASH-tier)
  ],
  chests: [
    [181, 68.3],    // 0 — descent corridor W (base tier discovery) — shifted W of spike (184-186)
    [219.5, 48.3],  // 1 — high route platform (DJ-gated reward)
    [59, 25.3],     // 2 — canopy crest (near YELLOW CORN)
    [12, 11.3],     // 3 — peak ledge (DJ summit reward)
  ],
  foes: [
    [174, 58, 1], [186, 58, 1], [206, 54, 4], [216, 58, 2], [230, 58, 2], [245, 58, 2], [260, 58, 3], [252, 58, 5],
    [180, 66, 1], [200, 68, 2], [225, 66, 6], [248, 68, 3], [190, 68, 5],
    [92, 52, 1], [78, 49, 2], [86, 53, 5],
    [75, 35, 2],
    [34, 19, 6],
    [125, 68, 3], [115, 68, 4], [98, 68, 6],
  ],
  DECO: [
    // MEADOW paddock / title-hero framing (x111-146) — lush, spaced (trees ≥3 tiles
    // apart so canopies never touch; campfire x131-134 kept clear).
    [113, 59, 0], [119, 59, 0], [139, 59, 0], [145, 59, 0],                                 // trees
    [112, 59, 1], [116, 59, 1], [122, 59, 1], [129, 59, 1], [136, 59, 1], [141, 59, 1],     // grass tufts
    [118, 59, 6], [121, 59, 6], [128, 59, 6], [137, 59, 6], [143, 59, 6],                    // flowers
    [126, 59, 3], [135, 59, 3],                                                              // mushrooms
    // MEADOW eastern open run (x142-277)
    [142, 59, 0], [155, 59, 0], [165, 59, 0], [202, 59, 0], [212, 59, 0], [228, 59, 0], [238, 59, 0],
    [148, 59, 1], [150, 59, 1], [180, 59, 1], [183, 59, 1], [225, 59, 1], [255, 59, 1], [261, 59, 1],
    [160, 59, 6], [173, 59, 6], [195, 59, 6], [210, 59, 6], [245, 59, 6], [250, 59, 6],
    [174, 56, 0], [204, 55, 1], [266, 57, 1],
    // terraces / cliffs / peak deco (gameplay regions, unchanged)
    [20, 69, 2], [126, 69, 2], [120, 69, 2], [190, 69, 2], [240, 69, 2],
    [86, 53, 0], [73, 50, 0], [78, 50, 1],
    [53, 25, 0], [45, 23, 1],
    [17, 11, 2], [15, 11, 1],   // peak-ledge decor (nudged: chest 3 at x=12)
  ],
};

export const seeds = MEADOW;

// Ground-find: first solid/platform surface ROW at or below (tx, ty), skipping air/spikes.
// One shared "seat on the surface" rule — used by hand-placed deco snapping AND
// chest snapping (main.js), so a prop never floats when its seed y mismatches carved terrain.
export const groundRow = (tx, ty) => { for (let y = ty; y < H; y++) { const v = grid[y * W + tx]; if (v === 1 || v === 2) return y; } return H; };

// PROCEDURAL FOLIAGE — scatter deco along exposed floor tops. Deterministic (seeded RNG).
// FOL = [gap, ...types] — 1-in-gap column density; types: 0 tree 1 grass 6 flower.
const FOL = [3, 1, 1, 6, 1];
const scatter = () => {
  const [gap, ...ty] = FOL, d = [];
  let s = 13, rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const keep = [...seeds.chests, ...seeds.foes, ...seeds.bosses, ...seeds.fires, ...seeds.DECO];
  for (let x = 5; x < W - 5; x++) {
    if (rnd() * gap >= 1) continue;                              // 1-in-gap column density
    if (keep.some(p => p && Math.abs(p[0] - x) < 2)) continue;   // keepout: skip cols near critical objects
    let surf = -1;
    for (let y = 2; y < H; y++) if (grid[y * W + x] === 1 && grid[(y - 1) * W + x] === 0) surf = y;   // lowest exposed floor top (skips ceilings)
    if (surf > 0) d.push(keep[keep.length] = [x, surf - 1, ty[rnd() * ty.length | 0]]);   // push to keep too so subsequent iterations respect our own placements
  }
  return d;
};

// Module-init: paint MEADOW grid + merge hand-placed decor (snapped to surface) with scatter fill.
for (const m of seeds.MAP) box(...m);
export const DECO = seeds.DECO.map(([x, y, t]) => [x, groundRow(x, y + 1) - 1, t]).concat(scatter());
