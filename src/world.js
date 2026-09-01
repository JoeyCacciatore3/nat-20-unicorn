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
    [49, 18, 1, 10, 4],
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
    [59, 25.3],     // 2 — canopy crest (moved off the CLIFFS door at x56 so both read cleanly)
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
    // MEADOW paddock / title-hero framing (x111-146) — lush, spaced (trees ≥3 tiles
    // apart so canopies never touch; campfire x131-134 kept clear).
    [113, 59, 0], [119, 59, 0], [139, 59, 0], [145, 59, 0],                                 // trees
    [112, 59, 1], [116, 59, 1], [122, 59, 1], [129, 59, 1], [136, 59, 1], [141, 59, 1],     // grass tufts
    [118, 59, 6], [121, 59, 6], [128, 59, 6], [137, 59, 6], [143, 59, 6],                    // flowers
    [126, 59, 3], [135, 59, 3],                                                              // mushrooms
    // MEADOW eastern open run (x142-277)
    [142, 59, 0], [155, 59, 0], [165, 59, 0], [200, 59, 0], [212, 59, 0], [228, 59, 0], [238, 59, 0],
    [148, 59, 1], [150, 59, 1], [180, 59, 1], [183, 59, 1], [225, 59, 1], [255, 59, 1], [260, 59, 1],
    [160, 59, 6], [170, 59, 6], [195, 59, 6], [210, 59, 6], [245, 59, 6], [250, 59, 6],
    [176, 56, 0], [206, 55, 1], [266, 57, 1],
    // terraces / cliffs / peak deco (gameplay regions, unchanged)
    [20, 69, 2], [125, 69, 2], [120, 69, 2], [190, 69, 2], [240, 69, 2],
    [86, 53, 0], [73, 50, 0], [78, 50, 1],
    [53, 25, 0], [46, 23, 1],
    [12, 11, 2], [16, 11, 1],
  ],
};

// ---------- ZONE 1: CAVE (MURK MARE) — RICH TEMPLATE ----------
// Full multi-tier cavern (rows 19-60), designed as the reusable rich-zone template:
// same geometry can reskin into other zones via palette/backdrop/boss-color swaps.
// Base-completable critical path (spawn→floor corridor→MURK→home portal). Off the
// line: a base-climbable mid gallery (DJ chest on a ledge), a DJ-gated hidden pocket
// near the ceiling, and a DASH spike-lake reward past the boss. Reachability at every
// ability tier is enforced by tools/map-audit.mjs (RETURN + GATE + SPACING laws).
const Z1 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H],                      // envelope walls
    [3, 60, 274, 12],                                  // floor / undermass (rows 60-71)
    [3, 0, 274, 14],                                   // cavern ceiling mass (rows 0-13)
    // floor hazards — flush spike strips (base-jumpable, drift <=5) + DASH spike-lake
    [86, 60, 3, 1, 3], [132, 60, 3, 1, 3],
    [236, 60, 8, 1, 3],                                // DASH lake (8 wide) → east reward shelf
    // CLIMB A (x50-72) — zig-zag rungs, floor row 59 → mid gallery row 43 (base, rise 2)
    [50, 57, 3, 1, 2], [55, 55, 3, 1, 2], [60, 53, 3, 1, 2], [65, 51, 3, 1, 2], [70, 49, 3, 1, 2],
    [65, 47, 3, 1, 2], [60, 45, 3, 1, 2], [56, 43, 5, 1, 2],
    // MID GALLERY (rows 41-43, x56-120) — base-accessible high route, gaps 3 / rises 2
    [64, 43, 4, 1, 2], [71, 43, 4, 1, 2], [78, 41, 4, 1, 2], [85, 41, 4, 1, 2],
    [92, 43, 4, 1, 2], [99, 43, 4, 1, 2], [106, 41, 5, 1, 2], [114, 42, 6, 1],   // solid ledge → DJ chest 1
    // CLIMB B (x104-110) — gallery → hidden upper pocket (rises 3 = DJ-gated)
    [110, 38, 3, 1, 2], [104, 35, 3, 1, 2], [110, 32, 3, 1, 2], [104, 29, 3, 1, 2], [110, 26, 3, 1, 2],
    // HIDDEN POCKET (rows 19-25, x104-123) — roof block + floor shelf → hidden chest 2
    [104, 19, 20, 3], [110, 25, 8, 1, 2],
    // UPPER TRAVERSE (x122-153) — high route continuing east off the mid gallery: a parallel
    // exploration layer above the floor corridor (rises <=2 / gaps 3 = base-walkable).
    [122, 43, 4, 1, 2], [129, 44, 4, 1, 2], [136, 42, 4, 1, 2], [143, 44, 4, 1, 2], [150, 42, 4, 1, 2],
    // MID-CORRIDOR STEPS (x124-141) — low platforms over the floor spike strip, giving the
    // base path vertical texture between gallery and boss.
    [124, 55, 4, 1, 2], [138, 54, 4, 1, 2],
    // BOSS ARENA (x150-212) — floating combat platforms (aerial verticality), MURK on floor
    [158, 55, 6, 1, 2], [172, 51, 5, 1, 2], [184, 48, 5, 1, 2], [196, 51, 5, 1, 2], [206, 55, 6, 1, 2],
    // HIGH EAST LEDGE (x198-209) — upper platforms above the boss arena east side (verticality).
    [198, 44, 4, 1, 2], [206, 46, 4, 1, 2],
    // EAST APPROACH (x214-231) — stepping stones bridging the boss arena toward the DASH lake
    // (still dash-gated: the 8-wide lake past x235 needs a dash launch off the floor).
    [214, 55, 4, 1, 2], [221, 52, 5, 1, 2], [228, 55, 4, 1, 2],
  ],
  fires: [[45, 59.5]],
  bosses: [[185, 59]],
  chests: [
    [18, 59.3],     // 0 base   — west floor discovery
    [117, 41.3],    // 1 DJ     — mid-gallery solid ledge
    [113, 24.3],    // 2 hidden — upper pocket near the ceiling (DJ climb)
    [258, 59.3],    // 3 DASH   — east shelf across the spike-lake
  ],
  foes: [[60, 58, 1], [100, 58, 2], [130, 58, 6], [78, 40, 4], [172, 50, 3], [165, 58, 2], [210, 58, 5], [250, 58, 4], [136, 41, 5], [150, 41, 4], [221, 51, 6]],
  doors: [[35, 59, 0, 226, 68]],
  DECO: [
    [65, 59, 2], [125, 59, 3], [160, 59, 2], [200, 59, 2], [250, 59, 2],
    [114, 41, 3], [78, 40, 3], [113, 24, 3],
    [136, 41, 3], [150, 41, 2], [143, 43, 3], [206, 45, 2], [221, 51, 3],
  ],
};

