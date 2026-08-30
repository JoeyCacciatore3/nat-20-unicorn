# UNI-CORN
### Hooves of Hope

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. Name your unicorn, explore a
vibrant connected world, defeat 5 bosses, and collect 5 golden rainbow shards
to win. D&D-inspired combat with dice rolls, crits, and stat allocation.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +3 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point
- **Skill tree:** one open tree, 16 single-rank skills — all player-chosen
- **Equipment:** enemies drop colored body-part gear that recolors the matching part of your unicorn, wears a tier trim (silver/gold/prismatic), AND gives stat bonuses
- **Die milestones:** d4 → d6 (L3) → d8 (L6) → d10 (L9) → d12 (L12)
- **Level 15 cap:** APOTHEOSIS (+2 dmg, +2 max HP)

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Everyone starts the same neutral white unicorn — NEW GAME asks ONE thing (your name), right on the title screen; 3 save slots (name + level shown on CONTINUE); SAVE / SAVE & EXIT buttons in the pause sheet
- Gear comes from the shared loot roll — LUCK raises the chance and tier; elites & bosses roll it more times (higher chance, never guaranteed). Vibrant colors are earned.
- **10-slot inventory bag** (+5 via SADDLEBAGS skill). Items go to inventory; click to select, click again to equip or consume; X to discard.
- Gear icons and drops render with the SAME primitives as the unicorn's own body — a HORN drop looks like the horn on the unicorn.

## Combat
`damage = (roll(die) + STR + equipment - 1) × (crit ? 2 : 1)`
- Crit on max roll of the die, always (×2 damage + fanfare)
- Defense subtracts from incoming damage (min 1)
- 6 enemy kinds built from one capability-bit system (ranged/jumper/chase/…) + elite variants
- 5 named boss Mares (DUSK/HOLLOW/GALE/FROST/GLOOM) with arena banners and phase-2 ability grants

## Item Drops
One unified D&D loot roll (`d100 + LUCK×4`) for every kill and chest:
- **HP POTION** (red bottle, +3 HP) — floor
- **MP POTION** (blue bottle, +3 MP) — mid
- **GEAR PART** (BODY/MANE/HORN/HOOVES) — ceiling, LUCK boosts tier
- **RAINBOW SHARD** (guaranteed on boss first kill only, full heal + game-completion item, collect all 5)

Consumables **auto-consume** if the relevant stat isn't full, else land in inventory for later. XP comes only from kills.

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
| Jump (hold = higher) | Space / Z / K / W / ↑ | ▲ button |
| Dash attack (strikes through foes, earns mana) | J / X / Shift / O | » button |
| Rainbow shot (costs mana) | L / C | ✦ button (after SHOT skill) |
| Rainbow heal (hold, costs mana) | S / I | ＋ button (after HEAL skill) |
| Pause / character sheet | P / Esc | ☰ top-right |
| Discard selected inv item | X | (pause only) |

Dash starts at half distance; LONG DASH skill doubles it (needed for the spike lake).
Joystick also navigates menus (up/down to select, right to confirm).
No separate melee — the dash IS the attack, Celeste-style: one gesture for mobility and damage.

## World
One connected map, five zones — Gloom Meadow, Root Caves, West Cliffs,
Treetops/Summit, and the wide-open Gloom Heart boss arena. Blue sky, parallax
clouds on one flat sky; trees, grass, rocks (scenery never looks like loot). Universal danger
color: pink-red spikes. Enemies and bosses respawn. Collecting all 5 shards lifts the gloom (victory).

**Color palette rules:** Sky `#6bc5ff` and grass `#5ac878` are RESERVED for background;
enemies and gear use warm saturated colors so silhouettes read against the sky.
HP = red (`#ff5d6c`), MP = blue (`#4a76ff`) — matches bar colors AND consumable colors.

## Build
Requires **Node ≥ 20**.
```
npm install
npm run build    # map-audit → tpos-check → esbuild → terser → roadroller → zip → ECT
```
Build gates: map traversal audit (no stuck spots), TPOS drift check (skill-tree layout matches TREE), 13,312 byte limit, no external URLs, no unprefixed localStorage.

**Current: 11,437 / 13,312 B (85.9%) — 1,875 B free**

## Save format
Keys: `localStorage.n20_s0..2` (3 slots). Version: **v31** — strict version gate, auto-discards older saves.
Fields: `{v, h(p), x(p), l(vl), n(mn), g(bosses), t(stats), c(checkpoint), d(pending), k(spts), y(su[16]), m(name), o(chestBits), w(welcomed), u(col[4]), q(eq[4]), i(inv[]), p(mute)}`.

## Structure
- `src/main.js` — the game (1,338 lines)
- `src/world.js` — tile map, entity seeds, decorations (145 lines)
- `design/SUBMISSION-KIT.md` — paste-ready store copy, cover/screenshot assets, entry checklist
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — traversal prover
- `tools/tpos-check.mjs` — skill-tree layout drift guard + PAL/gear-range check
- `dist/wavedash/` — Wavedash platform variant
