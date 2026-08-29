# NAT 20 UNICORN

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D **metroidvania platformer-RPG** on a Dungeon Master's tabletop gone gray.
Name your unicorn, pick a class, and become the last painted mini. Explore one
connected map, defeat five shard Guardians to repaint the world, and grow through
15 levels of D&D-flavored progression — every damage number is a visible die
roll (`d8+3`, crits are `NAT 20!`), stats and perks are picked at level-up, and
movement skills unlock as you gain levels, re-opening the world Metroid-style.

**Categories:** Desktop · Mobile · Wavedash

## Character creation
On boot: **NEW GAME** or **CONTINUE** (if a save exists). Name up to 8 letters
(default `HORSE` if you tap through on mobile). At **LV3** the die grows and you
pick a class:

| Class | Starter perk | Stat pip | Passive |
|---|---|---|---|
| **RAMPART** | KEEN HORN | +1 HEART (max ♥) | tanky melee build |
| **PRISM**   | SCHOLAR   | +1 SPARK (max ✦) | spellcaster build |
| **ROGUE**   | REROLL 1s | +1 HORN          | −25% dash cooldown |

## Progression
**Die milestones** (Zelda-heart law): LV1 `d4` · LV3 `d6` · LV6 `d8` · LV9 `d10`
· LV12 `d12` · LV15 **APOTHEOSIS** (+2 dmg, +1 max ♥, full heal, XP→sparks 1:1
forever).

**Skill unlocks — level-gated, no combat prerequisite:**
LV3 DBL JUMP · LV5 RAINBOW HEAL · LV7 RAINBOW SHOT · LV9 AIR DASH.

**Shards** stay meaningful: killing each Guardian drops a rainbow shard that
repaints its region and grants a bonus level.

**Perks** — 13-slot pool, random 3-of-remaining offered every even level:
KEEN HORN · ADVANTAGE · REROLL 1s · MANA FONT · IRON HIDE · SCHOLAR · PIERCE ·
STOMP SPARK · BLOODLETTER · THIRST · NIMBLE · STARSEEKER · OVERCHANNEL.

**Elites** — ~17% of tier-1/2 spawns roll champion (bigger, gold aura, +HP,
+contact dmg). Kill drops a random un-owned perk instantly (or 6 sparks if all
owned). Mini-boss combat outside the guardian arenas.

## Controls
### Title / name entry
| Screen | Keys |
|---|---|
| Title menu | ↑↓ or `1`/`2` to select, Enter/Space to accept, tap = advance (mobile) |
| Name entry | A–Z (max 8), Backspace, Enter to accept, tap = accept current buffer |

### In-game
| | Keyboard | Buttons (mouse/touch) |
|---|---|---|
| Move | A/D or ←→ | ◀ ▶ (touch dpad) |
| Jump (hold = higher) | Space / Z / K / W / ↑ | ▲ |
| Drop through platform | S / ↓ | ▼ (touch) |
| Horn swipe (earns ✦) | J / X | ⚔ |
| Rainbow shot (✦3) | L / C | ✦ |
| Rainbow heal (✦5 · ✦4 w/ OVERCHANNEL, rooted) | hold S / I | ＋ |
| Air dash | Shift / O | » |
| Interact / rest+save | E | E |
| Hearth shop (at the fire) | B | tap rows |
| Level-up menu | 1-3 or ↑↓ + Enter | tap row |
| **Pause / character sheet** | **P or ESC** | **☰ top-right, tap anywhere to close** |

On-screen buttons are always clickable with the mouse; skill buttons appear as
skills are learned.

## Design laws
- **Map Laws** (`src/world.js` header): pit depth, shaft rungs, jump spacing,
  ceilings, ability gates, and the **Return Law** — every reachable spot can
  return to the one home campfire.
- `tools/map-audit.mjs` **proves** the Return Law + gate-tier progression at
  build time. The build fails on any stuck spot.
- Jump physics are fixed constants — never stat-scaled — so the proofs hold.
- **ONE-fire law** — a single home campfire (the Paddock). Save/rest/shop all
  happen there; the rest of the map is deathwalk.

