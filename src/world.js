// world.js — UNI-CORN: 5-zone hub-and-spoke world.
// Zone 0 = MEADOW (hub, current geometry). Zones 1-4 reached via rainbow portals.
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes, 4 cracked wall (dash/shot breaks).
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
//                      build FAILS if any stuck spot exists (Zone 0 only).
// L7 DEATH LAW       — spikes/void always hurt + return to last safe ground;
//                      death always returns to a campfire. (engine, main.js)
// ================================================================================
export const T = 16, W = 280, H = 72;
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---------- ZONE 0: MEADOW (hub, unchanged geometry, DUSK MARE only) ----------
const Z0 = {
  MAP: [
    // envelope
    [0, 0, 3, H], [277, 0, 3, H],
    [3, 60, 274, 12],                      // ground + underground mass
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
    // Cave entry (x150-256, carved) — leads to Zone 1 portal
    [150, 66, 107, 4, 0],
    [175, 63, 18, 7, 0],
    [215, 64, 20, 6, 0],
    [162, 60, 3, 6, 0],
    [162, 62, 3, 1, 2], [162, 64, 3, 1, 2], [162, 66, 3, 1, 2], [162, 68, 3, 1, 2],
    [246, 60, 3, 6, 0],
    [246, 62, 3, 1, 2], [246, 64, 3, 1, 2], [246, 66, 3, 1, 2], [246, 68, 3, 1, 2],
    [222, 61, 8, 3, 0], [224, 63, 6, 1], [219, 66, 3, 1, 2],
    [184, 69, 3, 1, 3], [228, 69, 3, 1, 3],
    // Cliffs approach (x40-118) — DJ terraces leading to Zone 2 portal
    [114, 56, 2, 4],
    [100, 57, 8, 3], [88, 54, 8, 6], [76, 51, 8, 9], [64, 48, 8, 12], [52, 45, 8, 15],
    [60, 48, 4, 12], [72, 51, 4, 9], [84, 54, 4, 6],
    [49, 57, 3, 1, 2], [49, 55, 3, 1, 2], [49, 53, 3, 1, 2], [49, 51, 3, 1, 2],
    [49, 49, 3, 1, 2], [49, 47, 3, 1, 2], [49, 45, 3, 1, 2],
    // Cliffs canopy approach (x40-118) — zig-zag climb up to the Zone 2 portal
    [62, 42, 4, 1, 2], [68, 39, 4, 1, 2], [74, 36, 4, 1, 2], [80, 33, 4, 1, 2],
    [74, 30, 4, 1, 2], [68, 27, 3, 1, 2], [63, 26, 3, 1, 2],
    [52, 26, 8, 2],
    [86, 36, 4, 1, 2], [94, 39, 4, 1, 2], [102, 42, 4, 1, 2],
    // Peak approach (x10-60) — post-SHOT climb leads to Zone 3 portal
    [48, 18, 2, 10, 4],
    [46, 24, 3, 1, 2],
    [40, 23, 4, 1, 2], [34, 20, 3, 1, 2], [28, 17, 3, 1, 2], [22, 14, 3, 1, 2],
    [10, 12, 9, 2],
    // Depths approach (x10-139, deep west) — post-DASH corridor to Zone 4 portal
    [10, 64, 130, 6, 0],
    [108, 60, 3, 4, 0],
    [108, 62, 3, 1, 2], [108, 64, 3, 1, 2], [108, 66, 3, 1, 2], [108, 68, 3, 1, 2],
    [80, 69, 7, 1, 3],
    // Paddock DJ hub perch
    [124, 54, 4, 1, 2],
  ],
  fires: [[132.5, 59.5]],
  bosses: [[258, 57]],       // Only DUSK MARE (bi = curZone = 0)
  chests: [
    [186, 68.3],    // 0 — cave entry W (base tier discovery)
    [219.5, 48.3],  // 1 — high route platform (DJ-gated reward)
    [56, 25.3],     // 2 — canopy crest (climbing route reward)
    [12, 11.3],     // 3 — peak ledge (SHOT-gated summit reward)
  ],
  foes: [
    [174, 58, 1], [186, 58, 1], [206, 54, 4], [216, 58, 2], [230, 58, 2], [245, 58, 2], [260, 58, 3], [252, 58, 5],
    [180, 66, 1], [200, 68, 2], [225, 66, 6], [248, 68, 3], [190, 68, 5],
    [92, 52, 1], [78, 49, 2], [86, 53, 5],
    [75, 35, 2],
    [34, 19, 6],
    [125, 68, 3], [115, 68, 4], [98, 68, 6],
  ],
  // doors: [x, y, targetZone, spawnX, spawnY] — 4 rainbow portals at standing height
  doors: [
    [226, 69, 1, 40, 57],   // Zone 1 (CAVE)   — cave corridor floor (row 69, standable)
    [56, 25, 2, 40, 40],    // Zone 2 (CLIFFS) — canopy ledge top (row 25, standing on ledge)
    [14, 11, 3, 40, 30],    // Zone 3 (PEAK)   — peak ledge top (row 11, standing on ledge)
    [55, 69, 4, 40, 57],    // Zone 4 (DEPTHS) — depths corridor floor (row 69, standable)
  ],
  DECO: [
    [142, 59, 0], [155, 59, 0], [212, 59, 0], [238, 59, 0],
    [150, 59, 1], [183, 59, 1], [225, 59, 1], [255, 59, 1],
    [206, 55, 1], [176, 56, 0], [266, 57, 1],
    [20, 69, 2], [125, 69, 2], [120, 69, 2], [190, 69, 2], [240, 69, 2],
    [86, 53, 0], [73, 50, 0], [78, 50, 1],
    [53, 25, 0], [46, 23, 1],
    [12, 11, 2], [16, 11, 1],
    [160, 59, 6], [200, 59, 6], [245, 59, 6],
  ],
};

