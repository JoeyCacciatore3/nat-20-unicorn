# Submission Kit — UNI-CORN, Hooves of Hope

Copy is paste-ready. **State snapshot: 2026-09-02 — build 12,759 B (95.8%, 553 B free), save v34, 5-zone hub-and-spoke world with FOL densify + variety + hand-decor extensions + FOL keepout + all 14 deco placement fixes + 5 DARK CORN bosses (color-aligned) + combat audit cleanup + unified HP bar + unified combat text palette + unified top-right icon row (single box helper, hamburger menu replaces scroll, all 4 icons match character-menu inventory-slot style), all assets current, 8-achievement slate live on Wavedash.**

Primary sources verified 2026-08-29 (js13kgames.com/2026/blog/submit-form-open,
docs.wavedash.com/publishing/metadata + /content-guidelines). Terms unchanged.

## Names (keep identical everywhere)
- **Title:** `UNI-CORN, Hooves of Hope`
- js13k draft registration LOCKS the unique name — register early to claim it.
- Wavedash: title must be primarily Latin script ✅; URL slug is permanent, pick once.

---

## js13k submit form (js13kgames.com/submit — multistep, deadline Sep 13, 13:00 CEST)
Flow: register draft → upload zip (AUTOMATED IN-BROWSER TEST — console errors block;
roadroller games process slowly, may take extra seconds) → details → Presentation
(cover/thumbnails; auto-generated from a load screenshot until you complete it) →
team (prefilled from repo contributors) → submit. Draft stays editable until deadline.

**Description (Markdown supported):**

```markdown
**The DARKNESS stole the world's color, and you are the last unicorn left to restore it.**

Name your unicorn and cross five themed zones — MEADOW, CAVE, CLIFFS, PEAK, and DEPTHS
— to defeat the five DARK CORNS and reclaim the five RAINBOW SHARDS that bring the
color back.

- ⚔️ **STR-based combat** — damage scales with your stats and gear. LUCK boosts crit chance.
- 📈 **Full RPG** — 5 stats, a 10-node tiered skill tree, quadratic XP curve, and gear that
  appears on your unicorn's body, piece by piece (body/mane/horn/hooves).
- ⚔️ **6 enemy kinds + tiered variants** — sprinters, hoppers, casters… learn the colors,
  learn the moves. ~19% roll as TOUGH (bigger, +HP) and ~6% as SELECT (crowned elites,
  double HP + damage).
- 👑 **5 named boss Mares** — dark mirrors of yourself, each holding one rainbow band
  (R-O-Y-B-V), each with a phase-2 twist.
- 🌈 **Rainbow portals** connect the 5 zones from the MEADOW hub. Ability gates
  (double-jump, dash, magic bolt) control progression order.
- 🎒 **5-slot inventory** (expands to 15 via skill tree) — HP potions, MP potions, gear drops.
  Click to use / equip, X to discard. Consumables auto-consume when applicable.
- 💾 Saves your progress across 3 slots.

**Controls:** WASD/arrows + Space jump · P pause · J or X dash-attack · L shot · H heal — or
touch: floating joystick + action buttons. Works on desktop and mobile from one build.
```

**Categories:** Desktop · Mobile · Wavedash

---

## Wavedash store page

See **`design/WAVEDASH-UPLOAD.md`** for the paste-ready portal checklist (title, description,
tags, screenshot upload order). Store metadata is editable ONLY via the browser
Developer Portal (session-auth gated) — the CLI/API key has no metadata endpoint.

Portal: **https://wavedash.com/dev-portal** → game **nat-20-unicorn** → Store page.

---

## Achievements — LIVE SLATE (2026-08-31, pushed via CLI/API)

**Current status: 8 achievements are LIVE on Wavedash**, each with title + description +
image, pushed via `wavedash achievement create` / `achievement update --image` with the
API key. Verify with `wavedash achievement list --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv`.
(The prior 13 "Kevin the troll" template leftovers were deleted 2026-08-30; this slate
replaces them, matched to the real game.)

Icons: `design/achievements/*.png` (256×256, dark starry badge + rainbow ring + distinct
glyph per achievement; Wavedash transcodes to webp server-side). Verified on disk 2026-09-01:
all 8 PNGs present.

| Identifier | Title | Threshold | Wavedash ID |
|---|---|---|---|
| FIRST_LIGHT | First Light | first DARK CORN kill | md78vr7cr0q2bbe0va7dfprnjn8dhdgb |
| HALFWAY | Halfway to Whole | 3 of 5 shards | md734evx1rnbs767xx1ea13qvx8dhjmh |
| PRISMATIC | Prismatic | all 5 shards (win) | md73vrrcjdsbv8aqnd245xb1yd8dgy8e |
| NATURAL_20 | Natural 20 | land a crit | md7bmz5y4mfq992001s0mtps1x8dgxtt |
| APOTHEOSIS | Apotheosis | reach level 15 | md74g1g3ad9bp9pje0c41mjeax8dg08n |
| FULLY_GEARED | Fully Geared | all 4 gear slots equipped | md7cdx015efj6dajdzzw1yk0ks8dgvgv |
| EXPLORER | Explorer | enter all 5 zones | md7cr7zcxqadste3bjf6rwdtrh8dh3gt |
| HOARDER | Hoarder | open all 20 chests | md713bgay7b612jt8p4n1dftzh8dhdg9 |

