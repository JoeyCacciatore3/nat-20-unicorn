# UNI-CORN
### Hooves of Hope

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. The DARKNESS stole the world's color; you are the last
unicorn. Name your unicorn, cross five themed zones, defeat five DARK CORNS, and reclaim
the five RAINBOW SHARDS that restore the world. STR-based combat with LUCK-driven crits
and stat allocation.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +3 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point
- **Skill tree:** 3-tier gated tree, 10 single-rank skills — all player-chosen
- **Equipment:** enemies drop colored body-part gear that recolors the matching part of your unicorn, wears a tier trim (silver/gold/prismatic), AND gives stat bonuses
- **Level 15 cap:** APOTHEOSIS (+2 ATK, +2 max HP)
- **XP curve:** quadratic (`L*L + 12`) — early levels quick, later levels earned

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Everyone starts the same neutral white unicorn — NEW GAME asks ONE thing (your name), right on the title screen; 3 save slots (name + level shown on CONTINUE)
- Gear comes from the shared loot roll — LUCK raises the chance and tier; elites & bosses roll it more times (higher chance, never guaranteed). Vibrant colors are earned.
- **5-slot inventory** (+5 SADDLE BAG, +5 SADDLE BAGS = 15 max). Click to select, click again to equip or consume; X to discard.
- Gear icons and drops render with the SAME primitives as the unicorn's own body — a HORN drop looks like the horn on the unicorn.

## Combat
`damage = ATK × (crit ? 2 : 1)` where `ATK = STR + horn_gear + apotheosis`
- Crit chance: 8% + LUCK × 2% (LUCK-driven, no dice)
- Defense: `max(incoming/4, incoming - DEF)` — bosses always deal ≥25%
- 6 enemy kinds built from one capability-bit system + elite variants
- Enemies scale by zone tier (HP ×1-3, +0-4 damage)
- 5 named boss Mares — each holds one rainbow band (R-O-Y-B-V):
  - **DARK RED CORN** (Meadow) → **DARK ORANGE CORN** (Cave) → **DARK YELLOW CORN** (Cliffs) → **DARK BLUE CORN** (Peak) → **DARK VIOLET CORN** (Depths, final)

## Item Drops
One loot roll (`d100 + LUCK×4`) for every kill and chest:
- **HP POTION** (red bottle, +3 HP) — floor
- **MP POTION** (blue bottle, +3 MP) — mid
- **GEAR PART** (BODY/MANE/HORN/HOOVES) — ceiling, LUCK boosts tier

Drops spawn with a 0.6s grace window (visible on screen before magnetizing to the player). Consumables **auto-consume** if the relevant stat isn't full, else land in inventory for later. XP comes only from kills.

**RAINBOW SHARDS** are progression tokens (not items): each DARK CORN surrenders one on defeat, auto-collected. Boss defeat also restores full HP + MP. Collect all 5 → THE DARKNESS LIFTS.

## Skill Tree
3-tier gated tree, 10 skills. Tiers unlock by total skills purchased:
- **Tier 1** (free): SHOT, HEAL, DASH
- **Tier 2** (need 2): FAR SHOT, DBL JUMP, LONG DASH, SADDLE BAG
- **Tier 3** (need 5): SUPER HEAL, TRI JUMP, SADDLE BAGS

Locked tiers show "?". Purchased = gold glow, available = pulsing cyan.

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A/D or ←→ | Floating joystick (left 40%) |
| Jump (hold = higher) | Space / W / ↑ | JUMP button |
| Dash (skill-gated) | J | DASH button |
| Shoot (skill-gated) | L | SHOT button |
| Heal (skill-gated, hold) | H | HEAL button |
| Interact (hearth / chest / portal) | Space (near) | JUMP (near) |
| Pause / character sheet | P | Scroll icon |
| Save + exit option | — | Floppy icon |
| Mute toggle | — | Speaker icon |
| Controls help | — | ? icon |

Dash starts at half distance; LONG DASH doubles it. Dash also breaks cracked walls (tile 4).

## World
Five themed zones connected by rainbow portals:
- **MEADOW** (hub) — starting field, holds DARK RED CORN + 4 portals to the other zones
- **CAVE** — underground burrow, DARK ORANGE CORN
- **CLIFFS** — wind-swept heights, DARK YELLOW CORN
- **PEAK** — icy summit, DARK BLUE CORN
- **DEPTHS** — corrupted core, DARK VIOLET CORN (final)

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

**Current: 12,751 / 13,312 B (95.8%) — 561 B free**

## Save format
Keys: `localStorage.n20_s0..2` (3 slots). Version: **v34** — strict version gate, auto-discards older saves.
Fields: `{v, h(p), x(p), l(vl), n(mn), g(bosses), t(stats), c(checkpoint), d(pending), k(spts), y(su[10]), m(name), o(chestBits), z(zone), u(col[4]), q(eq[4]), i(inv[]), p(mute)}`.

## Structure
- `src/main.js` — the game (~1,340 lines)
- `src/world.js` — 5 zone tile maps, entity seeds, `loadZone(i)` swapper (~205 lines)
- `design/SUBMISSION-KIT.md` — paste-ready store copy, cover/screenshot assets, entry checklist
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — per-zone traversal prover (portals/bosses/chests reachable at expected tier)
- `tools/tpos-check.mjs` — skill-tree layout drift guard + PAL/gear-range check
- `dist/wavedash/` — Wavedash platform variant