// ---------- ZONE 2: CLIFFS (GALE MARE) ----------
// Sky arena — wind-swept cliff top. Return portal at west edge → Meadow canopy ledge.
// Tier-2, DJ-assumed critical path (hub portal is DJ-gated): spike pits are 4-5 wide
// (DJ gap-law limit), a rise-3 DJ climb reaches a high chest single-jump can't, and an
// 8-wide DASH spike-lake spur gates the far-east reward. Boss arena has floating combat
// platforms for aerial verticality. Home portal sits at spawn → no softlock.
const Z2 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 42, 274, 30],    // envelope + floor/undermass (rows 42-71)
    [30, 38, 5, 4],                                     // spawn ledge (home portal bookend)
    // Spike pit 1 (x64-67, 4 wide) — first hazard, DJ hop (gap 4 <= DJ limit)
    [64, 42, 4, 2, 0], [64, 43, 4, 1, 3],
    // DJ platform climb (x78-108) → high chest ledge row 30. Rise-3 steps = single-jump
    // can't clear (pre-ability rise <=2), so the climb genuinely requires double jump.
    [78, 39, 5, 1, 2], [86, 36, 4, 1, 2], [94, 33, 4, 1, 2], [102, 30, 7, 1],
    // Spike pit 2 (x120-124, 5 wide) — wider, at the DJ gap limit
    [120, 42, 5, 2, 0], [120, 43, 5, 1, 3],
    // Boss arena (x134-206) — floating one-way combat platforms (aerial verticality)
    [144, 37, 6, 1, 2], [166, 34, 5, 1, 2], [156, 30, 5, 1, 2], [188, 37, 5, 1, 2],
    // Dash spike-lake spur (x236-243, 8 wide) → far-east dash reward shelf (x244-276)
    [236, 42, 8, 2, 0], [236, 43, 8, 1, 3],
  ],
  fires: [[45, 41.5]],
  bosses: [[196, 41]],
  chests: [
    [56, 41.3],     // 0 base — west floor discovery
    [105, 29.3],    // 1 DJ   — top of the rise-3 climb (high reward)
    [220, 41.3],    // 2 base — east floor, past the boss
    [268, 41.3],    // 3 DASH — far-east shelf, across the 8-wide spike-lake
  ],
  foes: [[62, 40, 4], [90, 35, 5], [138, 40, 6], [166, 33, 3], [190, 40, 5], [212, 40, 6], [230, 40, 4]],
  doors: [[35, 41, 0, 56, 24]],
  DECO: [
    [50, 41, 2], [74, 41, 1], [115, 41, 6], [160, 41, 2],
    [205, 41, 1], [225, 41, 6], [255, 41, 2], [103, 29, 1],
  ],
};