## Constraints
- Final zip ≤ **13,312 bytes**, `index.html` at top level, zero external resources
- Zero console errors in latest Chrome + Firefox
- Canvas 2D, hand-rolled everything — no libraries
- DPR-aware canvas with `imageSmoothingEnabled=false` (crisp pixel art on retina)
- `visualViewport` sizing (correct on iOS with the URL bar shrink/grow)

## Develop
Requires **Node ≥ 20** and the `zip` CLI.
```
npm install
npm run build    # map audit → esbuild → terser → roadroller → inline → zip → ECT → byte gate
npm run serve    # serve dist/ on :8080
```
`build` fails if the map audit finds a stuck spot, the zip exceeds 13,312 bytes,
or the bundle ships an external URL / unprefixed localStorage write.

Roadroller flags are **pinned** in `build.mjs` for deterministic builds. After
large source changes, re-tune: `TUNE=1 node build.mjs`, then paste the printed
"use ... to replicate" flags into `ROADFLAGS`.

## HUD design
The gameplay HUD is deliberately minimal (WANDR HUD frequency/urgency guidance):
only decision-relevant elements earn permanent screen slots.

- **Bottom-left cluster** — hearts, mana pips (contextual: fade when full),
  D&D damage line (`🎲d8+3`), sparks currency. Near the thumb, near the action.
- **Top-right pause icon** (☰) — opens the character sheet
- **Top-center level-up hint** — only visible for 5 s after leveling up OR when
  ≥ 75 % of the way to the next level
- **DM voice** — bottom-center speech plate, only when the DM has a line
- **All HUD text** — 2 px dark outline (`strokeText` + `fillText`) so it stays
  legible over meadow, cave, or shockwave backgrounds

The **pause overlay** hosts identity chrome that used to squat on gameplay HUD:
full character name, class, level, XP progress, all stats, owned perks, owned
skills, shard count.

Touch controls follow modern mobile-first spacing (Apple HIG 44 pt / Material
48 dp): jump/attack buttons are 44–56 px tap zones, semi-transparent so they
don't occlude sprites, in the natural thumb arc (bottom-right cluster). Viewport
uses `viewport-fit=cover` for edge-to-edge on notched devices; HUD is inset
~8 px so nothing important sits under a Dynamic Island / home indicator.

## Save format
Key: `localStorage.n20_save`. Version pinned in-file (`d.v !== N` → discard).
Current version: **v7** — adds `f` (seen-flags bitfield: tutorial hints don't
re-spam across sessions). Prior fields: `k` (class), `m` (player name).
Version bumps discard prior saves rather than migrating; the game is early
enough that mid-run states can't survive a rules change intact.

## Troubleshooting — the obvious route
| Symptom | Where to look |
|---|---|
| Build fails: `X over 13312 B` | `SIZELOG.md` — recent trend; try a smaller add or revert the last change |
| Build fails: `map audit` | `tools/map-audit.mjs` output prints the failing tile/rule; fix in `src/world.js` |
| Build fails: `external URL` / `localStorage` | `build.mjs` grep-gate — remove the offending line or prefix save key |
| Roadroller warns about flag mismatch | Re-tune: `TUNE=1 node build.mjs`, paste output into `ROADFLAGS` |
| Game boots to a black title | Check the `pName` in save is a string; nuke `localStorage.n20_save` in devtools |
| Loading an older save silently starts fresh | Expected — `d.v` version pin. Bump `v` in code intentionally when the shape changes |
| Enemy sprite renders wrong | The four sprite functions (Doubtling/Gloomer/Gloomcast/Guardian) live inline in the render loop; each is a self-contained `ctx.save/translate/scale/restore` block |
| Skill won't unlock at expected level | `SKILL_MIN` table in `src/main.js` — a bitmask keyed on level threshold |

## Structure
- `src/main.js` — the game (input, verbs, RPG, entities, articulated sprites, render)
- `src/world.js` — tile map, regions, entity seeds + the Map Laws
- `index.template.html` — production shell, JS inlined at build
- `build.mjs` — full pipeline + rules-compliance gates (incl. map audit)
- `tools/map-audit.mjs` — Return Law / gate-tier prover
- `dist/wavedash/` — Wavedash build variant (platform glue + achievement mirror)
- `POST-COMPO.md` — parked ideas (scope-creep lot; deliberately empty during compo)
- `SIZELOG.md` — zip size over time (auto-appended per build)
