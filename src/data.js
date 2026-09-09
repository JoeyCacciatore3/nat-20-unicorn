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
  '#ffffff','#2a1f14','#4a3828','#4ad46a','#6a5acd'
];
// Derive a darker shade of any hex color (each channel * f). Used for the mane sweep
// AND rock shading (base = dim(accent)) so we store one accent, not two tones.
export const dim = (h, f) => '#' + h.slice(1).match(/../g).map(c => (Math.max(0, parseInt(c, 16) * f | 0)).toString(16).padStart(2, '0')).join('');
export const mane3 = i => [PAL[i], dim(PAL[i], .85), dim(PAL[i], .7)];
// EQUIPMENT slot maps — slot 0=BODY(+HP) 1=MANE(+MAG) 2=HORN(+STR) 3=HOOVES(+DEF).
export const SLOT_STAT = [1, 2, 0, 3];                // slot→stat index: HP, MAG, STR, DEF
export const SLOT_LBL = ['BODY', 'MANE', 'HORN', 'HOOVES'];
// Stat colors — used by menu bars/labels AND by equipment strokes (menu box + inv slot + world drop)
// so gear identity is visible at pickup: STR red · HP green · MAG blue · DEF violet · LUCK orange.
export const SC = ['#ff5d6c', '#6cf279', '#4a76ff', '#c47fe0', '#ff9d3c'];   // STR red (attack=damage) · HP green (=HP bar/heal/potion) · MAG blue (=MP bar) · DEF violet (PAL[7]) · LUCK orange (PAL[3]) — one colour per meaning, zero stat/HUD clashes

// FOECOL — k1..k6 body colors. Sky #6bc5ff + grass #5ac878 are RESERVED for the
// background (PICO-8 fg/bg separation): foes use saturated warms + darker cools.
// FOECOL as PAL indices (regrouped 2026-09-06 for max contrast vs every zone + byte savings vs hex strings). k1=pink · k2=teal · k3=violet · k4=orange · k5=gold · k6=light-purple. All bodies get 1px black outline → figure/ground pop on any background.
export const FOECOL = [, 5, 9, 7, 3, 2, 6];
// FT[k] = [hp, dm, speed, capBits]. Shape column retired in v3 sprite rewrite (2026-09-06) — drawFoe dispatches on f.k directly.
// (size is UNIFORM — render uses cz 4 for all regular foes, 4 for bosses; no per-kind or random size.)
// k1 walker-small · k2 floater-tent · k3 caster · k4 walker-fast · k5 walker-hop · k6 floater-spike.
// Cap bits: 1=ranged 2=hop 16=chase (bosses use 19 = the full unicorn kit — same code path, all enemies dispatch through unified attack orchestration).
// Cap assignment (2026-09-06 v3 combat expansion — 4 of 6 enemies now have MULTI-ATTACK combos for real tactical distinction):
//   k1=2 hop-only (leaping puddle · 1 move) · k2=17 chase+ranged (tentacle stalker-spitter · 2 moves) ·
//   k3=19 chase+ranged+hop (full unicorn kit, mini-boss feel · 3 moves) · k4=16 pure chase (fast rush hunter · 1 move) ·
//   k5=18 chase+hop (frog leaper · 2 moves) · k6=3 ranged+hop (bouncing spike-sniper · 2 moves).
//   Every cap value unique. k1 & k4 stay simple, everyone else runs 2-3 attacks. Contact damage universal (unlisted).
export const FT = [, [4, 3, 44, 2], [8, 4, 31, 19], [12, 5, 26.7, 19], [5, 3, 70, 18], [6, 4, 36, 18], [9, 4, 22, 3]];   // 2026-09-08: ALL kinds carry hop (bit 2) — k2 17→19, k4 16→18 (Joey: every enemy jumps). Hop is also the anti-freeze recovery path (vx ||= restore at hop launch).
// DARKCORN bosses — all named just 'DARKCORN'; differentiated by horn + mane color = their RBC rainbow band.
// Count = RBC.length (data-driven; add an RBC entry + a seeds.bosses placement to add one).
// RBC values are PAL indices (bosses render via drawU + col swap — one canonical unicorn shape everywhere).
export const RBC = [4, 3, 2, 8, 7, 14, 15];
// 7-band rainbow (arc + title + effects).
export const RC = ['#ff5d6c','#ff9d3c','#ffd75e','#9fe89a','#8cf','#c47fe0','#c9a6f7'];
// Sky backdrop colour.
// ZONE BANDS — [xEndTile, dirt, top, foliage, accent, sky]. Row = first with pl.x < xEnd*16;
// pl.y > 63*16 overrides to the last row (UNDERGROUND — all depths/caverns/RED lair, ONE theme). One
// lookup rethemes terrain, top strips, trees, rocks, tufts AND sky (all read the destructure).
// 7 ZONES for 7 DARKCORNs: 5 surface boss territories by x + 2 underground bands split by depth
// (VIOLET shallow depths y=64-71 · INDIGO deep cavern y>=72). Selector in main.js ZC does the split.
export const ZB = [
  [40,  '#4a3a26', '#c0c8d0', '#5a7a6a', '#c0c8d0', '#4a9ad8'],   // PEAK (BLUE) — batch 10 palette differentiation (2026-09-07): top+accent snow-cap white (was cool gray shared w/ CANOPY), foliage slate-green alpine lichen (was grass-green shared w/ CANOPY). Sells "bare stone tops" + snow signature. Sky shared w/ SUMMIT is DELIBERATE (both high-altitude storm-sky zones).
  [112, '#5a3a2a', '#3a8a52', '#3a8a52', '#7a5a3a', '#5ab5ef'],   // CANOPY (YELLOW) — batch 10 palette differentiation (2026-09-07): dirt warm loam (was cold brown shared w/ PEAK), accent wood-brown for fallen-limb rocks (was cool gray shared w/ PEAK). Now zero color overlap with PEAK.
  [280, '#5a3a1e', '#4a9a3a', '#4a9a3a', '#888888', '#6bc5ff'],   // MEADOW (RED) — original identity
  [476, '#6a4a22', '#8a9a32', '#8a9a32', '#9a8a62', '#7ecfe8'],   // EAST RUN (ORANGE) — dry gold savanna
  [601, '#52341e', '#3a7a5e', '#3a7a5e', '#7a8a92', '#4a9ad8'],   // SUMMIT (GREEN) — deep teal, storm sky
  [0, '#32283e', '#6a4a8a', '#8a5aca', '#5a5a6a', '#1a1626'],   // UNDER-DEPTHS (VIOLET zone, y=64-71) — col0 (xEnd) NEVER read: underground selected by y-threshold, not the x-find. 601→0 (dead value).
  [0, '#1a1832', '#3a4a7a', '#6a5acd', '#4a4a72', '#080814'],   // UNDER-CAVERN (INDIGO zone, y>=72) — col0 dead (see above). foliage reuses PAL[16] literal for LZ.
];
// Ground palette [dirt, surface-top, foliage, accent]: dirt/top theme solid+platform tiles;
// foliage themes green deco (tree canopy, grass, flower stems); accent is the stone tone
// (rock base derived darker via dim(accent), so one stored color = two-tone boulder).

