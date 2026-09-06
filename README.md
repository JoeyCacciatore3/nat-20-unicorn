# UNICORN
### Hooves of Hope

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. The DARKNESS stole the world's color; you are the last
unicorn. Name your unicorn, explore one contiguous world, defeat the DARK CORNS, and
reclaim the RAINBOW SHARDS that restore the world. STR-based combat with
LUCK-driven crits and stat allocation.

A **GREAT CORN** — a violet, gold-maned elder, boss-sized (matches the DARK CORN silhouette) — stands watch at the starting hearth. On a new game he opens an auto-playing intro: a back-and-forth of head-stemmed speech bubbles (bubble stems from whichever head is talking — his or the player's), advanced one bubble per tap. It sets up the goal (reclaim the shattered rainbow's shards, one per DARK CORN), nudges the controls, and points at the fire. Walk back and JUMP near him afterward for cycled re-talk quips.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +3 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point
- **Skill tree:** prerequisite-based tree, 10 single-rank action skills — all player-chosen
- **Equipment:** enemies drop colored body-part gear that recolors the matching part of your unicorn AND gives a stat bonus (its slot's stat, scaling with level; higher-level gear can carry a second sub-stat)
- **Level 15 cap** — all stat gains come from level-up points, no hidden cap bonus
- **XP curve:** quadratic (`L*L + 12`) — early levels quick, later levels earned
- **Leveling never pauses play.** Each level fully restores HP + MP; the top-right **☰ menu button glows rainbow** whenever you have points to spend. Allocation lives inside the ONE character menu (open via ☰ or P) — there is no separate level-up screen. The header is always `LV n` (cyan) + your name (gold); a **`+N`** shows centered under the unicorn for unspent stat points and above the skill tree for unspent skill points. **One cursor moves left/right across the stats AND into the skill tree**, and SPACE / tap spends the matching point (stat point on a stat, skill point on a skill). Close with ☰ or P. With no points it's simply a read-only character sheet. **On touch, the left joystick moves that cursor and the JUMP button confirms** — the same stick-and-button you play with, so the menu never forces precise cell-tapping.

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Everyone starts the same neutral white unicorn — **NEW GAME** jumps straight to the next empty save slot and asks ONE thing (your name — required), then begins; **CONTINUE** (greyed until you have a save) opens the 2-slot screen to pick which save to resume (name + level shown per slot). Both slots full → NEW GAME falls back to the slot screen.
- Gear comes from the shared loot roll — LUCK raises the drop chance; bosses drop guaranteed. Vibrant colors are earned.
- **10-slot inventory** for gear only (fixed max, no expansion). Tap a bag slot to select, tap again (or the EQUIP button / JUMP / Enter) to equip; DROP discards. Tap an equipped slot and confirm to UNEQUIP it back to the bag. Potions live exclusively in the bottom hot-bar (see below).
- Gear renders as pixel-art item icons — BODY→armor, MANE→cape, HORN→sword, HOOVES→boots — tinted by the drop's roll color (the same color it paints onto that body part when equipped). Identical in drops, the inventory grid, and the equipped slots.
- **Potion hot-bar:** two slots (HP red · MP blue) at bottom-center hold up to 5 each — tap/click to drink. Persistent — visible and tappable even in the character menu. Potions ONLY live here (no inventory spillover); if both slots are full a dropped potion stays on the ground until a slot frees.

## Combat
`damage = STR × (crit ? 2 : 1)` (STR = the `ho` stat, gear folded in)
- Crit chance: **12% + LUCK × 3%** — the same percentage also drives the loot-drop roll (one LUCK number, two effects)
- Defense: `max(incoming/4, incoming - DEF)` — bosses always deal ≥25%
- 6 enemy kinds built from one capability-bit system (no elites). All enemies are the same size.
- **One universal level scalar** `tier = 2 + (lvl>>2)` scales both HP AND damage for regular foes and bosses, so deep-zone enemies stay a real threat.
- Enemy melee (`base × tier/2`) and **ranged bolts scale identically** — a bolt carries the shooter's damage, so ranged stays as dangerous as melee (it's dodgeable).
- **I-frames, one 0.8s rule:** the player is red-and-invincible for 0.8s after a hit (red = invincible; stomp/respawn use silent invuln). Enemies get a 0.8s physical i-frame after a stomp/dash hit (shots exempt, so multi-shot skills still land) — you can no longer melt a boss by bouncing in place; you must vary attacks and reposition.
- **Only the player flashes** (red, on hurt). Enemies never flash.
- 7 **DARK CORN** bosses — all share the name; each is identified by its horn+mane color = the rainbow band it holds. All in the unified world:
  - RED (paddock east) · ORANGE (far east walkway) · YELLOW (canopy ledge) · BLUE (peak ledge) · VIOLET (depths west) · GREEN (east-arc summit) · INDIGO (final boss, world tree)
