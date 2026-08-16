# NAT 20 UNICORN

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

You are the last unicorn miniature standing on a burned-out Dungeon Master's table.
Paint rainbows back into a grey campaign world, roll real d20s on every check,
build out your diorama home, and re-ignite the DM's imagination — one chapter at a time.

**Categories:** Desktop · Mobile · Wavedash

## Constraints
- Final zip ≤ **13,312 bytes**, `index.html` at top level, zero external resources
- Zero console errors in latest Chrome + Firefox
- Hand-rolled WebGL2 — no libraries

## Controls
| | Desktop | Touch |
|---|---|---|
| Move | WASD / arrows | left-side virtual stick |
| Camera | mouse drag | right-side drag |
| Jump | Space | tap |
| Attack | click / F / J | ⚔️ button |
| Dodge | Shift | 💨 button |
| Interact | E / Enter | — |
| Badges | B | — |

## Develop
Requires **Node ≥ 20** and the `zip` CLI.
```
npm install
npm run dev      # Vite dev server
npm run build    # esbuild → GLSL squeeze → terser (full prop-mangle) → roadroller (pinned flags) → inline → zip → ECT → byte gate
```
`build` fails if the zip exceeds 13,312 bytes or ships an external URL / unprefixed localStorage write.

Roadroller flags are **pinned** in `build.mjs` for deterministic builds. After large
source changes, re-tune: `TUNE=1 node build.mjs`, then paste the printed
"use ... to replicate" flags into `ROADFLAGS`.

## Structure
- `src/` — game source (readable, unmangled — this repo IS the submission source)
- `index.html` — dev shell (Vite); `index.template.html` — production shell, JS inlined at build
- `build.mjs` — full pipeline + rules-compliance gates
- `tools/export-zone.mjs` — packs editor-authored terrain deltas into `src/zones.js`
- `.github/workflows/build.yml` — CI: build + byte gate + zip artifact
- `research/` — byte-cost experiments
- `SIZELOG.md` — zip size over time
- `POST-COMPO.md` — scope-creep parking lot
