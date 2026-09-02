# UNICORN
### Hooves of Hope

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. The DARKNESS stole the world's color; you are the last
unicorn. Name your unicorn, explore one contiguous world, defeat five DARK CORNS, and
reclaim the five RAINBOW SHARDS that restore the world. STR-based combat with
LUCK-driven crits and stat allocation.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +3 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point
- **Skill tree:** prerequisite-based tree, 12 single-rank skills — all player-chosen
- **Equipment:** enemies drop colored body-part gear that recolors the matching part of your unicorn, wears a tier trim (silver/gold/prismatic), AND gives stat bonuses
- **Level 15 cap** — all stat gains come from level-up points, no hidden cap bonus
- **XP curve:** quadratic (`L*L + 12`) — early levels quick, later levels earned
- **Leveling never pauses play.** Each level fully restores HP + MP; the top-right **☰ menu button glows rainbow** whenever you have points to spend. Allocation lives inside the ONE character menu (open via ☰ or P) — there is no separate level-up screen. The header is always `LV n` (cyan) + your name (gold); a **`+N`** shows centered under the unicorn for unspent stat points and above the skill tree for unspent skill points. **One cursor moves left/right across the stats AND into the skill tree**, and SPACE / tap spends the matching point (stat point on a stat, skill point on a skill). Close with ☰ or P. With no points it's simply a read-only character sheet.

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Everyone starts the same neutral white unicorn — **NEW GAME** jumps straight to the next empty save slot and asks ONE thing (your name — required), then begins; **CONTINUE** (greyed until you have a save) opens the 2-slot screen to pick which save to resume (name + level shown per slot). Both slots full → NEW GAME falls back to the slot screen.
- Gear comes from the shared loot roll — LUCK raises the chance and tier; elites & bosses roll it more times (higher chance, never guaranteed). Vibrant colors are earned.
- **5-slot inventory** for gear only (+5 via STASH skill = 10 max). Click to select, click again to equip; X to discard. Potions live exclusively in the bottom hot-bar (see below).
- Gear icons and drops render with the SAME primitives as the unicorn's own body — a HORN drop looks like the horn on the unicorn.
- **Potion hot-bar:** two slots (HP red · MP blue) at bottom-center hold up to 5 each — tap/click to drink. Persistent — visible and tappable even in the character menu. Potions ONLY live here (no inventory spillover); if both slots are full a dropped potion stays on the ground until a slot frees.

## Combat
`damage = ATK × (crit ? 2 : 1)` where `ATK = STR + horn_gear`
- Crit chance: 8% + LUCK × 2% (LUCK-driven, no dice)
- Defense: `max(incoming/4, incoming - DEF)` — bosses always deal ≥25%
- 6 enemy kinds built from one capability-bit system + elite variants (~6% roll, 3× HP)
- Enemies scale with player level (`2 + lvl>>2`) — stay a threat as you level
- 5 named boss Mares — each holds one rainbow band (R-O-Y-B-V), all in the unified world:
  - **DARK RED CORN** (paddock east) · **DARK ORANGE CORN** (far east walkway) · **DARK YELLOW CORN** (canopy ledge, DJ) · **DARK BLUE CORN** (peak ledge, DJ) · **DARK VIOLET CORN** (depths west, DASH)
- Per-boss damage ramp: RED 8, ORANGE 9, YELLOW 10, BLUE 11, VIOLET 12

## Item Drops
One loot roll (`d100 + LUCK×4`) for every kill and chest:
- **HP POTION** (red bottle, +10 HP) — floor
- **MP POTION** (blue bottle, +10 MP) — mid
- **GEAR PART** (BODY/MANE/HORN/HOOVES) — ceiling, LUCK boosts tier

Drops fall to the ground and **stay there until you die** — no despawn timer, no auto-magnet (drops obey the same persistence rule as enemies). **HP/MP potions fill a two-slot hot-bar** (bottom-center, stack to 5 each) — **tap/click a slot to drink** (no auto-consume). **Gear** goes to the inventory to equip later. Potions NEVER enter the inventory — if the hot-bar slot is full the drop simply waits on the ground until you drink one. Same for gear if the bag is full. XP comes only from kills.

