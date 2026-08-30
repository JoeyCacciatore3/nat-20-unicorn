// world.js — UNI-CORN: Zone 0 (Dawnfield hub) — connects via doorways to Zones 1-4.
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

// ---- DAWNFIELD (surface, x158-277) — Zone 0, DUSK MARE resides here ----
[170, 60, 3, 2, 0], [170, 61, 3, 1, 3],   // pits: 2 deep (L1), spikes, floor below
[196, 60, 5, 2, 0], [196, 61, 5, 1, 3], [197, 59, 3, 1, 2],
[233, 60, 3, 2, 0], [233, 61, 3, 1, 3],
[175, 57, 4, 1, 2], [181, 55, 4, 1, 2], [188, 57, 5, 1, 2],
[205, 56, 4, 1, 2], [212, 54, 4, 1, 2], [220, 57, 6, 1, 2],
[240, 56, 4, 1, 2], [247, 54, 4, 1, 2],
[210, 51, 3, 1, 2], [218, 49, 3, 1, 2],   // DJ high route
[262, 59, 3, 1], [265, 58, 3, 2], [268, 57, 3, 3], [271, 56, 3, 4], // stepped tower
[274, 58, 3, 1, 2],                    // rung behind the tower (audit: stuck corner)

// ---- DIM BURROW ENTRY (x150-256, carved) — leads to Zone 1 doorway ----
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

// ---- CLIFFMANE APPROACH (x40-118, DJ terraces) — leads to Zone 2 doorway ----
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
[52, 26, 8, 2],                        // silverfrost approach ledge
// descent-only detour (fall east off the climb; always exits to the surface)
[86, 36, 4, 1, 2], [94, 39, 4, 1, 2], [102, 42, 4, 1, 2],

// ---- SILVERFROST APPROACH (x10-60): bridge platform after the crystal — leads to Zone 3 doorway ----
[48, 18, 2, 10, 4],                    // GLOOM CRYSTAL barrier (shot breaks 3x3)
[46, 24, 3, 1, 2],                     // bridge — first step past the barrier
[40, 23, 4, 1, 2], [34, 20, 3, 1, 2], [28, 17, 3, 1, 2], [22, 14, 3, 1, 2],
[10, 12, 9, 2],                        // peak ledge (widened — L3 landing)

// ---- GLOOM HEART (x10-139, carved) ----
[10, 64, 130, 6, 0],
[108, 60, 3, 4, 0],                    // entry shaft (L2 rungs)
[108, 62, 3, 1, 2], [108, 64, 3, 1, 2], [108, 66, 3, 1, 2], [108, 68, 3, 1, 2],
[80, 69, 7, 1, 3],                     // spike lake, 7 wide — DASH gate

// ---- PADDOCK extras ----
[124, 54, 4, 1, 2],                    // DJ hub perch

];
for (const m of MAP) box(...m);

// ---- entity seeds ----
export const seeds = {
  // ONE home campfire (Joe): the Paddock hearth is the only rest/save/respawn.
  // The Return Law auditor proves every reachable cell can get back to it.
  fires: [[132.5, 59.5]],
  // boss arenas: guardian index → bit is 1<<i (5 bosses, bits 1/2/4/8/16)
  // GLOOM MARE (i=4) staged CENTER of the wide-open Heart span (x30-80 kept
  // empty — the emptiness IS the arena), west of the spike lake (x80-86).
  bosses: [[258, 57], [226, 67], [56, 23], [14, 10], [55, 67]],
  // Chests — hand-placed exploration rewards. Open once (oc bitfield): full
  // heal + a shower of (4 + LUCK) item drops. Bit index = position in array.
  chests: [
    [219.5, 48.3],  // 0 — Meadow high route (DJ-only)
    [186, 68.3],    // 1 — Dim Burrow entry W
    [252, 67.3],    // 2 — Dim Burrow entry E
    [83, 50.3],     // 3 — Cliffmane approach terrace
    [56, 25.3],     // 4 — Treetops crest (SHOT-gated area)
    [12, 11.3],     // 5 — Silverfrost approach peak (post-SHOT)
  ],
  foes: [
    // Meadow — k4 sprinter on the platform route, k5 hopper by the tower
    [174, 58, 1], [186, 58, 1], [206, 54, 4], [216, 58, 2], [230, 58, 2], [245, 58, 2], [260, 58, 3], [252, 58, 5],
    // Dim Burrow approach — k6 ranged jelly ambushes the E room, k5 hopper in the corridor
    [180, 66, 1], [200, 68, 2], [225, 66, 6], [248, 68, 3], [190, 68, 5],
    // Cliffmane approach — hopper on the terraces (jumps close the height gaps)
    [92, 52, 1], [78, 49, 2], [86, 53, 5],
    [75, 35, 2],
    // Silverfrost approach — ranged jelly guards the climb
    [34, 19, 6],
    // Gloom Heart — GAUNTLET at the east entry only; arena x30-80 stays EMPTY
    // ("almost nothing there" — the open dread before the GLOOM MARE at x55)
    [125, 68, 3], [115, 68, 4], [98, 68, 6],
  ],
};
// DECORATIONS — [x, y, type]. 0=tree, 1=grass, 2=rock.
// y = air tile ABOVE ground (tile(x,y)=0, tile(x,y+1)=1). No decos near spikes.
// Scenery types: trees, grass tufts, rocks. Nothing that could be misread as a collectible.
export const DECO = [
  // Meadow (y=59)
  [142, 59, 0], [155, 59, 0], [212, 59, 0], [238, 59, 0],
  [150, 59, 1], [183, 59, 1], [225, 59, 1], [255, 59, 1],
  // Upper platforms
  [206, 55, 1], [176, 56, 0], [266, 57, 1],
  // Caves (y=69) — rocks (underground feel).
  // Heart arena x30-80 kept bare (boss stage); its decos moved to the flanks.
  [20, 69, 2], [125, 69, 2], [120, 69, 2], [190, 69, 2], [240, 69, 2],
  // West cliffs
  [86, 53, 0], [73, 50, 0], [78, 50, 1],
  // Treetops
  [53, 25, 0], [46, 23, 1],
  // Silverfrost approach
  [12, 11, 2], [16, 11, 1],
];