- All bosses use the **same 3-move kit** (jump + dash + shoot); difficulty scales with tier: HP = `(20 + bi×4) × tier`, damage = `(8 + bi) × tier/2`, speed = `1 + bi×0.1`. No enrage phase — pure HP/damage/speed tiers.
- Defeated DARK CORNs turn friendly — they linger at their arena as GREAT-CORN-purple NPCs (keeping their band horn+mane; eyes go white)

## Item Drops
A kill drops loot at chance `12% + LUCK×3%` (bosses guaranteed, 2 drops). Each drop is a flat **60% gear / 40% potion** split (potion = 50/50 HP/MP) — gear is the reward, not an afterthought:
- **HP POTION** (red bottle, +10 HP)
- **MP POTION** (blue bottle, +10 MP)
- **GEAR PART** (BODY/MANE/HORN/HOOVES) — primary stat bonus `1 + (lvl>>2)`; at LV4+ a ~50% chance of a second sub-stat (`1 + (lvl>>3)` on a different stat). No tiers — deeper gear is simply stronger.

Drops fall to the ground (landing on solid ground OR one-way platforms) and **stay there until you die** — no despawn timer, no auto-magnet. **HP/MP potions fill a two-slot hot-bar** (bottom-center, stack to 5 each) — **tap/click a slot to drink** (no auto-consume). **Gear** goes to the inventory to equip later. Potions NEVER enter the inventory — if the hot-bar slot is full the drop waits on the ground. Same for gear if the bag is full. XP comes only from kills.

**RAINBOW SHARDS** are progression tokens (not items): each DARK CORN surrenders one on defeat, auto-collected. Boss defeat also restores full HP + MP. Collect them all → THE DARKNESS LIFTS.

## Skill Tree
Prerequisite-based tree, 10 action skills across 4 visual rows. Unlocking a node opens its connected downstream nodes:
- **Row 1** (always available): SHOT, HEAL, DASH
- **Row 2**: DBL JUMP, LONG DASH
- **Row 3**: TRI JUMP
- **Row 4** (endgame capstones): SUPER HEAL, FAR SHOT, DBL SHOT, TRI SHOT

All skills are action abilities (ranged, healing, movement, or projectile upgrades). No stat-modifier skills. Picked nodes go gold; unpicked read a uniform muted gray. Diagonal connection lines show which nodes unlock which. Skills are spent in the character menu (open via the glowing ☰ or P) with the same left/right cursor as stats — one unified allocation flow, no separate skill-buying mode.

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
**One unified map (800×160 tiles = 12,800×2,560 px).** No portals, no zone transitions —
walk from any boss to any other. The DARK CORNS live in different regions:

- **Paddock** (center, x≈120) — spawn point, campfire, GREAT CORN guide, RED-band DARK CORN just east
- **Descent corridor** (x150-256) — subterranean pocket carved into the ground
- **East run** (x280-475) — DJ terraces, DASH gaps, TRI-JUMP stack, DARK ORANGE CORN far east
- **East arc** (x466-620) — bounce-mushroom ridges + vertical climb to the DARK GREEN CORN summit
- **Western terraces** (x40-118) — DJ climb to DARK YELLOW CORN on the canopy ledge
- **Peak** (x10-60, top) — DJ summit climb, DARK BLUE CORN on the peak ledge
- **Depths** (x10-139, deep west) — post-DASH corridor to DARK VIOLET CORN

Movement-ability gating (double-jump for terraces/peak, dash for depths corridor, bounce mushrooms + jumps for the east arc) controls the natural order you reach each boss. Every boss and chest is verified reachable by a build-time audit tool.

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

**Current: 13,130 / 13,312 B (98.6%) — 182 B free**

## Save format
Keys: `localStorage.n20_s0..1` (2 slots). Version: **v44** — strict version gate, auto-discards older saves.
Fields: `{v, h(p), x(p), l(vl), n(mn), g(bosses), t(stats), c(checkpoint), d(pending), k(spts), y(su), m(name), o(chestBits), u(col[4]), q(eq[4]), i(inv[])/gear items {s,c,b,u?,v?}, p(mute), P(potions [hp,mp])}`.

## Structure
- `src/main.js` — the game (~1,400 lines)
- `src/world.js` — unified MEADOW tile map + entity seeds + procedural scatter (~190 lines)
- `src/data.js` — static lookup tables (palette, foes, gear, skill tree, GREAT CORN dialogue)
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — traversal prover (bosses/chests reachable at expected ability tier)
- `tools/spike-audit.mjs` — placement safety (no chest/decor through spikes, no adjacent-tree crowding)
- `tools/tpos-check.mjs` — skill-tree layout drift guard + PAL/gear-range check
- `dist/wavedash/` — Wavedash platform variant
