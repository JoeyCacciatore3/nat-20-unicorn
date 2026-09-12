// world.js — UNICORN: unified single-map world (FUNCTIONAL REBUILD, batch 38 — spine-and-loop).
// One contiguous world (no portals / level-loads), x-banded into palette ZONES (see ZB in data.js).
// Tiles: 0 air, 1 solid, 2 one-way platform, 3 spikes.

// ============================ MAP MODEL (Joe, locked 2026-09-12; SPINE-AND-LOOP functional rebuild) ============================
// DESIGN PLAN: proj map-design (spine-and-loop, spawn HUB, difficulty ramps outward, sectioned pacing).
// Replaces the B36 "scatter" map (uniform density + continuous flat cavern = no pacing/topology).
//
// SPINE (surface, the readable through-line): GROUND band rows 18-23 (solid highway). SPAWN is the HUB
//   at CENTER (tile 240, safe paddock). The world reads OUTWARD both ways; DIFFICULTY RAMPS with distance
//   from the hub (gentle near spawn → hardest at the far edges PEAK/SUMMIT).
// UNDERGROUND rows 24-32 = SEALED ROCK (air, reachable ONLY through cave-spoke shafts — NOT a 2nd highway).
//   Row 33 = FLOOR SEAL (catches every spoke fall → RETURN LAW).
// CAVE SPOKES = discrete VERTICAL DUNGEONS: drop-shaft in → descend → boss/treasure at the bottom →
//   return-rung climb LOOPS back UP to the surface at a NEW x (tension down, release up, progress sideways).
// ZONES (7 bosses): WEST arm hub→MEADOW(RED)→CANOPY(YELLOW)→PEAK(BLUE); EAST arm hub→EASTRUN(ORANGE)→SUMMIT(GREEN);
//   underground VIOLET (shallow spoke) + INDIGO (deep spoke). Each zone has a distinct SHAPE (climb / arena / gauntlet).
// PACING: REST before every boss; no two gauntlet/arena sections adjacent; foes CLUSTER at arenas/gauntlets,
//   NONE in the hub/rests. Chests reward EFFORT (climb-tops, off-spine alcoves, spoke bottoms) — never on flat spine.
// JUMP ENVELOPE (JV=280,GV=900,bounce=-510): authored on the DJ envelope (rise<=4, gap<=7 = forgiving);
//   TRI (rise<=6, gap<=10) + bounce (+4 rise) reserved for secrets/rewards.
// LAWS: L1 spikes FLUSH ([x,18,w,1,3], solid beneath, hop-over). L2 shafts have return rungs <=4t apart.
//   L4 RETURN LAW — every standable cell reaches the paddock (build FAILS on any stuck spot). L5 DEATH LAW.
// ============================================================================================
export const T = 16, W = 480, H = 34;
export const GROUND_H = 6, SR = 18;                 // walkable ground band thickness + surface-top row
export const grid = new Uint8Array(W * H);
export const tile = (tx, ty) => (tx < 0 || tx >= W || ty >= H) ? 1 : ty < 0 ? 0 : grid[ty * W + tx];

const box = (x, y, w, h, v = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = v; };

