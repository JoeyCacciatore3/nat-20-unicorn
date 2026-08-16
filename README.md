# NAT 20 UNICORN

Entry for [js13kGames 2026](https://js13kgames.com/) — theme: **Unicorns and Rainbows**.

You are the last unicorn miniature standing on a burned-out Dungeon Master's table.
Paint rainbows back into a grey campaign world, roll real d20s on every check,
build out your diorama home, and re-ignite the DM's imagination — one chapter at a time.

**Categories:** Desktop · Mobile · Online · WebXR (no-library) · Wavedash

## Constraints
- Final zip ≤ **13,312 bytes**, `index.html` at top level, zero external resources
- Zero console errors in latest Chrome + Firefox
- Hand-rolled WebGL2 — no libraries

## Develop
```
npm install
npm run dev      # Vite dev server
npm run build    # esbuild → terser → roadroller → inline → zip → advzip → byte gate
```
`build` fails if the zip exceeds 13,312 bytes or ships an external URL / unprefixed localStorage write.

## Structure
- `src/` — game source (readable, unmangled — this repo IS the submission source)
- `index.template.html` — production shell; JS inlined at build
- `build.mjs` — full pipeline + rules-compliance gates
- `research/` — byte-cost experiments
- `SIZELOG.md` — zip size over time
