// world.js — UNICORN: unified single-map world (COMPACT 3-BAND REBUILD, batch 35).
// One contiguous world (no portals / level-loads), x-banded into palette ZONES (see ZB in data.js).
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes.

// ============================ MAP MODEL (Joe, locked 2026-09-11; COMPACT B36 shallow caves + centered spawn) ============================
// THREE STACKED BANDS, no wasted space, built around the measured jump envelope:
//   SKY   rows 1-17  — drop-through platform climbs (always returnable by dropping).
//   GROUND rows 18-23 — solid walkable band, UNIFORM GROUND_H=6 thick (= 6× a platform).
//                       Surface-top = row SR(18), full width = the traversal highway. Spawn centered at tile 240.
//   CAVES rows 24-27 — built-from-AIR: SINGLE-LEVEL chambers (floor r28) + drop-shafts through the band.
//                       Depth 10t from surface (was 13-21t). TWO exit shafts per wide chamber; return rungs 3t apart.
//   Row 29 = floor seal (catches every fall → RETURN LAW).
// JUMP ENVELOPE (JV=280,GV=900,bounce=-510): single 2.7t · double 5.4t · triple ~8t (safe 6t) ·
//   mushroom 9t · mushroom+triple 14.5t = CEILING. Cave rungs kept <=3t (well inside double-jump = forgiving climb-out).
// LAWS: L1 spikes always FLUSH ([x,SR,w,1,3], solid beneath, hop-over). L2 every shaft has
//   return rungs every <=5t. L3 ceiling clearance >=2t over anything you jump. L4 RETURN LAW —
//   every standable cell reaches the paddock (build FAILS on any stuck spot). L5 DEATH LAW —
//   spikes hurt + return to safe ground; floor seal walls the bottom; death respawns at paddock.
// ============================================================================================
export const T = 16, W = 480, H = 30;
export const GROUND_H = 6, SR = 18;                 // walkable ground band thickness + surface-top row
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---------- MEADOW (480×30 compact 3-band world, all CORN bosses) ---------
const MEADOW = {
  MAP: [
    // ===== SPINE (full width) — the 3-band skeleton =====
    [0, 0, 3, H], [W - 3, 0, 3, H],        // borders (scale off W/H)
    [3, 18, W - 6, 6],                      // GROUND BAND — solid rows 18-23 (GROUND_H), surface-top row 18, full width = highway
    [3, 29, W - 6, 1],                      // FLOOR SEAL — row 29 (caves are air rows 24-27, floor r28; this catches every fall)
    // ---- SURFACE HAZARDS — flush spikes ([x,18,w,1,3]), solid beneath, hop-over (uniform) ----
    [220, 18, 3, 1, 3], [260, 18, 3, 1, 3],                      // PADDOCK PALE — flank the CENTERED safe zone (pocket x223-259, spawn x240 + GREATCORN x245). Wandering foes edge-turn at spikes → can't enter; player hops out (teaches the first jump). Death respawns clean.
    [56, 18, 3, 1, 3], [144, 18, 3, 1, 3], [200, 18, 3, 1, 3],   // canopy · meadow · RED moat (last jump before b0)
    [268, 18, 3, 1, 3], [292, 18, 3, 1, 3], [368, 18, 3, 1, 3],  // eastrun · ORANGE moat (before b1) · eastrun

    // ===== WEST SKY — PEAK climb (x6-30): surface → c3 → TRI-secret c8 =====
    [8, 15, 5, 1, 2], [14, 12, 5, 1, 2], [8, 9, 5, 1, 2], [14, 6, 5, 1, 2],   // zig-zag ladder (rises 3, DJ-safe)
    [8, 4, 6, 1, 2],                       // PEAK ledge — chest 3
    [18, 1, 6, 1, 2],                      // PEAK TRI-secret ledge — chest 8 (rise 3 from row4)
    // ===== WEST SKY — CANOPY climb (x36-52): surface → c18 → YELLOW boss b2 + c2 =====
    [38, 15, 6, 1, 2], [44, 11, 6, 1, 2],  // c18 terrace (rise 3, 4)
    [40, 7, 8, 1, 2],                      // CANOPY crest — YELLOW boss b2 + chest 2 (rise 4)

    // ===== WEST-MEADOW FILL (x60-170): rolling DJ-from-surface route across the old bare stretch + 2 bounce-perches =====
    [66, 15, 6, 1, 2], [80, 13, 5, 1, 2], [98, 15, 6, 1, 2], [112, 14, 5, 1, 2],   // low route (rows 13-15, each DJ-reachable from the surface below)
    [126, 16, 5, 1, 2], [140, 14, 6, 1, 2], [154, 16, 5, 1, 2], [166, 13, 6, 1, 2],// continues; [126,16] doubles as the bounce-126 landing, [166,13] hands off to meadow-sky
    [88, 9, 6, 1, 2],                      // west-meadow high perch (via bounce 84/90, rise 8 = bounce+DJ)
    [130, 7, 8, 1, 2],                     // upper-meadow lookout (via bounce 126, rise 10 = bounce+TRI)

    // ===== MEADOW SKY (x172-238) =====
    [228, 15, 6, 1, 2],                    // paddock-west approach step (into the safe pocket, below chest 17)
    [238, 14, 6, 1, 2],                    // paddock perch — chest 17 (DJ from surface, above centered spawn x240)
    [172, 15, 6, 1, 2], [172, 12, 6, 1, 2],// meadow high route — chest 1
    [196, 14, 6, 1, 2],                    // meadow DJ platform — chest 10
    [214, 15, 6, 1, 2],                    // stepped tower top — chest 11

    // ===== EASTRUN SKY (x224-381) =====
    [252, 15, 6, 1, 2], [252, 12, 6, 1, 2],// east terrace climb — chest 14
    [262, 15, 6, 1, 2], [276, 13, 5, 1, 2], [290, 15, 6, 1, 2], [304, 14, 6, 1, 2], // eastrun-mid FILL (past ORANGE boss) — low savanna route
    [300, 9, 6, 1, 2],                     // eastrun-mid high perch (via bounce 296/311)
    [316, 15, 6, 1, 2], [316, 12, 6, 1, 2], [316, 9, 6, 1, 2], [316, 8, 6, 1, 2],   // vertical stack — chest 15 (top)
    [328, 15, 6, 1, 2], [342, 13, 5, 1, 2], [348, 10, 6, 1, 2],                     // eastrun-east FILL — route between the x316 stack and the x358 tower
    [358, 15, 6, 1, 2],                    // east stepped tower top — chest 16
    [366, 14, 6, 1, 2],                    // eastrun → summit transition step

    // ===== SUMMIT SKY (x381-477): GREEN climax — b5 + chests 4,5,6,7,19 =====
    [380, 15, 6, 1, 2], [380, 13, 6, 1, 2],// east gate ledge — chest 4
    [420, 15, 6, 1, 2],                    // summit approach — chest 5
    [438, 16, 6, 1, 2],                    // summit low ledge — chest 19
    [444, 15, 6, 1, 2], [450, 12, 6, 1, 2],// GREEN summit ladder (rises 3, 3)
    [446, 8, 14, 1, 2],                    // GREEN SUMMIT landing — INDIGO boss b5 + chest 6 (rise 4)
    [456, 13, 6, 1, 2],                    // summit bounce side ledge (chest 7 moved to spawn-cavern)

    // ===== DENSITY FILL — connective/mid-tier platforms so routes CHAIN (hop platform→platform, not up-and-drop) =====
    [58, 13, 5, 1, 2], [72, 11, 5, 1, 2], [104, 11, 5, 1, 2], [118, 9, 5, 1, 2], [146, 12, 5, 1, 2], [160, 10, 5, 1, 2],   // WEST-MEADOW → climbable 3-tier route (surface→r13→r11→r8)
    [184, 11, 5, 1, 2], [206, 9, 6, 1, 2], [220, 12, 5, 1, 2],                                                             // MEADOW-east high route (over RED)
    [268, 11, 5, 1, 2], [284, 12, 5, 1, 2], [338, 12, 5, 1, 2],                                                            // EASTRUN mid-tier connectors
    [400, 12, 5, 1, 2], [412, 10, 5, 1, 2], [432, 10, 5, 1, 2], [464, 10, 5, 1, 2],                                        // SUMMIT approach — fuller GREEN climax

    // ===== UNDERGROUND — CONTINUOUS FULL-WIDTH CAVERN (mirrors the surface highway): floor r28, air rows 24-27, seal r29 =====
    // --- Continuous floor cols 6-476 (six joined rects): ONE walkable underground level, 100% width like the surface (was 39%) ---
    [6, 28, 62, 1, 1], [68, 28, 60, 1, 1], [128, 28, 58, 1, 1], [186, 28, 112, 1, 1], [298, 28, 64, 1, 1], [362, 28, 115, 1, 1],
    // --- 11 exit shafts (carve the ground band) + 3t return rungs [x-2, 25/22/19] — one every ~43t so you're never a long trek from a way up (easy-to-leave preserved) ---
    [30, 18, 3, 6, 0], [28, 25, 4, 1, 2], [28, 22, 4, 1, 2], [28, 19, 4, 1, 2],       // WEST main (VIOLET b4)
    [60, 18, 3, 6, 0], [58, 25, 4, 1, 2], [58, 22, 4, 1, 2], [58, 19, 4, 1, 2],       // WEST east (INDIGO b6 + chest 9; bounce [60,27] base = express)
    [100, 18, 3, 6, 0], [98, 25, 4, 1, 2], [98, 22, 4, 1, 2], [98, 19, 4, 1, 2],      // CONNECTOR — fills old dead x68-127
    [146, 18, 3, 6, 0], [144, 25, 4, 1, 2], [144, 22, 4, 1, 2], [144, 19, 4, 1, 2],   // CENTRAL main (chest 0)
    [172, 18, 3, 6, 0], [170, 25, 4, 1, 2], [170, 22, 4, 1, 2], [170, 19, 4, 1, 2],   // CENTRAL east (chest 13 ledge)
    [212, 18, 3, 6, 0], [210, 25, 4, 1, 2], [210, 22, 4, 1, 2], [210, 19, 4, 1, 2],   // SPAWN-CAVERN west (bounce [212,27] base; sited WEST of the paddock pocket)
    [276, 18, 3, 6, 0], [274, 25, 4, 1, 2], [274, 22, 4, 1, 2], [274, 19, 4, 1, 2],   // SPAWN-CAVERN east (EAST of the pocket — pocket surface x223-259 stays solid/safe)
    [330, 18, 3, 6, 0], [328, 25, 4, 1, 2], [328, 22, 4, 1, 2], [328, 19, 4, 1, 2],   // EAST main (cave foes)
    [352, 18, 3, 6, 0], [350, 25, 4, 1, 2], [350, 22, 4, 1, 2], [350, 19, 4, 1, 2],   // EAST east
    [400, 18, 3, 6, 0], [398, 25, 4, 1, 2], [398, 22, 4, 1, 2], [398, 19, 4, 1, 2],   // SUMMIT-CAVERN west (bounce [400,27] base) — fills old dead x362-476
    [444, 18, 3, 6, 0], [442, 25, 4, 1, 2], [442, 22, 4, 1, 2], [442, 19, 4, 1, 2],   // SUMMIT-CAVERN east
    // --- Interior development: drop-through ledges (rows 25-26, DJ-from-floor, return-by-drop) — platforming through every chamber, matching the surface's density ---
    [16, 25, 6, 1, 2], [44, 26, 6, 1, 2],                                             // WEST
    [72, 26, 6, 1, 2], [88, 25, 6, 1, 2], [110, 26, 6, 1, 2], [120, 25, 5, 1, 2],     // CONNECTOR
    [134, 26, 6, 1, 2], [158, 25, 6, 1, 2], [176, 25, 8, 1, 2],                       // CENTRAL (176 ledge = chest 13)
    [190, 26, 6, 1, 2], [224, 25, 8, 1, 2], [244, 26, 8, 1, 2], [262, 25, 6, 1, 2], [286, 26, 6, 1, 2],  // SPAWN-CAVERN (under the paddock)
    [312, 25, 6, 1, 2], [326, 26, 6, 1, 2], [340, 25, 6, 1, 2],                       // EAST
    [370, 26, 6, 1, 2], [386, 25, 6, 1, 2], [410, 26, 8, 1, 2], [430, 25, 6, 1, 2], [456, 26, 8, 1, 2], [468, 25, 6, 1, 2],  // SUMMIT-CAVERN
    // DENSITY FILL (cave) — extra stepping ledges + high shelves so cave platforming chains too:
    [80, 25, 5, 1, 2], [104, 24, 5, 1, 2],                                            // CONNECTOR
    [204, 25, 5, 1, 2], [236, 24, 6, 1, 2], [252, 26, 5, 1, 2],                        // SPAWN-CAVERN (236 = high gallery under spawn)
    [376, 25, 5, 1, 2], [448, 24, 5, 1, 2],                                            // SUMMIT-CAVERN
  ],

  bounce: [[126, 17], [384, 17], [458, 17], [194, 17], [311, 17], [60, 27], [429, 17], [90, 17], [164, 17], [280, 17], [296, 17], [352, 17], [24, 17], [84, 17], [14, 17], [212, 27], [400, 27]],   // BOUNCE MUSHROOMS — spring pads (launch -510, keeps pl.air=0 so DJ/TRI stack at apex). >=1 per zone. Cave-floor express-exit pads at shaft bases: [60,27] west · [352,17]→snaps to east floor · [212,27] spawn-cavern · [400,27] summit-cavern. Relocated off centered spawn: was [240,17]→[90,17], [254,17]→[280,17].
  bosses: [                              // 7 CORN bosses; 3rd field bi picks the rainbow band + palette
    [206, 16, 0],   // RED — MEADOW-east surface (past the spike moat)
    [298, 16, 1],   // ORANGE — EASTRUN surface (past the spike moat)
    [45, 6, 2],     // YELLOW — CANOPY crest ledge (sky) — west mountain anchor
    [16, 16, 3],    // BLUE — PEAK surface (far-west base)
    [150, 26, 4],   // VIOLET — CENTRAL CAVE floor (r28) — spread out of the old west-cave cluster into the mid-map underground
    [454, 6, 5],    // GREEN — SUMMIT landing (sky climax) — far-right-top bookend
    [420, 26, 6],   // INDIGO — SUMMIT-CAVERN floor (r28) — spread to the far-east underground (was co-located west)
  ],
  chests: [
    [145, 28.3],    // 0  — central cave floor (r28, near VIOLET)
    [176, 12.3],    // 1  — meadow high route (DJ)
    [47, 7.3],      // 2  — canopy crest (near YELLOW)
    [10, 4.3],      // 3  — peak ledge (climb summit)
    [383, 13.3],    // 4  — east gate ledge
    [424, 15.3],    // 5  — summit approach
    [451, 8.3],     // 6  — GREEN summit landing
    [244, 28.3],    // 7  — SPAWN-CAVERN floor (r28) — moved from summit; treasure under the paddock
    [22, 1.3],      // 8  — peak TRI-secret (rise from row4)
    [416, 28.3],    // 9  — SUMMIT-CAVERN floor (r28) — moved; by INDIGO
    [198, 14.3],    // 10 — meadow DJ platform
    [318, 28.3],    // 11 — EAST-CAVE floor (r28) — moved from the meadow tower cluster
    [110, 28.3],    // 12 — CONNECTOR cave floor (r28) — moved from west cave
    [181, 25.3],    // 13 — central cave raised ledge (r25)
    [256, 12.3],    // 14 — east terrace climb top
    [320, 8.3],     // 15 — east vertical stack upper landing
    [362, 15.3],    // 16 — east stepped tower top
    [241, 14.3],    // 17 — paddock hub perch (above centered spawn x240)
    [100, 15.3],    // 18 — WEST-MEADOW platform — moved from canopy; payoff for the new route
    [442, 16.3],    // 19 — summit low ledge
  ],
  foes: [
    // SKY / CLIMB foes — ELEVATION RULE: gentle hop kinds only (k1/k4); traversal is the challenge.
    [10, 15, 1], [14, 12, 4], [8, 9, 1], [14, 6, 4],            // peak climb
    [38, 15, 1], [44, 11, 4],                                    // canopy climb
    [172, 15, 1], [196, 14, 4],                                  // meadow sky
    [252, 15, 1], [316, 12, 4],                                  // eastrun sky
    [446, 15, 1], [452, 12, 4],                                  // summit climb
    // SURFACE foes — flat ground carries the tough kinds (charge k3/k5, shoot k2/k6).
    [452, 17, 3], [464, 17, 2], [136, 17, 5], [150, 17, 6],
    [164, 17, 3], [178, 17, 2], [190, 17, 5], [218, 17, 6],
    [100, 17, 3], [112, 17, 2], [262, 17, 5], [274, 17, 6],     // 100/112 relocated out of the centered paddock pocket (x223-259) into the now-open west meadow
    [286, 17, 3], [308, 17, 2], [322, 17, 5], [336, 17, 6],
    [350, 17, 3], [364, 17, 2], [376, 17, 5], [392, 17, 6],
    [404, 17, 3], [416, 17, 2], [430, 17, 5], [442, 17, 6],
    [26, 17, 3], [34, 17, 2], [70, 17, 5], [48, 17, 6],
    [104, 10, 1], [206, 8, 4],                                   // lifted onto the new sky platforms (west-meadow high perch + meadow-east route over RED) — elevation rule: hop kinds only
  ],
  // FILL FOES — cave + surface fill. Held out of world.js ledge-grow (keeps LCG stable for scatter).
  // main.js seedFoes concatenates these into the live foe list. Total (foes+foesX) = 54 = 9 of each kind.
  foesX: [
    // Cave foes seat at floorRow-1 (r27) so gravity drops them ONTO the r28 floor — now SPREAD across all 6 cavern regions (was clustered W/C/E).
    [12, 27, 6],                                                // WEST cave
    [100, 27, 1],                                               // CONNECTOR cave (was west [46])
    [135, 27, 3],                                               // CENTRAL cave
    [230, 27, 2], [270, 27, 5],                                 // SPAWN-CAVERN (were west [40]/[66])
    [305, 27, 6], [345, 27, 2], [320, 27, 5],                   // EAST cave
    [410, 27, 4], [440, 27, 1],                                 // SUMMIT-CAVERN (were central [160]/east [335])
    [62, 17, 3], [400, 17, 4],                                  // surface fill (canopy west + eastrun)
  ],
};

