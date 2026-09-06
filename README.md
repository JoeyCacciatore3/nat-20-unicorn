# HOOVES OF HOPE

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D pixel-art platformer-RPG. The DARKNESS stole the world's color; you are the last
unicorn. Name your unicorn, explore one contiguous world, defeat the DARK CORNS, and
reclaim the RAINBOW SHARDS that restore the world. STR-based combat with
LUCK-driven crits and stat allocation.

A **GREAT CORN** — a violet, gold-maned elder, boss-sized (matches the DARK CORN silhouette) — stands watch at the starting hearth. On a new game he opens an auto-playing intro: a back-and-forth of head-stemmed speech bubbles (bubble stems from whichever head is talking — his or the player's), advanced one bubble per tap. It sets up the goal (reclaim the shattered rainbow's shards, one per DARK CORN), nudges the controls, and points at the fire. Walk back and JUMP near him afterward for cycled re-talk quips.

**Categories:** Desktop · Mobile · Wavedash

## Progression
- **Every level:** +2 stat points (STR/HP/MAG/DEF/LUCK) + 1 skill point (skill pts cap at LV11 = 10 total, one per tree node)
- **Skill tree:** **level-gated rows** (no prerequisite lines) — Row 1 at LV1, Row 2 at LV3, Row 3 at LV6, Row 4 at LV9. 10 single-rank action skills, all player-chosen.
- **Equipment:** enemies drop colored body-part gear that recolors the matching part of your unicorn AND gives a stat bonus (its slot's stat, scaling with level; higher-level gear can carry a second sub-stat)
- **Level 20 cap** — all stat gains come from level-up points (40 total across the game)
- **XP curve:** quadratic (`L*L + 40`) — steady pace (~5 kills/level early), later levels earned
- **Level-up auto-pauses into the character menu** with the cursor on STR — you allocate points before returning to play. Each level fully restores HP + MP; the LEVEL UP rainbow banner renders over the menu for 1.8s. The character menu doubles as your always-open character sheet (open via ✕ · 🔊 · ? cluster's back button or P key). With no points to spend it's read-only.
- **Two auto-save moments:** level-up + respawn after death. Rainbow collect no longer auto-saves. Manual save via ✕ back button + EXIT GAME.

## Equipment
4 gear slots matching body parts: BODY(+HP), MANE(+MAG), HORN(+STR), HOOVES(+DEF).
- Everyone starts the same neutral white unicorn — **ONE save slot**. Empty save → the title shows **NEW GAME**, which asks ONE thing (your name — required), then begins. Occupied save → the title shows your `NAME · LVx`, tapping it opens a **CONTINUE / DELETE** popup.
- Gear comes from the shared loot roll — LUCK raises the drop chance; bosses drop guaranteed. Vibrant colors are earned.
- **10-slot inventory** for gear only (fixed max, no expansion). Tap a bag slot to select, tap again (or the EQUIP button / JUMP / Enter) to equip; DROP discards. Tap an equipped slot to UNEQUIP it back to the bag. Potions live exclusively in the bottom hot-bar (see below). EQUIP / DROP buttons both use the shared blue `#8cf` accent (destructive red is retired from the menu).
- Gear renders as pixel-art item icons — BODY→armor, MANE→cape, HORN→sword, HOOVES→boots — tinted by the drop's roll color (the same color it paints onto that body part when equipped). Identical in drops, the inventory grid, and the equipped slots.
- **Potion hot-bar:** two slots (HP red · MP blue) at bottom-center hold up to 5 each — tap/click to drink. Persistent — visible and tappable even in the character menu. Potions ONLY live here (no inventory spillover); if both slots are full a dropped potion stays on the ground until a slot frees.

## Combat
Damage splits by attack type: **physical (DASH/STOMP) = STR**, **magic (SHOOT) = MAG** — both `× (crit ? 2 : 1)`, gear folded in. (MAG also sets max MP, so it's a real caster stat.)
- Crit chance: **12% + LUCK × 3%** — the same percentage also drives the loot-drop roll (one LUCK number, two effects)
- Defense: `max(incoming/4, incoming - DEF)` — bosses always deal ≥25%
- 6 enemy kinds built from one capability-bit system (no elites). All enemies are 20×20 (`cz=4`, matches player and boss size).
- **Quadratic enemy scaling** — matches the XP curve shape so high-level fights become endurance battles instead of one-shots:
  - Regular HP = `fh + (lvl*lvl >> 1)` (LV1: 4-12 HP · LV20: 204-212 HP)
  - Regular dmg = `fd + (lvl>>2)` (grows +1 every 4 levels)
  - Boss HP = `(20 + bi*4) + lvl*lvl` (double-quadratic — 5-11 hit fights across all levels)
  - Boss dmg = `(8 + bi) + (lvl>>2)`, speed = `1 + bi*0.1`
- Ranged bolts carry the shooter's damage — a caster's bolt is as dangerous as its melee (it's dodgeable).
- **Universal 0.8s invuln channel with color-coded flashes:**
  - 🔴 Red flash = 0.8s after taking damage
  - 🟢 Green flash = 0.8s after HEAL cast
  - Dash = 0.4s silent invuln (the dash motion IS the tell — no flash needed)
  - Stomp = 0.2s silent invuln (technical anti-double-hit vs adjacent foes)
  - Respawn = 1.5s silent invuln (spawn safety padding)
- Enemies get a 0.8s physical i-frame (`f.fl`) after a stomp/dash hit so you can't melt them by bouncing in place — vary attacks and reposition.
- **Damage popups float above whoever took the hit** — red `-N` over the player when hurt, red `-N` over the enemy when you hit them (crit lingers longer + hitstop + fanfare).
- **Every other player-side popup routes to ONE spot above the potion hot-bar** (`PFX, PFY`, 8px bold monospace) — XP gained, MP costs, HEAL amount, potion quaffs, gear pickups, potion pickups. Colors are semantic (red=damage · green=HP · blue=MP · purple=XP · #8cf blue=+BAG).
- 7 **DARK CORN** bosses — all share the name; each is identified by its horn+mane color = the rainbow band it holds. All in one unified world (see World below).
- All bosses use the **full 3-move unicorn kit** (cap=19 = ranged + hop + chase). Bosses are the only enemies that use the exact player-parity attack combo.
- Defeated DARK CORNs turn friendly — they linger at their arena as GREAT-CORN-purple NPCs (keeping their band horn+mane; eyes go white).

## Enemy Attack Matrix
Each of the 6 regular enemies has a unique capability-bit combo (cap bits: 1=ranged, 2=hop, 16=chase). Bosses use cap=19 (all three).

| k | Body | Cap | Ranged | Hop | Chase | Feel |
|---|---|---|---|---|---|---|
| 1 | small quadruped (pink) | 2 | | ✓ | | leaping puddle |
| 2 | dome + tendrils (teal) | 17 | ✓ | | ✓ | drifting stalker-spitter |
| 3 | hooded caster (violet) | 19 | ✓ | ✓ | ✓ | mini-boss (full kit) |
| 4 | racing sled (orange) | 16 | | | ✓ | ground rush (fast) |
| 5 | tall hopper (gold) | 18 | | ✓ | ✓ | frog leaper |
| 6 | spiked floater (purple) | 3 | ✓ | ✓ | | bouncing sniper |

Contact damage universal on all 6. Ranged enemies show a stationary skull sprite at their center for 0.5s before firing — the same skull that then launches as the projectile (no separate windup graphic).

## Item Drops
A kill drops loot at chance `12% + LUCK×3%` (bosses guaranteed, 2 drops + a rainbow). Each drop is a flat **60% gear / 40% potion** split (potion = 50/50 HP/MP):
- **HP POTION** (red bottle, +10 HP)
- **MP POTION** (blue bottle, +10 MP)
- **GEAR PART** (BODY/MANE/HORN/HOOVES) — primary stat bonus `1 + (lvl>>2)`; at LV4+ a ~50% chance of a second sub-stat (`1 + (lvl>>3)` on a different stat). No tiers — deeper gear is simply stronger.

Drops fall to the ground and land on **any non-air tile** (solid, one-way platform, AND spike tops — drops sit on top of spikes like any other surface). They stay until you die — no despawn timer, no auto-magnet. **HP/MP potions fill the two-slot hot-bar** (bottom-center, stack to 5 each) — tap/click to drink. **Gear** goes to the inventory. Potions NEVER enter the inventory — if the hot-bar slot is full the drop waits on the ground. Same for gear if the bag is full. XP comes only from kills.

**RAINBOW SHARDS** are progression tokens (not items): each DARK CORN surrenders one on defeat, auto-collected. Boss defeat also restores full HP + MP. Collect all 7 → THE DARKNESS LIFTS.

## Skill Tree
10 single-rank action skills in a 3-2-3-2 grid, unlocked by **row-level gates** (no prerequisite lines — pure "reach LV X to buy this row"):

- **Row 1 (LV1):** SHOT · HEAL · DASH
- **Row 2 (LV3):** DBL JUMP · LONG DASH
- **Row 3 (LV6):** TRI JUMP · SUPER HEAL · DBL SHOT
- **Row 4 (LV9):** FAR SHOT · TRI SHOT

By LV11 every node is buyable AND you have exactly 10 skill points earned → every node reachable. Locked rows read dim; unlocked rows are bright. Owned nodes are blue-highlighted (matching the shared `#8cf` interactive accent). No connection lines — the grid speaks for itself.

## Controls
| | Keyboard | Touch |
|---|---|---|
| Move | A/D or ←→ | Floating joystick (left 40%) |
| Jump (hold = higher) | Space / W / ↑ | JUMP button |
| Dash (skill-gated) | J | DASH button |
| Shoot (skill-gated) | L | SHOT button |
| Heal (skill-gated) | H | HEAL button |
| Interact (hearth / chest) | Space (near) | JUMP (near) |
| Menu / allocate / character sheet | P | Auto-opens on level-up · ✕ back button toggles |
| Save + exit option | — | ✕ (back button) → SAVE + EXIT popup |
| Mute toggle | M | 🔊 speaker icon (muted state: dim cone + red slash) |
| Controls help | — | ? icon |

Every touchable control shares one visual language: dark rgba(15,15,20,.75) fill + `#8cf` blue outline — joystick, action buttons, top-right cluster (🔊 · ? · ✕), and the top-left character panel all match.

Dash starts at half distance; LONG DASH doubles it.

## World
**One unified map (600×160 tiles = 9,600×2,560 px).** No portals, no zone transitions —
walk from any boss to any other. **7 zones for 7 DARK CORNS:**

| Zone | x-range | Boss | Placement |
|---|---|---|---|
| PEAK | 0-39 | BLUE | peak ledge |
| CANOPY | 40-111 | YELLOW | canopy ledge |
| MEADOW | 112-279 | RED | paddock east |
| EAST RUN | 280-475 | ORANGE | far east walkway |
| SUMMIT | 476-600 | GREEN | east-arc summit |
| UNDER-DEPTHS | y>63 (shallow) | VIOLET | depths corridor |
| UNDER-CAVERN | y>72 (deep) | INDIGO | final boss chamber |

Movement-ability gating (double-jump for terraces/peak, dash for depths corridor, bounce mushrooms + jumps for the east arc) controls the natural order you reach each boss. Every boss and chest is verified reachable by a build-time audit tool.

**Color palette rules:** Sky `#6bc5ff` and grass `#5ac878` are RESERVED for background; enemies and gear use warm saturated colors that pop against the sky. Enemy palette regrouped for max contrast + universal 1px black outline for figure/ground pop. HP = green (`#6cf279`, matches heal cross/button/potion), MP = blue (`#4a76ff`), interactive accent = `#8cf`, damage = red (`#ff5d6c`), XP = purple (`#b06cf0`). Rainbow strobing is reserved for the level-up banner + rainbow shard drops — everywhere else color signals a specific meaning.

## Build
Requires **Node ≥ 20**.
```
npm install
npm run build    # map-audit → tpos-check → esbuild → terser → roadroller → zip → ECT
```
Build gates: map traversal audit (no stuck spots, all bosses/chests reachable at expected tier), placement audit (spike/decor overlap safety), TPOS drift check (skill-tree layout matches TREE), 13,312 byte limit, no external URLs, no unprefixed localStorage.

**Current: 13,039 / 13,312 B (97.9%) — 273 B free**

## Save format
Keys: `localStorage.n20_s0` (one slot). Version: **v44** — strict version gate, auto-discards older saves.

Fields (14 total): `{v, h(p), x(p), l(vl), n(mn), g(bosses[7]), t(stats[STR,HP,MAG,DEF,LUCK]), d(pending), k(spts), y(su[10]), m(name), o(chestBits), q(eq[4]), i(inv[]), P(potions [hp,mp])}`.

Not saved: `col` (derived from `eq` at load — one source of truth), `mute` (runtime-only), dialogue state (transient), foes/chests (reseeded), physics/timers.

## Structure
- `src/main.js` — the game (~1,400 lines)
- `src/world.js` — unified MEADOW tile map + entity seeds + procedural scatter (~190 lines)
- `src/data.js` — static lookup tables (palette, foes, gear, skill tree, GREAT CORN dialogue)
- `build.mjs` — full pipeline + compliance gates
- `tools/map-audit.mjs` — traversal prover (bosses/chests reachable at expected ability tier)
- `tools/spike-audit.mjs` — placement safety (no chest/decor through spikes, no adjacent-tree crowding)
- `tools/tpos-check.mjs` — skill-tree layout drift guard + PAL/gear-range check
- `dist/wavedash/` — Wavedash platform variant
