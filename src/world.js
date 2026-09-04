// world.js — UNICORN: unified single-map world.
// All CORN bosses live in one contiguous MEADOW; no portals, no zone transitions.
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
//                      the paddock campfire using M. ENFORCED BY tools/map-audit.mjs — the
//                      build FAILS if any stuck spot exists.
// L7 DEATH LAW       — spikes/void always hurt + return to last safe ground;
//                      death always respawns at the paddock (sole campfire; no checkpoints since 029aef5). (engine, main.js)
// ================================================================================
export const T = 16, W = 600, H = 160;
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---------- MEADOW (800×160 unified world, all CORN bosses) ----------
const MEADOW = {
  MAP: [
    // envelope — playable y=0-71 surface + optional pockets at y=72+ (underground extensions)
    [0, 0, 3, H], [W - 3, 0, 3, H],        // W-relative borders: whole world scales off W/H
    [3, 60, W - 6, 40],                    // ground + underground mass (rows 60-99, deep enough to seal void beneath surface + caverns)
    // Meadow surface (x158-277) — pits, platforms, DJ high route, stepped tower
    [155, 60, 3, 2, 0], [155, 61, 3, 1, 3],                      // early practice pit (base-crossable, teaches jumping post-paddock)
    [170, 60, 3, 2, 0], [170, 61, 3, 1, 3],
    [196, 60, 5, 2, 0], [196, 61, 5, 1, 3], [197, 59, 3, 1, 2],
    [233, 60, 3, 2, 0], [233, 61, 3, 1, 3],
    [251, 60, 3, 2, 0], [251, 61, 3, 1, 3],                      // RED arena moat — last committed jump before the first boss (base-crossable 3-wide)
    [258, 62, 14, 6, 0],                                         // RED LAIR — hidden chamber under the meadow (boss found, not stumbled into)
    [258, 60, 2, 2, 0],                                          // lair mouth — 2-wide drop hole right after the moat (jumpable = skippable)
    [258, 62, 3, 1, 2], [258, 64, 3, 1, 2], [258, 66, 3, 1, 2],  // return rungs under the mouth (cavern pattern: top rung at chamber top, hole overlap)
    [175, 57, 4, 1, 2], [181, 55, 4, 1, 2], [188, 57, 5, 1, 2],
    [205, 56, 4, 1, 2], [212, 54, 4, 1, 2], [220, 57, 6, 1, 2],
    [240, 56, 4, 1, 2], [247, 54, 4, 1, 2],
    [210, 51, 3, 1, 2], [218, 49, 3, 1, 2],   // DJ high route
    [262, 59, 3, 1], [265, 58, 3, 2], [268, 57, 3, 3], [271, 56, 3, 4],
    [274, 58, 3, 1, 2],
    // Central→East transition (x=280-287) — DJ climb bridging the flat zone
    [280, 57, 4, 1, 2], [286, 54, 4, 1, 2],                      // DJ platforms (rise 1 + rise 3 = DJ range)
    // Descent corridor (x150-256, subterranean pocket)
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
    // Peak TRI-JUMP secret — chest 8 above BLUE summit (rise 5 requires 3rd jump)
    [22, 8, 3, 1, 2], [26, 3, 5, 1, 2],   // DJ from summit y=12 to y=8, TRI from y=8 to y=3
    // Depths corridor (x10-139, deep west) — post-DASH route to VIOLET CORN
    [10, 64, 130, 6, 0],
    [108, 60, 3, 4, 0],
    [108, 62, 3, 1, 2], [108, 64, 3, 1, 2], [108, 66, 3, 1, 2], [108, 68, 3, 1, 2],
    [80, 69, 7, 1, 3],
    // Underground cavern — chest 9 pocket below depths corridor (walls/floor provided by deep ground band)
    [62, 70, 3, 2, 0],                                                                              // entry drop hole (y=70-71) through corridor floor into cavern
    [60, 72, 22, 10, 0],                                                                            // cavern chamber (y=72-81, w=22)
    [63, 80, 3, 1, 2], [63, 78, 3, 1, 2], [63, 76, 3, 1, 2], [63, 74, 3, 1, 2], [63, 72, 3, 1, 2],  // return rungs
    // Paddock DJ hub perch
    [124, 54, 4, 1, 2],
    // ---- East run (x280-476) — post-hub DJ/DASH/LONG DASH/TRI JUMP showcase ----
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
    [464, 53, 3, 1, 2], [460, 51, 4, 1, 2],        // ORANGE perch — two rise-2 zig hops above the walkway (single-jump legal, off the direct path)
    // ==== EAST GATE (x466-512) — bounce ridge: spring to a high chest ledge; DJ step route continues east ====
    [470, 60, 4, 2, 0], [470, 61, 4, 1, 3],        // spike pit just past ORANGE's walkway
    [477, 52, 6, 1, 2],                            // HIGH CHEST LEDGE — reachable only by bounce + double-jump
    [488, 57, 5, 1, 2], [496, 54, 6, 1, 2],        // onward DJ step route (eastward, seeds the next section)
    // ==== EAST SHELF (x514-562) — gap-crossing traversal + a mid chest; climbs toward E3 ====
    [518, 60, 4, 2, 0], [518, 61, 4, 1, 3],        // spike gap (DJ drift)
    [528, 56, 6, 1, 2],                            // mid platform rest — chest 5 perches here
    [540, 60, 5, 2, 0], [540, 61, 5, 1, 3],        // second spike gap (DJ drift)
    [550, 57, 6, 1, 2], [558, 53, 5, 1, 2],        // step up — seeds the E3 vertical climb
    // ==== EAST ASCENT (x560-620) — DJ zig-zag climb (from E2's row53 step) to the GREEN summit + a ground bounce side chest ====
    [564, 49, 5, 1, 2], [560, 45, 5, 1, 2],        // zig up (DJ, rise 4)
    [566, 41, 5, 1, 2], [562, 37, 6, 1, 2],        // continue up — chest 6 on the 562 ledge
    [568, 33, 8, 1],                               // solid summit landing (seeds E4 GREEN CORN)
    [572, 52, 5, 1, 2],                            // ground bounce side ledge — chest 7 (bounce + DJ)
  ],
  fires: [[132.5, 59.5]],
  bounce: [[158, 59], [480, 59], [575, 59], [243, 59], [389, 59], [75, 81], [536, 59], [394, 42]],   // BOUNCE MUSHROOMS — spring pads; launch keeps pl.air=0 so DJ/TRI stack at apex
  bosses: [                              // All CORN bosses live in the unified MEADOW; bi picks the rainbow band
    [263, 66, 0],   // RED    — hidden lair under the meadow (drop hole @x258, behind the moat)
    [461, 50, 1],   // ORANGE — perch above the east walkway (zig hops via x464 rung)
    [56, 25, 2],    // YELLOW — canopy ledge (DJ-tier)
    [18, 11, 3],    // BLUE   — peak ledge east edge (DJ-tier)
    [35, 68, 4],    // VIOLET — depths corridor west (DASH-tier)
    [570, 32, 5],   // GREEN  — east summit (E3 ascent climax)
    [70, 80, 6],    // INDIGO — underground cavern (DASH-tier, hop+shockwave phase-2)
  ],
  chests: [
    [181, 68.3],    // 0 — descent corridor west (base tier discovery)
    [219.5, 48.3],  // 1 — high route platform (DJ-gated reward)
    [59, 25.3],     // 2 — canopy crest (near YELLOW CORN)
    [12, 11.3],     // 3 — peak ledge (DJ summit reward)
    [479.5, 51.3],  // 4 — EAST GATE bounce ledge (bounce + DJ gated)
    [530.5, 55.3],  // 5 — EAST SHELF mid platform (between spike gaps, DJ)
    [564, 36.3],    // 6 — EAST ASCENT climb summit reward (DJ zig-zag)
    [574, 51.3],    // 7 — EAST ASCENT bounce side ledge (bounce + DJ)
    [28, 2.3],      // 8 — peak TRI-JUMP secret (TRI gap from y=8 to y=3)
    [76, 81.3],     // 9 — underground cavern (via depths corridor + drop)
    [248, 53.3],    // 10 — meadow DJ platform (x247 ledge, upper hop reward)
    [272, 55.3],    // 11 — stepped tower top (base-tier climb reward)
    [20, 69.3],     // 12 — depths corridor west end — fight PAST VIOLET to claim
    [226, 62.3],    // 13 — descent corridor mid ledge (x224 solid shelf)
    [320, 47.3],    // 14 — east terrace climb top (DJ walkway x315)
    [400, 37.3],    // 15 — stack upper landing (bounce pad on top rung + DJ)
    [453, 54.3],    // 16 — east stepped tower top, ORANGE approach
    [125, 53.3],    // 17 — paddock hub perch (dash-tier return reward near spawn)
    [54, 44.3],     // 18 — western terrace summit (canopy climb base reward)
    [552, 56.3],    // 19 — EAST SHELF step ledge past 2nd spike gap
  ],
  foes: [
    [148, 58, 1], [160, 58, 4],                                  // paddock-approach patrol (near practice pit)
    [174, 58, 1], [186, 58, 1], [206, 54, 4], [216, 58, 2], [230, 58, 2], [245, 58, 2], [240, 58, 3], [248, 58, 5],
    [282, 56, 1], [288, 53, 4],                                  // transition zone — crawler on lower DJ platform, runner on higher
    [180, 66, 1], [200, 68, 2], [225, 66, 6], [248, 68, 3], [190, 68, 5],
    [92, 52, 1], [78, 49, 2], [86, 53, 5], [62, 40, 1], [95, 37, 4],   // canopy zig-zag — extra crawler + runner
    [75, 35, 2],
    [34, 19, 6],
    [125, 68, 3], [115, 68, 4], [98, 68, 6],
    [24, 1, 1], [30, 1, 4],                                      // peak TRI-JUMP secret — crawler + runner guarding chest 8
    [490, 56, 2], [500, 53, 1],                                  // EAST GATE — blob on step, crawler on upper ledge
    [532, 55, 2], [545, 58, 2],                                  // EAST SHELF — blob guarding chest, blob by the gap
    [560, 44, 4], [578, 58, 2], [566, 30, 3],                    // EAST ASCENT — runner on climb, blob on ground, caster on GREEN summit
    [350, 56, 4], [393, 50, 1], [444, 57, 2],                    // EAST RUN fill — runner on x345 walkway, crawler on stack rung, chase-blob at tower base (ORANGE escort)
  ],
  DECO: [],   // SPIKE: hand-placed removed — all decoration now via scatter()
};

