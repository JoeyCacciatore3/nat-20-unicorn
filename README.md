# UNI-CORN
### Hooves of Hope

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. The DARKNESS stole the world's color; you are the last
unicorn. Name your unicorn, cross five themed zones, defeat five dark Mares, and reclaim
the five RAINBOW SHARDS that restore the world. D&D-inspired combat with dice rolls,
crits, and stat allocation.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +3 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point
- **Skill tree:** one open tree, 16 single-rank skills — all player-chosen
- **Equipment:** enemies drop colored body-part gear that recolors the matching part of your unicorn, wears a tier trim (silver/gold/prismatic), AND gives stat bonuses
- **Die milestones:** d4 → d6 (L3) → d8 (L6) → d10 (L9) → d12 (L12)
- **Level 15 cap:** APOTHEOSIS (+2 dmg, +2 max HP)
- **XP curve:** quadratic (`L*L + 12`) — early levels quick, later levels earned

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Everyone starts the same neutral white unicorn — NEW GAME asks ONE thing (your name), right on the title screen; 3 save slots (name + level shown on CONTINUE); SAVE / SAVE & EXIT / SFX buttons in the pause sheet
- Gear comes from the shared loot roll — LUCK raises the chance and tier; elites & bosses roll it more times (higher chance, never guaranteed). Vibrant colors are earned.
- **10-slot inventory bag** (+5 via SADDLEBAGS skill). Items go to inventory; click to select, click again to equip or consume; X to discard.
- Gear icons and drops render with the SAME primitives as the unicorn's own body — a HORN drop looks like the horn on the unicorn.

## Combat
`damage = (roll(die) + STR + equipment - 1) × (crit ? 2 : 1)`
- Crit on max roll of the die, always (×2 damage + fanfare)
- Defense uses a gradient floor: `max(incoming/4, incoming - DEF)` — bosses always deal ≥25%, DEF still matters
- 6 enemy kinds built from one capability-bit system (ranged/jumper/chase/…) + elite variants
- Enemies scale by zone tier (+50% HP, +1 DM per tier — DQ1 shape)
- 5 named boss Mares — each holds one rainbow band (R-O-Y-B-V):
  - **DUSK MARE** (Meadow, RED) → **MURK MARE** (Cave, ORANGE) → **GALE MARE** (Cliffs, YELLOW) → **FROST MARE** (Peak, BLUE) → **DARK MARE** (Depths, VIOLET)

## Item Drops
One unified D&D loot roll (`d100 + LUCK×4`) for every kill and chest:
- **HP POTION** (red bottle, +3 HP) — floor
- **MP POTION** (blue bottle, +3 MP) — mid
- **GEAR PART** (BODY/MANE/HORN/HOOVES) — ceiling, LUCK boosts tier

Drops spawn with a 0.6s grace window (visible on screen before magnetizing to the player). Consumables **auto-consume** if the relevant stat isn't full, else land in inventory for later. XP comes only from kills.

**RAINBOW SHARDS** are progression tokens (not items): each MARE surrenders one on defeat, auto-collected. Boss defeat also restores full HP + MP. Collect all 5 → THE DARKNESS LIFTS.

## Skill Tree
One open tree, 16 single-rank skills — every name states its effect:
- SHOT → FAR SHOT
- HEAL → HEAL +2 → HEAL +4
- MAX HP +3 → +6 · MAX MP +2 → +4
- GUARD TIME
- DBL JUMP → TRI JUMP · LONG DASH
- SPEED +12% → +24%
- SADDLEBAGS (bag 10 → 15)

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A/D or ←→ | Floating joystick (left 40%) |
| Jump (hold = higher) | Space / W / ↑ | JUMP button |
| Dash attack (strikes through foes, earns mana) | J / X | DASH button |
| Magic bolt (costs mana) | L | SHOT button (after SHOT skill) |
| Heal (hold, costs mana) | H | HEAL button (after HEAL skill) |
| Interact (hearth / chest / portal) | Space (near) | JUMP (near) |
| Pause / character sheet | P / Esc | ☰ top-right |
| Discard selected inv item | X | (pause only) |

Dash starts at half distance; LONG DASH skill doubles it (needed for the spike lake).
Joystick also navigates menus (up/down to select, JUMP button to confirm).
No separate melee — the dash IS the attack, Celeste-style: one gesture for mobility and damage.

## World
Five themed zones connected by rainbow portals:
- **MEADOW** (hub) — starting field, holds DUSK MARE + 4 portals to the other zones
- **CAVE** — underground burrow, MURK MARE
- **CLIFFS** — wind-swept heights, GALE MARE
- **PEAK** — icy summit, FROST MARE
- **DEPTHS** — corrupted core, DARK MARE (final)

The hub's ability-gated paths (double-jump wall, dark-crystal barrier, spike lake requiring dash) control the order you reach each portal. Every portal, boss, and chest is verified reachable by a build-time audit tool.

**Color palette rules:** Sky `#6bc5ff` and grass `#5ac878` are RESERVED for background;
enemies and gear use warm saturated colors so silhouettes read against the sky.
HP = red (`#ff5d6c`), MP = blue (`#4a76ff`) — matches bar colors AND consumable colors.
Rainbow strobing is reserved for portals ONLY — everywhere else color signals a specific meaning.

## Build
Requires **Node ≥ 20**.
```
npm install
npm run build    # map-audit → tpos-check → esbuild → terser → roadroller → zip → ECT
```
Build gates: multi-zone map traversal audit (no stuck spots, all portals/bosses/chests reachable at expected tier), TPOS drift check (skill-tree layout matches TREE), 13,312 byte limit, no external URLs, no unprefixed localStorage.

**Current: 11,700 / 13,312 B (87.9%) — 1,612 B free**

## Save format
Keys: `localStorage.n20_s0..2` (3 slots). Version: **v32** — strict version gate, auto-discards older saves.
Fields: `{v, h(p), x(p), l(vl), n(mn), g(bosses), t(stats), c(checkpoint), d(pending), k(spts), y(su[16]), m(name), o(chestBits), z(zone), u(col[4]), q(eq[4]), i(inv[]), p(mute)}`.

## Structure
- `src/main.js` — the game (~1,340 lines)
- `src/world.js` — 5 zone tile maps, entity seeds, `loadZone(i)` swapper (~205 lines)
- `design/SUBMISSION-KIT.md` — paste-ready store copy, cover/screenshot assets, entry checklist
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — per-zone traversal prover (portals/bosses/chests reachable at expected tier)
- `tools/tpos-check.mjs` — skill-tree layout drift guard + PAL/gear-range check
- `dist/wavedash/` — Wavedash platform variant
