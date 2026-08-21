# NAT 20 UNICORN

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

A 2D **metroidvania platformer-RPG** on a Dungeon Master's tabletop gone gray.
You are the last painted mini. Explore one connected map, defeat the shard
Guardians, and choose how you grow: every damage number is a visible die roll
(`d8+3`), stats and D&D-style perks (Advantage, Keen crits, reroll 1s) are
picked at level-up, and movement skills — double jump, rainbow heal, rainbow
shot, air dash — re-open the world Metroid-style. Each freed shard repaints a
region of the diorama.

**Categories:** Desktop · Mobile · Wavedash

## Controls
| | Keyboard | Buttons (mouse/touch) |
|---|---|---|
| Move | A/D or ←→ | ◀ ▶ (touch dpad) |
| Jump (hold = higher) | Space / Z / K / W / ↑ | ▲ |
| Drop through platform | S / ↓ | ▼ (touch) |
| Horn swipe (earns ✦) | J / X | ⚔ |
| Rainbow shot (✦3) | L / C | ✦ |
| Rainbow heal (✦5, rooted) | hold S / I | ＋ |
| Air dash | Shift / O | » |
| Interact / rest+save | E | E |
| Hearth shop (at the fire) | B | tap rows |

On-screen buttons are always clickable with the mouse; skill buttons appear as
skills are learned.

## Design laws
- **Map Laws** (`src/world.js` header): pit depth, shaft rungs, jump spacing,
  ceilings, ability gates, and the **Return Law** — every reachable spot can
  return to the one home campfire.
- `tools/map-audit.mjs` **proves** the Return Law + shard-gating order per
  ability tier at build time. The build fails on any stuck spot.
- Jump physics are fixed constants — never stat-scaled — so the proofs hold.

## Constraints
- Final zip ≤ **13,312 bytes**, `index.html` at top level, zero external resources
- Zero console errors in latest Chrome + Firefox
- Canvas 2D, hand-rolled everything — no libraries

## Develop
Requires **Node ≥ 20** and the `zip` CLI.
```
npm install
npm run build    # map audit → esbuild → terser → roadroller → inline → zip → ECT → byte gate
npm run serve    # serve dist/ on :8080
```
`build` fails if the map audit finds a stuck spot, the zip exceeds 13,312 bytes,
or the bundle ships an external URL / unprefixed localStorage write.

Roadroller flags are **pinned** in `build.mjs` for deterministic builds. After large
source changes, re-tune: `TUNE=1 node build.mjs`, then paste the printed
"use ... to replicate" flags into `ROADFLAGS`.

## Structure
- `src/main.js` — the game (input, verbs, RPG 2.0, entities, render)
- `src/world.js` — tile map, regions, entity seeds + the Map Laws
- `index.template.html` — production shell, JS inlined at build
- `build.mjs` — full pipeline + rules-compliance gates (incl. map audit)
- `tools/map-audit.mjs` — Return Law / gate-order prover
- `dist/wavedash/` — Wavedash build variant (platform glue + achievement mirror)
- `SIZELOG.md` — zip size over time
