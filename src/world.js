// world.js — UNICORN: unified single-map world (COMPACT 3-BAND REBUILD, batch 35).
// One contiguous world (no portals / level-loads), x-banded into palette ZONES (see ZB in data.js).
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes.

// ============================ MAP MODEL (Joe, locked 2026-09-11) ============================
// THREE STACKED BANDS, no wasted space, built around the measured jump envelope:
//   SKY   rows 1-17  — drop-through platform climbs (always returnable by dropping).
//   GROUND rows 18-23 — solid walkable band, UNIFORM GROUND_H=6 thick (= 6× a platform).
//                       Surface-top = row SR(18), full width = the traversal highway.
//   CAVES rows 24-40  — built-from-AIR: chambers/floors/rungs + drop-shafts through the band.
//   Row 41 = floor seal (catches every fall → RETURN LAW).
// JUMP ENVELOPE (JV=280,GV=900,bounce=-510): single 2.7t · double 5.4t · triple ~8t (safe 6t) ·
//   mushroom 9t · mushroom+triple 14.5t = CEILING. Ladder steps kept <=5t (double-jump safe).
// LAWS: L1 spikes always FLUSH ([x,SR,w,1,3], solid beneath, hop-over). L2 every shaft has
//   return rungs every <=5t. L3 ceiling clearance >=2t over anything you jump. L4 RETURN LAW —
//   every standable cell reaches the paddock (build FAILS on any stuck spot). L5 DEATH LAW —
//   spikes hurt + return to safe ground; floor seal walls the bottom; death respawns at paddock.
// ============================================================================================
export const T = 16, W = 480, H = 42;
export const GROUND_H = 6, SR = 18;                 // walkable ground band thickness + surface-top row
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---------- MEADOW (480×42 compact 3-band world, all CORN bosses) ---------
const MEADOW = {
  MAP: [
    // ===== SPINE (full width) — the 3-band skeleton =====
    [0, 0, 3, H], [W - 3, 0, 3, H],        // borders (scale off W/H)
    [3, 18, W - 6, 6],                      // GROUND BAND — solid rows 18-23 (GROUND_H), surface-top row 18, full width = highway
    [3, 41, W - 6, 1],                      // FLOOR SEAL — row 41 (caves are air rows 24-40; this catches every fall)
    // ---- SURFACE HAZARDS — flush spikes ([x,18,w,1,3]), solid beneath, hop-over (uniform) ----
    [78, 18, 3, 1, 3], [120, 18, 3, 1, 3],                       // PADDOCK PALE — flank the safe zone (pocket x81-119, spawn x101 + GREATCORN x106). Wandering foes edge-turn at spikes → can't enter; player hops out (teaches the first jump). Death respawns clean.
    [56, 18, 3, 1, 3], [144, 18, 3, 1, 3], [200, 18, 3, 1, 3],   // canopy · meadow · RED moat (last jump before b0)
    [268, 18, 3, 1, 3], [292, 18, 3, 1, 3], [368, 18, 3, 1, 3],  // eastrun · ORANGE moat (before b1) · eastrun

    // ===== WEST SKY — PEAK climb (x6-30): surface → c3 → TRI-secret c8 =====
    [8, 15, 5, 1, 2], [14, 12, 5, 1, 2], [8, 9, 5, 1, 2], [14, 6, 5, 1, 2],   // zig-zag ladder (rises 3, DJ-safe)
    [8, 4, 6, 1, 2],                       // PEAK ledge — chest 3
    [18, 1, 6, 1, 2],                      // PEAK TRI-secret ledge — chest 8 (rise 3 from row4)
    // ===== WEST SKY — CANOPY climb (x36-52): surface → c18 → YELLOW boss b2 + c2 =====
    [38, 15, 6, 1, 2], [44, 11, 6, 1, 2],  // c18 terrace (rise 3, 4)
    [40, 7, 8, 1, 2],                      // CANOPY crest — YELLOW boss b2 + chest 2 (rise 4)

    // ===== MEADOW SKY (x96-224) =====
    [98, 14, 6, 1, 2],                     // paddock perch — chest 17 (DJ from surface)
    [172, 15, 6, 1, 2], [172, 12, 6, 1, 2],// meadow high route — chest 1
    [196, 14, 6, 1, 2],                    // meadow DJ platform — chest 10
    [214, 15, 6, 1, 2],                    // stepped tower top — chest 11

    // ===== EASTRUN SKY (x224-381) =====
    [252, 15, 6, 1, 2], [252, 12, 6, 1, 2],// east terrace climb — chest 14
    [316, 15, 6, 1, 2], [316, 12, 6, 1, 2], [316, 9, 6, 1, 2], [316, 8, 6, 1, 2],   // vertical stack — chest 15 (top)
    [358, 15, 6, 1, 2],                    // east stepped tower top — chest 16

    // ===== SUMMIT SKY (x381-477): GREEN climax — b5 + chests 4,5,6,7,19 =====
    [380, 15, 6, 1, 2], [380, 13, 6, 1, 2],// east gate ledge — chest 4
    [420, 15, 6, 1, 2],                    // summit approach — chest 5
    [438, 16, 6, 1, 2],                    // summit low ledge — chest 19
    [444, 15, 6, 1, 2], [450, 12, 6, 1, 2],// GREEN summit ladder (rises 3, 3)
    [446, 8, 14, 1, 2],                    // GREEN SUMMIT landing — INDIGO boss b5 + chest 6 (rise 4)
    [456, 13, 6, 1, 2],                    // summit bounce side ledge — chest 7

    // ===== WEST CAVE SYSTEM (x6-70): drop-shaft x30 → VIOLET chamber (r31) → deep INDIGO (r39) =====
    [30, 18, 3, 6, 0],                     // entrance drop-shaft (carve through ground band)
    [28, 20, 4, 1, 2], [28, 24, 4, 1, 2], [28, 28, 4, 1, 2],   // shaft return rungs (<=5t)
    [6, 31, 62, 1, 1],                     // VIOLET chamber floor (r31) — b4 + chest 12
    [50, 31, 3, 1, 0],                     // drop-hole to deep chamber
    [44, 36, 4, 1, 2], [44, 32, 4, 1, 2],  // deep→upper return rungs
    [40, 39, 28, 1, 1],                    // deep INDIGO chamber floor (r39) — b6 + chest 9

    // ===== CENTRAL CAVE (x128-186): drop-shaft x146 → chamber (r31) + raised ledge c13 =====
    [146, 18, 3, 6, 0],                    // entrance drop-shaft
    [144, 20, 4, 1, 2], [144, 24, 4, 1, 2], [144, 28, 4, 1, 2],// shaft return rungs
    [128, 31, 58, 1, 1],                   // chamber floor (r31) — chest 0
    [176, 28, 8, 1, 2],                    // raised cave ledge — chest 13

    // ===== EAST CAVE (x298-362): NEW — fills the dead east underground (build-from-air) =====
    [330, 18, 3, 6, 0],                    // entrance drop-shaft
    [328, 20, 4, 1, 2], [328, 24, 4, 1, 2], [328, 28, 4, 1, 2],// shaft return rungs
    [298, 31, 64, 1, 1],                   // east chamber floor (r31) — cave foes
    [312, 27, 6, 1, 2], [340, 27, 6, 1, 2],// interior ledges (compartments / variety)
  ],

  bounce: [[126, 17], [384, 17], [458, 17], [194, 17], [311, 17], [60, 38], [429, 17], [240, 17], [164, 17], [254, 17], [296, 17], [352, 17], [24, 17], [84, 17], [14, 17]],   // BOUNCE MUSHROOMS — spring pads (launch -510, keeps pl.air=0 so DJ/TRI stack at apex). >=1 per zone; [60,38] deep cave.
  bosses: [                              // 7 CORN bosses; 3rd field bi picks the rainbow band + palette
    [206, 16, 0],   // RED — MEADOW-east flat past the spike moat (x200)
    [298, 16, 1],   // ORANGE — EASTRUN flat past the spike moat (x292)
    [45, 6, 2],     // YELLOW — CANOPY crest ledge (sky) — west mountain anchor
    [16, 16, 3],    // BLUE — WEST-BASE surface (paddock-west)
    [28, 29, 4],    // VIOLET — WEST CAVE upper chamber (r31 floor)
    [454, 6, 5],    // INDIGO — GREEN SUMMIT landing (sky climax) — far-right-top bookend
    [54, 37, 6],    // (deep) — deep INDIGO cavern chamber (r39 floor)
  ],
  chests: [
    [145, 31.3],    // 0  — central cave chamber floor
    [176, 12.3],    // 1  — meadow high route (DJ)
    [47, 7.3],      // 2  — canopy crest (near YELLOW)
    [10, 4.3],      // 3  — peak ledge (climb summit)
    [383, 13.3],    // 4  — east gate ledge
    [424, 15.3],    // 5  — summit approach
    [451, 8.3],     // 6  — GREEN summit landing (near INDIGO b5)
    [459, 13.3],    // 7  — summit bounce side ledge
    [22, 1.3],      // 8  — peak TRI-secret (rise from row4)
    [61, 39.3],     // 9  — deep cavern floor
    [198, 14.3],    // 10 — meadow DJ platform
    [218, 15.3],    // 11 — stepped tower top
    [16, 31.3],     // 12 — west cave upper chamber (past VIOLET)
    [181, 28.3],    // 13 — central cave raised ledge
    [256, 12.3],    // 14 — east terrace climb top
    [320, 8.3],     // 15 — east vertical stack upper landing
    [362, 15.3],    // 16 — east stepped tower top
    [101, 14.3],    // 17 — paddock hub perch (near spawn)
    [43, 11.3],     // 18 — canopy terrace
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
    [230, 17, 3], [242, 17, 2], [262, 17, 5], [274, 17, 6],
    [286, 17, 3], [308, 17, 2], [322, 17, 5], [336, 17, 6],
    [350, 17, 3], [364, 17, 2], [376, 17, 5], [392, 17, 6],
    [404, 17, 3], [416, 17, 2], [430, 17, 5], [442, 17, 6],
    [26, 17, 3], [34, 17, 2], [70, 17, 5], [48, 17, 6],
    [130, 17, 1], [214, 17, 4],                                  // x130 = paddock-approach (first foe east of the safe zone)
  ],
  // FILL FOES — cave + surface fill. Held out of world.js ledge-grow (keeps LCG stable for scatter).
  // main.js seedFoes concatenates these into the live foe list. Total (foes+foesX) = 54 = 9 of each kind.
  foesX: [
    [12, 30, 6], [40, 30, 2], [66, 38, 5], [46, 38, 1],         // WEST cave — floorRow-1 (VIOLET r31 floor + deep r39): foes spawn ONE row above the floor so gravity seats them ON it (spawning AT the floor row falls through to the seal).
    [135, 30, 3], [160, 30, 4],                                 // CENTRAL cave (r31 floor)
    [305, 30, 6], [345, 30, 2], [320, 30, 5], [335, 30, 1],     // EAST cave (new, r31 floor)
    [62, 17, 3], [400, 17, 4],                                  // surface fill (canopy west + eastrun) — cleared out of the paddock safe zone
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