**Wavedash glue status (verified 2026-09-01 against build.mjs:75-82):** the wrapped build
emits ONLY `Wavedash.init({})` — the minimum contract required to reveal the play area
(per docs.wavedash.com/sdk/setup). No `setAchievement()` calls are emitted yet.

**Open decision before Sep 20 publish:** ship the minimum contract as-is, OR wire
`Wavedash.setAchievement("ID", true)` at each trigger event (boss kill, crit, level-up,
gear-equip, zone-enter, chest-open). Wiring lives ONLY in the `dist/wavedash/index.html`
build glue — costs zero game.zip bytes. Requires the game to expose the trigger events
to the wrapper (currently it doesn't).

**Thresholds to confirm with the operator:** APOTHEOSIS level 15 (verify reachable);
HOARDER 20 chests (4 per zone × 5). Wording/images trivially updatable via
`achievement update`.

---

## Master checklist (operator)

### ✅ Done
| # | Action | Notes |
|---|---|---|
| ✓ | Store copy + tagline current | This doc, README, src headers all aligned to "Hooves of Hope" + DARKNESS/RAINBOW theme |
| ✓ | Build under budget | 12,759 / 13,312 B (553 free, 4.2% headroom) |
| ✓ | 5-zone world architecture | Rainbow portals connect MEADOW hub to CAVE/CLIFFS/PEAK/DEPTHS |
| ✓ | Multi-zone map audit passes | All portals, bosses, chests reachable at expected ability tier |
| ✓ | Save format v34 | Multi-zone aware, strict version gate |
| ✓ | Enemy tier system | ~75% base / ~19% TOUGH / ~6% SELECT — shipped 2026-09-01 |
| ✓ | GitHub `main` pushed | Latest commit 2d9502f "Zone decor pass + FOL keepout + all 14 deco placement bugs fixed" (2026-09-02) |
| ✓ | Achievement icons on disk | 8 PNGs in `design/achievements/` matching Wavedash slate |

### ⏸ Deferred (operator decision — pre-submission)
| # | Action | Why |
|---|---|---|
| ⏸ | Wavedash `setAchievement()` wiring | 8 achievements defined + init contract works. Wiring adds game→wrapper event hooks for prize competitiveness (bytes-free since wrapper is OUTSIDE the 13KB zip). Decide before Sep 20 publish. |
| ⏸ | Mobile category — separate submission | Game has touch input. Rules allow multi-game entries; same-game-across-platforms is BANNED. Would need a dedicated mobile-tuned build to justify. |


### 🔬 Parked research (untested byte-reduction avenues — only if headroom becomes tight)
| Avenue | Estimated upside | Risk |
|---|---|---|
| Closure Compiler ADVANCED | +50–200 B (js13k-forge research) | Silently breaks dynamic property access; needs externs + full browser verification |
| String-pack numeric data arrays (world/sprite) | Unknown (Sanxion case ~16% on data) | Our track record: "obvious" wins often backfire in this pipeline; needs A/B measurement |

### ⚠️ Todo (in order)
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name | js13kgames.com/submit | NOW — locks name; tests roadroller zip early. Deadline Sep 13 |
| 2 | Firefox console check on `dist/game.zip` | local | Before each js13k re-upload (hard rule) |
| 3 | Wavedash store page: paste title/desc/tags, upload cover + 5 screenshots | Wavedash Developer Portal → Metadata (see `WAVEDASH-UPLOAD.md`) | Anytime — review has lag, don't leave for Sep 20 |
| 4 | Playtest the current build via Wavedash URL | most-recent `wavedash build push` output | After each meaningful build change |
| 5 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 6 | Wavedash PUBLISH | Portal dashboard → publish latest build | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

**Recurring action (always current):** `node build.mjs && wavedash build push -m "…"` after any code change. Latest push 2026-09-02: `mn717ksrgt1fgb6bhpvh7bq88s8dmrdz` (de08d89, 12,884 B). Prior `mn76ry78...` (2d9502f, 12,882 B), initial `mn76c8ze...` (aa03119, 12,845 B) had playtest data wiped — wipe still in effect.

### 📋 Assets inventory (verified on disk 2026-09-01)
```
design/
├── cover_square.png             ✅ (720×720, ~18 KB — upload this)
├── screenshots/                 ✅ 5-zone set (960×540 native, captured 2026-08-31)
│   ├── 01_title.png             (title screen — rainbow title + arc + unicorn)
│   ├── 02_cave.png              (CAVE — glowing mushrooms, spikes, spider foe) [LEAD]
│   ├── 03_cliffs.png            (CLIFFS — windswept sky arena)
│   ├── 04_peak.png              (PEAK — icy plateau, snow, cyan crystals, tier enemy)
│   ├── 05_depths.png            (DEPTHS — violet corruption, dead trees, campfire, spike crevasse)
│   └── 06_rpg_menu.png          (Full RPG UI — portrait, 4 gear, 5 stats, skill tree, SHARDS 0/5)
└── achievements/                ✅ 8 PNGs (256×256 each)
    ├── FIRST_LIGHT.png
    ├── HALFWAY.png
    ├── PRISMATIC.png
    ├── NATURAL_20.png
    ├── APOTHEOSIS.png
    ├── FULLY_GEARED.png
    ├── EXPLORER.png
    └── HOARDER.png
```

*Old pre-zone screenshots archived in `design/screenshots/_stale_aug30/` — DO NOT upload those.*
