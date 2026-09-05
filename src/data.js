// data.js — UNICORN static lookup tables: palette, gear/enemy/boss data, skill
// tree, sprite bitmaps. PURE constants + pure helpers only (no canvas, no mutable
// game state). esbuild inlines these back into the single bundle, so this split is
// byte-neutral — it exists purely to keep main.js focused on behaviour. Anything
// that reads or writes live game state (STATS closures, canvas draws) stays in main.js.
//
// GUARD: tools/tpos-check.mjs reads TREE, TPOS and PAL from this file (concatenated
// with main.js). Keep those three literal shapes greppable: `const NAME = [ … \n];`.

// UNIFIED PALETTE — 17 colors, shared across all 4 body parts. Mane gradient
// auto-derived via dim(): base → 85% → 70% brightness (no stored triples).
// GUARD (byte-law #14): PAL[8] must NOT equal ANY ZB row's sky (col 5). Sky is reserved for the
// background — a gear roll of c=8 would produce invisible-against-sky gear. Reusing
// the mana-blue literal '#4a76ff' here means: (a) distinct-from-sky gear color, and
// (b) roadroller LZ-backrefs the same string used elsewhere (mana bar, XP text).
export const PAL = [
  '#f5f1f4','#f7d9c0','#ffd75e','#ff9d3c','#ff5d6c','#ff99cc',
  '#e08ae0','#c47fe0','#4a76ff','#40e8b0','#5ac878',
  '#d8d8e0','#ffffff','#2a1f14','#4a3828','#4ad46a','#6a5acd'
];
// Derive a darker shade of any hex color (each channel * f). Used for the mane sweep
// AND rock shading (base = dim(accent)) so we store one accent, not two tones.
export const dim = (h, f) => '#' + h.slice(1).match(/../g).map(c => (Math.max(0, parseInt(c, 16) * f | 0)).toString(16).padStart(2, '0')).join('');
export const mane3 = i => [PAL[i], dim(PAL[i], .85), dim(PAL[i], .7)];
// EQUIPMENT slot maps — slot 0=BODY(+HP) 1=MANE(+MAG) 2=HORN(+STR) 3=HOOVES(+DEF).
export const SLOT_STAT = [1, 2, 0, 3];                // slot→stat index: HP, MAG, STR, DEF
export const SLOT_LBL = ['BODY', 'MANE', 'HORN', 'HOOVES'];
// Stat colors — used by menu bars/labels AND by equipment strokes (menu box + inv slot + world drop)
// so gear identity is visible at pickup: red=HP, blue=MAG, gold=STR, light-blue=DEF, green=LUCK.
export const SC = ['#ffd75e', '#ff5d6c', '#4a76ff', '#9fe89a', '#c47fe0'];   // STR gold · HP red · MAG blue · DEF green · LUCK violet (reuses VIOLET boss color)

// FOECOL — k1..k6 body colors. Sky #6bc5ff + grass #5ac878 are RESERVED for the
// background (PICO-8 fg/bg separation): foes use saturated warms + darker cools.
export const FOECOL = ['', '#c9a6f7', '#ff9d3c', '#e05555', '#e08ae0', '#9fe89a', '#8cf'];
// FT[k] = [hp, dm, speed, size, capBits, shape].
// k1 CRAWLER · k2 BLOB · k3 CASTER · k4 RUNNER · k5 HOPPER · k6 PUFF.
// Cap bits: 1=ranged 2=hop 4=summon 8=shockwave 16=chase 32=swift.
export const FT = [, [4, 3, 44, 3, 0, 1], [8, 4, 31, 3, 16, 2], [12, 5, 26.7, 4, 1, 3], [5, 3, 70, 3, 0, 1], [6, 4, 36, 3, 18, 1], [9, 4, 22, 3, 1, 2]];
// P2 = capability bits granted at boss phase 2 (OR'd into f.cap).
export const P2 = [32, 4, 1, 8, 37, 8, 10];   // INDIGO (bi=6) — hop + shockwave in the cavern
// DARKCORN bosses — all named just 'DARKCORN'; differentiated by horn + mane color = their RBC rainbow band.
// Count = RBC.length (data-driven; add an RBC + P2 entry + a seeds.bosses placement to add one).
// RBC values are PAL indices (bosses render via drawU + col swap — one canonical unicorn shape everywhere).
export const RBC = [4, 3, 2, 8, 7, 15, 16];
// 7-band rainbow (arc + title + effects).
export const RC = ['#ff5d6c','#ff9d3c','#ffd75e','#9fe89a','#8cf','#c47fe0','#c9a6f7'];
// Sky backdrop colour.
// ZONE BANDS — [xEndTile, dirt, top, foliage, accent, sky]. Row = first with pl.x < xEnd*16;
// pl.y > 63*16 overrides to the last row (UNDERGROUND — depths/caverns/RED lair). One lookup
// rethemes terrain, top strips, trees, pines, rocks, tufts AND sky (all read the destructure).
// 7 ZONES = 7 DARKCORN. Surface: 5 boss territories by x. Underground: 2 boss layers by depth
// (shallow y>63 = VIOLET's depths — RED's lair opens into this layer; deep y>74 = INDIGO's cavern).
export const ZB = [
  [40,  '#4a3a26', '#8a9a9a', '#3a8a52', '#8a9a9a', '#4a9ad8'],   // PEAK (BLUE) — bare stone tops, storm sky (all reused literals)
  [112, '#4a3a26', '#3a8a52', '#3a8a52', '#8a9a9a', '#5ab5ef'],   // CANOPY (YELLOW) — cool highland green
  [280, '#5a3a1e', '#4a9a3a', '#4a9a3a', '#888888', '#6bc5ff'],   // MEADOW (RED) — original identity
  [476, '#6a4a22', '#8a9a32', '#8a9a32', '#9a8a62', '#7ecfe8'],   // EAST RUN (ORANGE) — dry gold savanna
  [601, '#52341e', '#3a7a5e', '#3a7a5e', '#7a8a92', '#4a9ad8'],   // SUMMIT (GREEN) — deep teal, storm sky
  [601, '#32283e', '#6a4a8a', '#8a5aca', '#5a5a6a', '#1a1626'],   // DEPTHS (VIOLET) — violet corridor, near-black
  [601, '#221c2e', '#8a5aca', '#8a5aca', '#6a4a8a', '#1a1626'],   // CAVERN (INDIGO) — deepest: luminous violet floor (1 new literal)
];
// Ground palette [dirt, surface-top, foliage, accent]: dirt/top theme solid+platform tiles;
// foliage themes green deco (tree canopy, grass, flower stems); accent is the stone tone
// (rock base derived darker via dim(accent), so one stored color = two-tone boulder).