**RAINBOW SHARDS** are progression tokens (not items): each DARK CORN surrenders one on defeat, auto-collected. Boss defeat also restores full HP + MP. Collect all 5 → THE DARKNESS LIFTS.

## Skill Tree
Prerequisite-based tree, 12 skills across 4 visual rows. Unlocking a node opens its connected downstream nodes:
- **Row 1** (always available): SHOT, HEAL, DASH
- **Row 2**: MP +5, DBL JUMP, LONG DASH, STASH
- **Row 3**: HP +5, TRI JUMP, POT +5
- **Row 4** (endgame capstones): SUPER HEAL, FAR SHOT

Picked nodes go gold; unpicked read a uniform muted gray. Diagonal connection lines show which nodes unlock which. Skills are spent in the character menu (open via the glowing ☰ or P) with the same left/right cursor as stats — one unified allocation flow, no separate skill-buying mode.

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A/D or ←→ | Floating joystick (left 40%) |
| Jump (hold = higher) | Space / W / ↑ | JUMP button |
| Dash (skill-gated) | J | DASH button |
| Shoot (skill-gated) | L | SHOT button |
| Heal (skill-gated) | H | HEAL button |
| Interact (hearth / chest) | Space (near) | JUMP (near) |
| Menu / allocate / character sheet | P | ☰ icon (glows when points to spend) |
| Save + exit option | — | Floppy icon |
| Mute toggle | — | Speaker icon |
| Controls help | — | ? icon |

Dash starts at half distance; LONG DASH doubles it.

## World
**One unified map (600×120 tiles = 7,680×1,920 px).** No portals, no zone transitions —
walk from any boss to any other. The 5 DARK CORNS live in different regions:

- **Paddock** (center, x≈120) — spawn point, campfire, DARK RED CORN just east
- **Descent corridor** (x150-256) — subterranean pocket carved into the ground
- **East run** (x280-475) — DJ terraces, DASH gaps, TRI-JUMP stack, DARK ORANGE CORN far east
- **Western terraces** (x40-118) — DJ climb to DARK YELLOW CORN on the canopy ledge
- **Peak** (x10-60, top) — DJ summit climb, DARK BLUE CORN on the peak ledge
- **Depths** (x10-139, deep west) — post-DASH corridor to DARK VIOLET CORN

Movement-ability gating (double-jump for terraces/peak, dash for depths corridor) controls the natural order you reach each boss. Every boss and chest is verified reachable by a build-time audit tool.

**Color palette rules:** Sky `#6bc5ff` and grass `#5ac878` are RESERVED for background;
enemies and gear use warm saturated colors so silhouettes read against the sky.
HP = red (`#ff5d6c`), MP = blue (`#4a76ff`) — matches bar colors AND consumable colors.
Rainbow strobing is reserved for level-up indicators — everywhere else color signals a specific meaning.

## Build
Requires **Node ≥ 20**.
```
npm install
npm run build    # map-audit → tpos-check → esbuild → terser → roadroller → zip → ECT
```
Build gates: map traversal audit (no stuck spots, all bosses/chests reachable at expected tier), placement audit (spike/decor overlap safety), TPOS drift check (skill-tree layout matches TREE), 13,312 byte limit, no external URLs, no unprefixed localStorage.

**Current: 11,403 / 13,312 B (85.7%) — 1909 B free**

## Save format
Keys: `localStorage.n20_s0..1` (2 slots). Version: **v40** — strict version gate, auto-discards older saves.
Fields: `{v, h(p), x(p), l(vl), n(mn), g(bosses), t(stats), c(checkpoint), d(pending), k(spts), y(su[10]), m(name), o(chestBits), u(col[4]), q(eq[4]), i(inv[]), p(mute), P(potions [hp,mp])}`.

## Structure
- `src/main.js` — the game (~1,200 lines)
- `src/world.js` — unified MEADOW tile map + entity seeds + procedural scatter (~155 lines)
- `src/data.js` — static lookup tables (palette, foes, gear, skill tree, boss names)
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — traversal prover (bosses/chests reachable at expected ability tier)
- `tools/spike-audit.mjs` — placement safety (no chest/decor through spikes, no adjacent-tree crowding)
- `tools/tpos-check.mjs` — skill-tree layout drift guard + PAL/gear-range check
- `dist/wavedash/` — Wavedash platform variant