// SKILL TREE — level-gated rows (see main.js canBuy = lvl>=[1,9,1,6,3,6,1,3,6,9][i]).
// 10 nodes, 4 visual rows. Indices are stable — su[N] semantics fixed. Nodes render as ICONS
// (iShot/iHeal/iJump/iDash), NOT names, so TREE only needs its LENGTH — the strings are 1-char
// placeholders (tpos-check counts quoted entries to gate TPOS.length; content is irrelevant).
// 0 SHOT · 1 FAR SHOT · 2 HEAL · 3 SUPER HEAL · 4 DBL JUMP · 5 TRI JUMP
// 6 DASH · 7 LONG DASH · 8 DBL SHOT · 9 TRI SHOT
export const TREE = 10;   // node count — was ['a'..'j'] string array but the labels were never rendered (grep-verified 2026-09-06). All skill nodes draw via iShot/iHeal/iJump/iDash icons, no text. Consumed as `TREE` (bare number) in main.js.
// Row positions: Row1 y=58 (3), Row2 y=98 (2), Row3 y=138 (3), Row4 y=178 (2). 3-2-3-2 grid, 40px spacing. Row1 y=58 aligns the top nodes with the top of the MANE/HORN equipment boxes (ey=58).
// rows 1&3 share columns 248/304/360; rows 2&4 share 276/332 (left column over the MP/mana potion box x=243-267, SHOT centre x=261). Three-column layout by family:
// LEFT col = SHOT chain (SHOT→[swap]→TRI JUMP→FAR SHOT), MID col = HEAL chain (HEAL→SUPER HEAL),
// RIGHT col = MOBILITY (DASH→LONG DASH→[swap]→TRI SHOT). DBL SHOT/DBL JUMP + TRI SHOT/TRI JUMP
// swap tiers/columns so mobility unlocks earlier. Level gates: Row1=LV1, Row2=LV3, Row3=LV6, Row4=LV9.
export const TPOS = [[248,58],[276,178],[304,58],[304,138],[276,98],[248,138],[360,58],[332,98],[360,138],[332,178]];

