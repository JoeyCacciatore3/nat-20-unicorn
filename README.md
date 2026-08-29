# UNI-CORN
### the last savior

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. Name your unicorn, pick its colors, explore a
vibrant connected world, defeat 5 bosses, and collect 5 golden rainbow shards
to win. D&D-inspired combat with dice rolls, crits, and stat allocation.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +3 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point
- **Skill tree:** 19 nodes in 3 branches (⚔ FURY / 🛡 VIGOR / 💨 FINESSE) — all player-chosen
- **Equipment:** enemies drop colored gear that changes your unicorn's appearance AND gives stat bonuses
- **Die milestones:** d4 → d6 (L3) → d8 (L6) → d10 (L9) → d12 (L12)
- **Level 15 cap:** APOTHEOSIS (+2 dmg, +2 max HP)

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Start with 5 neutral colors (SNOW/CREAM/SILVER/ONYX/WHITE)
- Elites drop +1 gear, bosses drop +2 gear — vibrant colors are earned
- 5-slot inventory bag, auto-equip if better than current

## Combat
`damage = (roll(die) + STR + equipment - 1) × (crit ? 2 : 1)`
- Crit on max roll (PRECISE skill ranks expand crit range)
- Defense subtracts from incoming damage (min 1)
- 3 enemy tiers + elite variants + 5 bosses with phase-2 abilities

## Item Drops
Heart (+3 HP) · Mana potion (+2 MP) · XP gem · Rainbow (rare full heal) ·
Golden rainbow shard (boss first-kill only) · Equipment gear (elite/boss only)

## Skill Tree (3 branches, 19 nodes)
**⚔ FURY:** LUNGE · SHOT · RANGE(×2) · FOCUS(×2) · PRECISE(×3) · PIERCE · BLEED
**🛡 VIGOR:** HEAL · MEND+(×2) · TOUGH(×2) · REGEN · SIPHON(×2) · WARD
**💨 FINESSE:** DBL JMP · JMP+1 · DASH · RAZOR · SWIFT(×2) · NIMBLE

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A/D or ←→ | Floating joystick (left 40%) |
| Jump (hold = higher) | Space / Z / K / W / ↑ | ▲ button |
| Horn swipe (earns mana) | J / X | ⚔ button |
| Rainbow shot (costs mana) | L / C | ✦ button (after SHOT skill) |
| Rainbow heal (hold, costs mana) | S / I | ＋ button (after HEAL skill) |
| Air dash | Shift / O | » button (after DASH skill) |
| Pause / character sheet | P / Esc | ☰ top-right |

Joystick also navigates menus (up/down to select, right to confirm).

## World
Single vibrant zone — blue sky with white parallax clouds, green rolling hills,
brown earth, green grass top layer. Decorations: trees, grass, rocks, flowers,
mushrooms. Universal danger color: pink-red spikes. Enemies and bosses respawn.

## Build
Requires **Node ≥ 20**.
```
npm install
npm run build    # map-audit → esbuild → terser → roadroller → zip → ECT
```
Build gates: map traversal audit (no stuck spots), 13,312 byte limit,
no external URLs, no unprefixed localStorage.

**Current: 12,370 / 13,312 B (92.9%)**

## Save format
Key: `localStorage.n20_save`. Version: **v21** — auto-discards older saves.
Equipment, inventory, skill ranks, boss state, palette indices all persisted.

## Structure
- `src/main.js` — the game (1,377 lines)
- `src/world.js` — tile map, entity seeds, decorations (143 lines)
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — traversal prover
- `dist/wavedash/` — Wavedash platform variant