export const seeds = MEADOW;

// Ground-find: first solid/platform surface ROW at or below (tx, ty), skipping air/spikes.
// One shared "seat on the surface" rule — used by chest snapping + bounce snapping (main.js).
export const groundRow = (tx, ty) => { for (let y = ty; y < H; y++) { const v = grid[y * W + tx]; if (v === 1 || v === 2) return y; } return H; };

// PROCEDURAL FOLIAGE v3 — LAYERED scatter (canon: Wei SIGGRAPH'10 multi-class blue noise ·
// Deussen SIGGRAPH'98 ecosystem shade · stratified quota cycles). Decorates exposed floor tops.
const Q = [1, 3, 6, 1, 3, 1, 6, 2];   // quota cycle (type ids: 1 grass · 6 flower · 3 shroom · 2 rock)
let seed = 13, rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;   // shared LCG: ledge growth + foliage
const scatter = () => {
  const d = [];
  const keep = [...seeds.chests, ...seeds.foes, ...seeds.bosses, ...(seeds.bounce || [])];
  const tc = {}, run = {}, qc = {}, sh = {};                     // per-row: tree cooldown, grass-run left, quota index, shade counter
  for (let x = 5; x < W - 5; x++) {
    if (keep.some(p => p && Math.abs(p[0] - x) < 2)) continue;   // keepout: skip cols near critical objects
    for (let y = 2; y < H; y++) {
      const v = grid[y * W + x];
      if ((v !== 1 && v !== 2) || grid[(y - 1) * W + x] !== 0) continue;    // exposed floor tops: solid ground AND one-way platform rungs
      if (run[y] > 0) { run[y]--; d.push([x, y - 1, 1]); }                                        // grass run continuation
      else if (v === 1 && x >= (tc[y] || 0) && rnd() < .2) { d.push([x, y - 1, 0]); tc[y] = x + 7; sh[y] = 3; }   // tree anchor — SOLID only; round TREE (dt0), opens a 3-slot shade zone
      else if (rnd() < .64) {
        let t = Q[(qc[y] = (qc[y] || 0) + 1) % 8];               // stratified: rotate the quota table
        if (sh[y] > 0 && t === 6) t = 3;                         // CANOPY: flower slot under shade → mushroom
        if (t === 1) run[y] = rnd() * 2 | 0;                     // grass may extend 0-2 extra cols
        d.push([x, y - 1, t]);
      }
      if (sh[y] > 0) sh[y]--;                                    // shade decays per ground slot
    }
  }
  return d;
};

// Module-init: paint MEADOW grid, grow combat ledges, scatter decor.
for (const m of seeds.MAP) box(...m);
// COMBAT LEDGES GROW — each foe/boss on a one-way (v=2) ledge widens it a seeded-random ±2-5
// tiles into open air (solid walls + spike pits preserved) → roomier fights, zero MAP data.
for (const [fx, fy] of [...seeds.foes, ...seeds.bosses]) {
  const r = groundRow(fx, fy), n = 2 + (rnd() * 4 | 0);
  if (grid[r * W + fx] === 2)                                          // only grow floating (v=2) ledges; solid arenas already roomy
    for (let c = fx - n; c <= fx + n; c++)
      if (grid[r * W + c] === 0 && grid[(r + 1) * W + c] !== 3) grid[r * W + c] = 2;   // air only; never over spikes
}
export const DECO = scatter();
// BOUNCE pads snapped to their solid landing row: [col, solidRow].
export const BOUNCE = seeds.bounce.map(([x, y]) => [x, groundRow(x, y + 1)]);