export const seeds = MEADOW;

// Ground-find: first solid/platform surface ROW at or below (tx, ty), skipping air/spikes.
// One shared "seat on the surface" rule — used by hand-placed deco snapping AND
// chest snapping (main.js), so a prop never floats when its seed y mismatches carved terrain.
export const groundRow = (tx, ty) => { for (let y = ty; y < H; y++) { const v = grid[y * W + tx]; if (v === 1 || v === 2) return y; } return H; };

// PROCEDURAL FOLIAGE — LAYERED scatter along every exposed floor top. Deterministic (seeded LCG).
// Composition rules (see research: blue-noise/Poisson-disk, size-class layering, clump-don't-sprinkle):
//   TREES  — per-row cooldown = 1D Poisson-disk: min 7-col spacing, so anchors never crowd.
//            Species banded by x>>4 → 16-col GROVES of one kind (pine stands / oak stands, never mixed adjacents).
//   GROUND — grass/flower runs of 1-3 consecutive columns (patches, not sprinkles), flowers ~30% of runs.
//   SINGLES — rocks/glow-mushrooms as rare loners (.06) for texture.
const scatter = () => {
  const d = [];
  let s = 13, rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const keep = [...seeds.chests, ...seeds.foes, ...seeds.bosses, ...seeds.fires, ...(seeds.bounce || []), ...seeds.DECO];
  const tc = {}, run = {}, rt = {};                              // per-row: tree cooldown, active run length, run type
  for (let x = 5; x < W - 5; x++) {
    if (keep.some(p => p && Math.abs(p[0] - x) < 2)) continue;   // keepout: skip cols near critical objects
    for (let y = 2; y < H; y++) {
      const v = grid[y * W + x];
      if ((v !== 1 && v !== 2) || grid[(y - 1) * W + x] !== 0) continue;    // exposed floor tops: solid ground AND one-way platform rungs
      if (run[y] > 0) { run[y]--; d.push([x, y - 1, rt[y]]); }                                    // continue a ground-cover patch
      else if (v === 1 && x >= (tc[y] || 0) && rnd() < .2) { d.push([x, y - 1, (x >> 4) % 2 ? 5 : 0]); tc[y] = x + 7; }   // tree anchor (blue-noise spacing, grove species) — SOLID ground only; no trees on thin rungs (landing readability)
      else if (rnd() < .35) { rt[y] = rnd() < .3 ? 6 : 1; run[y] = 1 + rnd() * 3 | 0; d.push([x, y - 1, rt[y]]); }   // start a patch (runs 2-4 long)
      else if (rnd() < .09) d.push([x, y - 1, rnd() < .5 ? 2 : 3]);                               // lone rock / mushroom
    }
  }
  return d;
};

// Module-init: paint MEADOW grid + merge hand-placed decor (snapped to surface) with scatter fill.
for (const m of seeds.MAP) box(...m);
export const DECO = seeds.DECO.map(([x, y, t]) => [x, groundRow(x, y + 1) - 1, t]).concat(scatter());
// BOUNCE pads snapped to their solid landing row: [col, solidRow]. Player stands at solidRow-1.
export const BOUNCE = seeds.bounce.map(([x, y]) => [x, groundRow(x, y + 1)]);