// ---------- ZONE 3: PEAK (FROST MARE) ----------
// Icy plateau. Return portal at west edge → Meadow peak ledge. Tier-3, assumes SHOT+DJ
// (hub portal is SHOT-gated). Full enriched archetype: 2 spike crevasses, a DJ summit
// climb to a high chest, an ICE-CAVERN signature (rung shaft down to a hidden pocket
// chest, mirroring Meadow's cave pattern), a boss arena with 4 aerial platforms, and a
// SHOT-gated secret alcove behind cracked ice. Home portal at spawn → no softlock.
const Z3 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 32, 274, 40],    // envelope + floor/undermass (rows 32-71)
    [30, 28, 5, 4],                                     // spawn ledge (home portal bookend)
    // Spike crevasse 1 (x58-61, 4 wide) — DJ hop
    [58, 32, 4, 2, 0], [58, 33, 4, 1, 3],
    // DJ summit climb (x70-91) UP to a high summit ledge → summit chest (rise-3 = DJ-only)
    [70, 29, 5, 1, 2], [78, 26, 4, 1, 2], [86, 23, 6, 1],
    // ICE CHASM signature — a wide spike chasm crossed on floating ice platforms. The
    // west entry gap is 4 (DJ-gated, base can't fall in → no trap); the middle platform
    // is a jump higher, so its chest needs the 2nd jump.
    [102, 32, 20, 2, 0], [102, 33, 20, 1, 3],         // spike chasm (rows 32-33, x102-121)
    [106, 29, 3, 1, 2], [116, 29, 3, 1, 2],           // DJ side stepping platforms
    [111, 26, 3, 1, 2],                               // high middle platform → hidden chest
    // Spike crevasse 2 (x138-142, 5 wide) — DJ limit
    [138, 32, 5, 2, 0], [138, 33, 5, 1, 3],
    // Boss arena (x150-206) — 4 floating ice platforms (aerial verticality)
    [162, 28, 6, 1, 2], [180, 24, 5, 1, 2], [172, 20, 5, 1, 2], [196, 28, 5, 1, 2],
    // SHOT-gated secret alcove (east of boss) — cracked ice wall seals a bonus chest
    [232, 26, 1, 7, 4],                                // cracked ice wall (rows 26-32, shot/dash breaks)
    [233, 27, 12, 5, 0], [233, 26, 12, 1],             // alcove (rows 27-31) + ceiling (row 26)
    [245, 27, 1, 5],                                   // east seal → only entry is through the cracked wall
  ],
  fires: [[45, 31.5]],
  bosses: [[200, 31]],
  chests: [
    [56, 31.3],     // 0 base   — west floor discovery
    [89, 22.3],     // 1 DJ     — atop the summit climb
    [112, 25.3],    // 2 hidden — high middle platform mid-chasm (DJ)
    [239, 31.3],    // 3 SHOT   — secret alcove behind cracked ice
  ],
  foes: [[62, 30, 4], [88, 22, 3], [130, 30, 6], [172, 19, 3], [190, 30, 4], [210, 30, 6], [225, 30, 4]],
  doors: [[35, 31, 0, 14, 10]],
  DECO: [
    [50, 31, 5], [76, 31, 2], [130, 31, 5], [160, 31, 5],
    [212, 31, 5], [250, 31, 2], [89, 22, 5], [112, 25, 5],
  ],
};