// ---------- ZONE 1: CAVE (MURK MARE) ----------
// Small underground chamber. Return portal at west edge → Meadow cave east loop.
const Z1 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 60, 274, 12],   // envelope + floor
    [30, 55, 5, 5],                                    // small ledge west (spawn area)
    [95, 57, 20, 1, 2],                                // one-way platform bridge (cols 95-114, row 57)
  ],
  fires: [[45, 59.5]],
  bosses: [[220, 59]],
  chests: [
    [60, 59.3],     // near-spawn discovery
    [110, 56.3],    // atop the platform bridge (requires jumping up)
    [250, 59.3],    // east side, past the boss arena
  ],
  foes: [[100, 58, 1], [150, 58, 2], [180, 58, 6]],
  doors: [[35, 59, 0, 226, 68]],
  DECO: [[70, 59, 2], [160, 59, 2], [200, 59, 2], [85, 59, 3], [130, 59, 3], [175, 59, 3], [240, 59, 3]],
};

// ---------- ZONE 2: CLIFFS (GALE MARE) ----------
// Sky arena — wind-swept cliff top. Return portal at west edge → Meadow canopy ledge.
const Z2 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 42, 274, 30],   // envelope + high floor at y=42
    [30, 38, 5, 4],                                    // spawn ledge
    [80, 38, 8, 1, 2],                                 // one climb platform (DJ from ground)
  ],
  fires: [[45, 41.5]],
  bosses: [[240, 41]],
  chests: [
    [60, 41.3],     // ground near spawn (base tier)
    [85, 37.3],     // atop the climb platform (DJ reward)
    [250, 41.3],    // east floor, past the boss (base tier)
  ],
  foes: [[90, 37, 5], [140, 29, 6], [190, 37, 5]],
  doors: [[35, 41, 0, 56, 24]],
  DECO: [[100, 41, 1], [200, 41, 1], [70, 41, 6], [140, 41, 6], [230, 41, 1], [120, 41, 6], [260, 41, 1]],
};

// ---------- ZONE 3: PEAK (FROST MARE) ----------
// Icy plateau. Return portal at west edge → Meadow peak ledge.
const Z3 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 32, 274, 40],   // envelope + floor at y=32
    [30, 28, 5, 4],                                    // spawn ledge
    [75, 29, 10, 1, 2],                                // one crossing platform (DJ from ground)
  ],
  fires: [[45, 31.5]],
  bosses: [[220, 31]],
  chests: [
    [60, 31.3],     // ground near spawn (base tier)
    [80, 28.3],     // atop the crossing platform (DJ reward)
    [240, 31.3],    // east floor, past the boss (base tier)
  ],
  foes: [[100, 29, 4], [140, 25, 3], [190, 29, 4]],
  doors: [[35, 31, 0, 14, 10]],
  DECO: [[80, 31, 2], [180, 31, 2], [60, 31, 5], [110, 31, 5], [150, 31, 5], [230, 31, 5], [100, 31, 2]],
};

// ---------- ZONE 4: DEPTHS (DARK MARE, final boss) ----------
// Corrupted arena. Return portal at west edge → Meadow deep corridor.
const Z4 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 60, 274, 12],   // envelope + floor
    [30, 55, 5, 5],                                    // spawn ledge
    [150, 57, 8, 1, 2],                                // climb platform (DJ from ground, reaches row 56)
  ],
  fires: [[45, 59.5]],
  bosses: [[240, 59]],                              // DARK MARE on ground floor
  chests: [
    [60, 59.3],     // ground near spawn (base tier)
    [155, 56.3],    // atop the climb platform (DJ reward)
    [255, 59.3],    // east floor, past the boss (base tier)
  ],
  foes: [[100, 58, 3], [140, 58, 6], [175, 51, 4], [200, 58, 3]],
  doors: [[35, 59, 0, 55, 68]],
  DECO: [[80, 59, 2], [130, 59, 2], [170, 59, 2], [100, 59, 4], [150, 59, 4], [210, 59, 3], [250, 59, 4]],
};

const ZONES = [Z0, Z1, Z2, Z3, Z4];

// Currently active zone data — live binding, importers see updates.
export let seeds = Z0;
export let DECO = Z0.DECO;

// Rebuild grid from a zone's MAP array, swap active seeds/DECO. Returns zone index.
export const loadZone = (i) => {
  grid.fill(0);
  seeds = ZONES[i];
  DECO = seeds.DECO;
  for (const m of seeds.MAP) box(...m);
  return i;
};

// Initial load — Zone 0 (Meadow hub) on module import.
loadZone(0);