// ---------- MEADOW (480×34 spine-and-loop world, all CORN bosses) ---------
const MEADOW = {
  MAP: [
    // ===== SPINE — 3-band skeleton =====
    [0, 0, 3, H], [W - 3, 0, 3, H],        // borders (scale off W/H)
    [3, 18, W - 6, 6],                      // GROUND BAND rows 18-23 (surface highway). Underground = sealed rock, reachable only via spoke shafts.
    [3, 33, W - 6, 1],                      // FLOOR SEAL row 33 (catches every spoke fall → RETURN LAW)
    // ---- SURFACE SPIKES (flush [x,18,w,1,3], solid beneath, hop-over) — at section edges as teach/moat, never scattered ----
    [220, 18, 3, 1, 3], [260, 18, 3, 1, 3],                      // HUB paddock pale — flank the safe pocket (x223-259, spawn 240 + GREATCORN 245). Foes edge-turn at spikes; player hops out (teaches the first jump).
    [200, 18, 3, 1, 3],                                          // RED moat (last hop into the arena)
    [292, 18, 3, 1, 3],                                          // ORANGE moat
    [312, 18, 4, 1, 3], [324, 18, 4, 1, 3], [336, 18, 4, 1, 3],  // EASTRUN PIT-GAUNTLET — spike-hop run (the "test")
    [56, 18, 3, 1, 3],                                           // CANOPY arena moat

    // ============ WEST ARM (hub → PEAK: gentle → hardest) ============
    // --- MEADOW (t90-224): RED arena [TEACH] + open REST + 2 treasure alcoves + combat perch ---
    // Deliberate structure: arena perch (climb), two alcoves ALIGNED at r12 fed by one r15 rest step, a 2-tier high-route stack, RED approach.
    [104, 13, 6, 1, 2], [116, 15, 6, 1, 2],// MEADOW combat-arena perch — chest 18 (climb reward) + r15 step
    [132, 12, 6, 1, 2], [152, 12, 6, 1, 2],// treasure alcoves B/A — chests 10 & 9 (aligned at r12, clearly above the rest route)
    [142, 15, 6, 1, 2],                    // rest step — r15 hub feeding both alcoves (rise 3 each side)
    [172, 14, 6, 1, 2], [172, 11, 6, 1, 2],// meadow high-route — chest 1 (aligned 2-tier stack)
    [196, 14, 6, 1, 2],                    // RED-approach step
    // --- CANOPY (t38-56): VERT_CLIMB → YELLOW crest [TWIST] ---
    [38, 15, 6, 1, 2], [44, 11, 6, 1, 2],  // canopy terrace (rise 3, 4)
    [40, 7, 9, 1, 2],                      // CANOPY crest — YELLOW boss b2 + chest 2 (rise 4)
    // --- PEAK (t8-24): tight VERT_CLIMB → BLUE + TRI-secret (hardest-west) ---
    [8, 15, 5, 1, 2], [14, 12, 5, 1, 2], [8, 9, 5, 1, 2], [14, 6, 5, 1, 2],   // zigzag ladder (rise 3 each, DJ-safe)
    [8, 4, 6, 1, 2],                       // PEAK ledge — chest 3
    [18, 1, 6, 1, 2],                      // PEAK TRI-secret ledge — chest 8 (rise 3 from row4)

    // ============ EAST ARM (hub → SUMMIT: gentle → hardest) ============
    // --- HUB (t224-260): safe paddock, ZERO foes — the release node you always return to ---
    [228, 15, 6, 1, 2],                    // paddock-west approach step
    [238, 14, 6, 1, 2],                    // paddock perch — chest 17 (DJ from surface, above centered spawn x240)
    // --- EASTRUN (t260-340): ORANGE arena [TEACH] → PIT_GAUNTLET [TEST] ---
    [268, 14, 6, 1, 2],                    // intro sky step — chest 14
    [282, 14, 6, 1, 2],                    // ORANGE-approach step (aligned r14)
    [300, 14, 6, 1, 2], [312, 12, 6, 1, 2], [324, 12, 6, 1, 2], [336, 14, 6, 1, 2],   // pit-gauntlet OVERHEAD sky route — even gap-7 symmetric arc (r14→r12→r12→r14) over the 3-spike pit
    [316, 8, 6, 1, 2],                     // gauntlet high reward — chest 11 (bounce + jump)
    // --- SUMMIT (t356-476): VERT_CLIMB [TWIST] → GREEN boss climax — a clean ascending STAIRCASE to the summit ---
    [356, 14, 6, 1, 2], [366, 14, 6, 1, 2],// east tower top (chest 16) + eastrun→summit transition (aligned r14)
    [384, 15, 6, 1, 2], [384, 12, 6, 1, 2],// summit gate — chest 4 (aligned 2-tier stack)
    [396, 15, 6, 1, 2], [408, 13, 6, 1, 2], [420, 11, 6, 1, 2], [432, 9, 6, 1, 2],   // summit STAIRCASE — even rise-2/gap-7 steps (chests 19, 13, 5) rising to the landing
    [443, 7, 17, 1, 2],                    // GREEN SUMMIT landing — GREEN boss b5 + chest 6 (wide climax platform, fed directly by the staircase top)
    [460, 9, 6, 1, 2],                     // summit crown ledge — chest 15 (beside the landing)

    // ============ CAVE SPOKES (discrete vertical dungeons; each LOOPS back to the surface at a NEW x) ============
    // --- VIOLET spoke: enter drop-shaft t140 → descend → VIOLET arena (floor r28) → climb-loop exits at t150 ---
    [140, 18, 3, 6, 0],                    // entry drop-shaft (carve the ground band)
    [136, 25, 5, 1, 2],                    // descent catch ledge (staged, not a straight plummet)
    [124, 28, 30, 1, 1],                   // VIOLET chamber floor (cols 124-153) — VIOLET boss b4 + chest 0
    [150, 18, 3, 6, 0],                    // exit climb-shaft (loops UP at a new x)
    [148, 25, 4, 1, 2], [148, 22, 4, 1, 2], [148, 19, 4, 1, 2],   // return rungs (rise 3 each: floor r28 → surface)
    // --- CENTRAL secret spoke: short, under the west meadow (t210) — a "found-it" moment, 1 chest ---
    [210, 18, 3, 6, 0],                    // entry shaft
    [204, 26, 14, 1, 1],                   // secret chamber floor (cols 204-217) — chest 12
    [206, 23, 4, 1, 2], [212, 20, 4, 1, 2],// return rungs back up to the surface
    // --- INDIGO spoke: enter drop-shaft t352 → DEEP staged descent → INDIGO arena (floor r31) → climb-loop exits at t368 ---
    [352, 18, 3, 6, 0],                    // entry drop-shaft
    [350, 25, 5, 1, 2], [356, 28, 5, 1, 2],// descent catch ledges (staged dungeon)
    [344, 31, 28, 1, 1],                   // INDIGO chamber floor (cols 344-371) — INDIGO boss b6 + chest 7
    [368, 18, 3, 6, 0],                    // exit climb-shaft
    [366, 28, 4, 1, 2], [366, 25, 4, 1, 2], [366, 22, 4, 1, 2], [366, 19, 4, 1, 2],   // return rungs (rise 3 each: floor r31 → surface)
  ],

  bounce: [[14, 17], [48, 17], [126, 17], [164, 17], [300, 17], [330, 17], [420, 17], [458, 17], [190, 17], [276, 17], [356, 30], [128, 27], [110, 17], [384, 17]],   // BOUNCE MUSHROOMS (launch -510, keeps pl.air=0 so DJ/TRI stack at apex). >=1 per zone; each ENABLES a specific climb, not decoration. [356,30]=INDIGO-floor express-exit, [128,27]=VIOLET-floor express-exit.
  bosses: [                              // 7 CORN bosses; 3rd field bi picks the rainbow band + palette
    [206, 16, 0],   // RED — MEADOW arena (past the spike moat) — first west boss [TEACH]
    [298, 16, 1],   // ORANGE — EASTRUN arena (past the spike moat) — first east boss [TEACH]
    [45, 6, 2],     // YELLOW — CANOPY crest (sky climb) [TWIST]
    [16, 16, 3],    // BLUE — PEAK base (far-west, hardest west)
    [132, 27, 4],   // VIOLET — VIOLET spoke floor (r28, shallow cave dungeon) — depth-tinted
    [454, 6, 5],    // GREEN — SUMMIT landing (sky climax) — far-right-top bookend
    [358, 30, 6],   // INDIGO — INDIGO spoke floor (r31, deep cave dungeon) — depth-tinted
  ],
  chests: [
    [128, 28.3],    // 0  — VIOLET spoke bottom (reward for the descent)
    [174, 11.3],    // 1  — meadow high-route top (2-tier stack)
    [47, 7.3],      // 2  — canopy crest (near YELLOW)
    [10, 4.3],      // 3  — peak ledge
    [386, 12.3],    // 4  — summit gate
    [434, 9.3],     // 5  — summit staircase top step
    [451, 7.3],     // 6  — GREEN summit landing
    [348, 31.3],    // 7  — INDIGO spoke bottom (reward for the deep descent)
    [21, 1.3],      // 8  — PEAK TRI-secret
    [154, 12.3],    // 9  — meadow treasure alcove A (aligned r12)
    [134, 12.3],    // 10 — meadow treasure alcove B (aligned r12)
    [318, 8.3],     // 11 — EASTRUN gauntlet high reward
    [208, 26.3],    // 12 — CENTRAL secret spoke ("found-it")
    [422, 11.3],    // 13 — summit staircase mid step
    [270, 14.3],    // 14 — eastrun intro step
    [462, 9.3],     // 15 — summit crown ledge
    [358, 14.3],    // 16 — east tower top
    [241, 14.3],    // 17 — HUB paddock perch (above centered spawn x240)
    [106, 13.3],    // 18 — MEADOW combat-arena perch (climb reward)
    [410, 13.3],    // 19 — summit staircase low step
  ],
  foes: [
    // SKY / CLIMB foes — ELEVATION RULE: gentle hop kinds only (k1/k4); traversal is the challenge.
    [8, 15, 1], [14, 12, 4], [8, 9, 1], [14, 6, 4],            // PEAK climb
    [38, 15, 1], [44, 11, 4],                                   // CANOPY climb
    [104, 13, 1], [172, 11, 4],                                 // MEADOW sky
    [312, 12, 1], [324, 12, 4],                                 // EASTRUN gauntlet sky (arc)
    [420, 11, 1], [432, 9, 4],                                  // SUMMIT staircase
    [450, 7, 1],                                                // GREEN arena (hop, on the landing)
    // ARENA / GAUNTLET ground foes — flat carries the tough kinds (charge k3/k5, shoot k2/k6). CLUSTERED, none in rests/hub.
    [56, 17, 3], [70, 17, 5], [80, 17, 2],                      // CANOPY arena
    [96, 17, 6], [110, 17, 3], [120, 17, 5],                    // MEADOW combat arena
    [198, 17, 2], [190, 17, 6],                                 // RED arena
    [270, 17, 3],                                               // EASTRUN intro
    [290, 17, 5], [296, 17, 2],                                 // ORANGE arena
    [308, 17, 6], [320, 17, 3],                                 // EASTRUN gauntlet ground (in the spike-gap lanes)
    [428, 17, 5], [438, 17, 2],                                 // SUMMIT ground
    [444, 17, 6],                                               // GREEN arena ground
  ],
  // FILL FOES — cave-spoke + surface fill. Held out of world.js ledge-grow (keeps LCG stable for scatter).
  // main.js seedFoes concatenates these into the live foe list. Total (foes+foesX) = 54 = 9 of each kind.
  foesX: [
    // Cave-spoke foes seat at floorRow-1 (gravity drops them ONTO the chamber floor).
    [130, 27, 3], [136, 27, 5],                                // VIOLET spoke (floor r28 → seat r27)
    [208, 25, 2],                                              // CENTRAL secret (floor r26 → seat r25)
    [350, 30, 6], [360, 30, 2], [366, 30, 3],                  // INDIGO spoke (floor r31 → seat r30)
    // Surface/sky fill to complete 9-of-each (hop kinds on platforms per elevation rule; charge/shoot on flat).
    [172, 14, 1], [268, 14, 1],                                // k1 fill (sky)
    [116, 15, 4], [282, 14, 4], [408, 13, 4],                  // k4 fill (sky)
    [34, 17, 2], [132, 17, 2], [464, 17, 2],                   // k2 fill (ground)
    [88, 17, 3], [376, 17, 3], [420, 17, 3],                   // k3 fill (ground)
    [144, 17, 5], [286, 17, 5], [400, 17, 5], [432, 17, 5],    // k5 fill (ground)
    [64, 17, 6], [152, 17, 6], [280, 17, 6], [460, 17, 6],     // k6 fill (ground)
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