// ---------- ZONE 4: DEPTHS (DARK MARE, final boss) ----------
// Corrupted arena. Return portal at west edge → Meadow deep corridor.
const Z4 = {
  MAP: [
    [0, 0, 3, H], [277, 0, 3, H], [3, 60, 274, 12],    // envelope + floor/undermass (rows 60-71)
    [30, 56, 5, 4],                                     // spawn ledge (home portal bookend)
    // Spike crevasse 1 (x58-62, 5 wide) — DJ hop
    [58, 60, 5, 2, 0], [58, 61, 5, 1, 3],
    // DJ summit climb (x70-91) UP to a high summit ledge → summit chest (rise-3 = DJ-only)
    [70, 57, 5, 1, 2], [78, 54, 4, 1, 2], [86, 51, 6, 1],
    // ABYSS signature — a wide spike chasm (x102-119, 18) crossed by DASH. One middle
    // platform holds the hidden chest; both approach gaps are 7-8 wide (dash-only, DJ
    // falls short). Chasm bottom is spikes → a miss is death, never a stuck pocket.
    [102, 60, 18, 2, 0], [102, 61, 18, 1, 3],          // spike chasm rows 60-61
    [108, 57, 4, 1, 2],                                // middle dash platform → hidden chest
    // Spike crevasse 2 (x140-145, 6 wide) — widest DJ limit
    [140, 60, 6, 2, 0], [140, 61, 6, 1, 3],
    // Boss arena (x150-205) — 4 floating obsidian platforms (aerial verticality)
    [160, 56, 6, 1, 2], [178, 52, 5, 1, 2], [170, 48, 5, 1, 2], [194, 56, 5, 1, 2],
    // DASH spike-lake spur (x210-217, 8 wide) → east reward chest on the far ledge
    [210, 60, 8, 2, 0], [210, 61, 8, 1, 3],
  ],
  fires: [[45, 59.5]],
  bosses: [[185, 59]],                              // DARK MARE — arena center
  chests: [
    [50, 59.3],     // 0 base   — west floor discovery
    [89, 50.3],     // 1 DJ     — atop the summit climb
    [109, 56.3],    // 2 hidden — middle abyss platform (DASH)
    [223, 59.3],    // 3 DASH   — east ledge past the spike-lake
  ],
  foes: [[64, 58, 4], [88, 50, 3], [128, 58, 6], [170, 47, 3], [185, 58, 4], [200, 58, 6], [218, 58, 3]],
  doors: [[35, 59, 0, 55, 68]],
  DECO: [
    [50, 59, 4], [76, 59, 2], [128, 59, 4], [158, 59, 2],
    [204, 59, 4], [89, 50, 4], [109, 56, 2],
  ],
};

const ZONES = [Z0, Z1, Z2, Z3, Z4];

// Currently active zone data — live binding, importers see updates.
export let seeds = Z0;
export let DECO = Z0.DECO;

// PROCEDURAL FOLIAGE — zero data cost: scatter zone-appropriate deco along the main
// floor from a tiny per-zone config. "More detail" = tune a density number, not add
// array entries. FOL[z] = [1-in-N chance per column, ...deco types to pick from].
// Types: 0 tree 1 grass 2 rock 3 mushroom 4 dead-tree 5 ice 6 flower.
const FOL = [[3, 1, 1, 6, 1], [4, 3, 2, 3], [3, 1, 6, 1], [5, 5, 2, 5], [5, 2, 4, 2]];
// Ground-find: first solid/platform surface ROW at or below (tx, ty), skipping air/spikes.
// One shared "seat on the surface" rule — used by hand-placed deco snapping (loadZone) AND
// chest snapping (main.js), so a prop never floats when its seed y mismatches carved terrain.
export const groundRow = (tx, ty) => { for (let y = ty; y < H; y++) { const v = grid[y * W + tx]; if (v === 1 || v === 2) return y; } return H; };
const scatter = (zi) => {
  const [gap, ...ty] = FOL[zi], d = [];
  let s = zi * 2749 + 13, rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;   // deterministic per-zone
  for (let x = 5; x < W - 5; x++) {
    if (rnd() * gap >= 1) continue;                              // 1-in-gap column density
    let surf = -1;
    for (let y = 2; y < H; y++) if (grid[y * W + x] === 1 && grid[(y - 1) * W + x] === 0) surf = y;   // lowest exposed floor top (skips ceilings)
    if (surf > 0) d.push([x, surf - 1, ty[rnd() * ty.length | 0]]);
  }
  return d;
};

// Rebuild grid from a zone's MAP array, swap active seeds, merge hand-placed + scattered DECO. Returns zone index.
export const loadZone = (i) => {
  grid.fill(0);
  seeds = ZONES[i];
  for (const m of seeds.MAP) box(...m);
  DECO = seeds.DECO.map(([x, y, t]) => [x, groundRow(x, y + 1) - 1, t]).concat(scatter(i));   // snap hand-placed deco to surface, then procedural fill
  return i;
};

// Initial load — Zone 0 (Meadow hub) on module import.
loadZone(0);