// Pixel sprites (bitmask rows, MSB-left) — decoded by spr() in main.js.
export const I_MP = [96,96,96,240,504,1020,2046,4095,4095,4095,4095,2046,1020,504];   // POTION 12×14 — 3 skinny 2-wide neck rows (r0-2; cork covers r0 only, r1-2 visible → clear skinny-neck feature), 4-wide shoulder taper starts r3, widening r4-6, 4 rows full 12-wide body, curving base. Cork = 4×3 opaque tan fillRect (extends 2px above bitmap, covers r0).

// GREATCORN dialogue. '~' prefix = player unicorn speaks (bubble over its head), else GREATCORN. '|' = row break within one bubble. One bubble per tap = a comedic beat (setup on one, punch on the next). Voice: vain, dramatic, forgetful elder vs. the deadpan pony.
// COUPLING: bubbles 6/7/8 are the controls tutorial — main.js SPOTLIGHTS joystick / JUMP / locked buttons by these exact indices (subtractive: target full-alpha, others dimmed). Reordering INTRO breaks the spotlight.
// Bubbles 6/7 are the KEYBOARD variants; beginGame() overwrites them with touch variants when `touch` is set (device-conditional prompts — never dual-name inputs).
export const INTRO = ["Oh! You're awake.", "~...who are you?", "The GREATCORN.|Obviously. Keep up.", "The DARKCORN|broke my rainbow.", "~...that seems bad.", "Reclaim every rainbow.|One per DARKCORN.|There are seven.", "The corners hold all|you need. Use them.", "The dull buttons?|Locked. Greatness|is earned.", "Wounded? Tap a potion,|or return to me.|I restore you fully.", "~Wish me luck.", "Luck's for ponies.|I'd come along, but|I'm load-bearing."];
// INTRO cleanups 2026-09-08 (Joey): dropped "I nearly sat on you" (bubble 0 tail) · removed the MOVE bubble ("Arrow keys walk/WASD") and the JUMP bubble ("SPACE jumps/Jump near me to chat/I permit it") entirely — the ✓ interact glyph on the JUMP button + the "..." talk-available bubble over GREATCORN now carry that, no text needed · new CORNER-PANEL bubble points at the top cluster (? = help/controls screen, sound toggle) which ALSO holds the full control reference, so device-specific control text is gone · dropped "health and magic both" tail from the heal-hub line · device-swap removed in main.js → identical dialogue on browser + mobile.
// Re-talk quips — cycled one per approach (JUMP near the GREATCORN after the intro).
// TALK — re-talk pool (jump near GREATCORN). Cycles SEQUENTIALLY (tqi++ % len), so array order = teaching order for a player who returns repeatedly. 2026-09-08 (Joey): THREE info quips as a chain, each its own beat — [1] leveling (enemies→XP→levels), [2] allocation (levels→points→spend on stats & skills), [3] location (WHERE: top-left character menu) — interleaved with flavor lines. Potions live in the INTRO heal-hub bubble. No stat-detail quip: the stat NAMES self-describe (STR/DEF/HP/MAG/LCK), so quip [3] only says WHERE (top-left character menu), as a plain directive. Instruction-first; reuses shipped words (XP/levels/grant/points/stats/skills/menu/top/left).
export const TALK = ["Rainbows won't fetch|themselves, pony.", "Enemies give XP.|XP grants levels.", "Levels grant points.|Spend points on|stats and skills.", "Tap the top-left|character menu|to enter.", "Still here?|So are the DARKCORN.", "You've got this.|Probably.", "Stop bouncing at me.|I'm not a mushroom.", "This mane grooms|itself. Out of|respect."];
// DEATH — reuses the dialogue system for a respawn beat: fires at the paddock once the death fade completes (deathT crosses 0). Player groans, GREATCORN makes your death HIS burden. Close heals full HP/MP + green flash (the shared adv() close, a no-op here since respawn already restored) = "revived by GREATCORN."
export const DEATH = ["~Ugh...", "Again? The things|I put up with."];
// WIN — talk to GREATCORN with all 7 rainbows banked (rainbows()===bs.length). Reuses the dialogue rig; on close, a screen-wide rainbow spray() celebration fires (see adv()). GREATCORN acknowledges the win, pompously.
export const WIN = ["All seven! History|will remember|MY name."];