// SKILL TREE — prerequisite-based: LINK pairs [parent,child] gate unlock (see main.js canBuy).
// 12 nodes, 4 visual rows. Indices are stable — su[N] semantics fixed.
// 0 SHOT · 1 FAR SHOT · 2 HEAL · 3 SUPER HEAL · 4 DBL JUMP · 5 TRI JUMP
// 6 DASH · 7 LONG DASH · 8 STASH · 9 HP +5 · 10 MP +5 · 11 POT +5
export const TREE = ['SHOT','FAR SHOT','HEAL','SUPER HEAL','DBL JUMP','TRI JUMP','DASH','LONG DASH','STASH','HP +5','MP +5','POT +5'];
// Row positions: Row1 y=48 (3), Row2 y=94 (4), Row3 y=140 (3), Row4 y=186 (2). Alternating centering:
// odd rows use canonical columns 263/325/387; even rows offset to 232/294/356/418 (subset).
// Layout changes move POSITIONS only — indices match TREE order.
export const TPOS = [[263,48],[356,186],[325,48],[294,186],[294,94],[325,140],[387,48],[356,94],[418,94],[263,140],[232,94],[387,140]];

// Pixel sprites (bitmask rows, MSB-left) — decoded by spr() in main.js.
export const I_MP = [96,96,96,240,504,1020,2046,4095,4095,4095,4095,2046,1020,504];   // POTION 12×14 — 3 skinny 2-wide neck rows (r0-2; cork covers r0 only, r1-2 visible → clear skinny-neck feature), 4-wide shoulder taper starts r3, widening r4-6, 4 rows full 12-wide body, curving base. Cork = 4×3 opaque tan fillRect (extends 2px above bitmap, covers r0).

// GREATCORN dialogue. '~' prefix = player unicorn speaks (bubble over its head), else GREATCORN. '|' = row break within one bubble. One bubble per tap = a comedic beat (setup on one, punch on the next). Voice: vain, dramatic, forgetful elder vs. the deadpan pony.
// COUPLING: bubbles 6/7/8 are the controls tutorial — main.js SPOTLIGHTS joystick / JUMP / locked buttons by these exact indices (subtractive: target full-alpha, others dimmed). Reordering INTRO breaks the spotlight.
// Bubbles 6/7 are the KEYBOARD variants; beginGame() overwrites them with touch variants when `touch` is set (device-conditional prompts — never dual-name inputs).
export const INTRO = ["Oh! You're awake.|I nearly sat on you.", "~...who are you?", "The GREATCORN.|Obviously. Keep up.", "The DARKCORN|broke my rainbow.", "~...that seems bad.", "Reclaim every shard.|One per DARKCORN.|There are seven.", "Arrow keys walk.|WASD for rebels.", "SPACE jumps.|Jump near me to chat.|I permit it.", "The dull buttons?|Locked. Greatness|is earned.", "Hurt? Potions, spells,|or my sympathy.|Two of those exist.", "~Wish me luck.", "Luck's for ponies.|I'd come along, but|I'm load-bearing."];
// Re-talk quips — cycled one per approach (JUMP near the GREATCORN after the intro).
export const TALK = ["Shards won't fetch|themselves, pony.", "Still here?|So are the DARKCORN.", "You've got this.|Probably.", "Stop bouncing at me.|I'm not a mushroom.", "This mane grooms|itself. Out of|respect."];
