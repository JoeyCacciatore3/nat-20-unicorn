# Submission Kit — UNICORN, Hooves of Hope

Copy is paste-ready.

**State snapshot: 2026-09-02** — build **11,366 B** (85.4%, 1946 B free · **14.6% headroom**), save **v40**, unified single-map world (600×120, all 5 CORN bosses in one MEADOW — no portals). Skill tree 3-4-3-2 (12 slots): SHOT/HEAL/DASH → MP +5/DBL JUMP/LONG DASH/STASH → HP +5/TRI JUMP/POT +5 → SUPER HEAL/FAR SHOT. Inventory gear-only (max 10 via STASH), potions live in persistent hot-bar (fixed +10 HP/MP, +5 more with POT +5). Unified top-left HUD (LV/name/rainbow-shard-count/HP-MP-XP bars) persistent across gameplay and character menu. Stat palette: STR gold, HP red, MAG blue, DEF green, LUCK violet — no light-blue anywhere. Equipment box outlines match stat colors on menu, inventory, and world drops. Tier shown by stroke width (thin/medium/thick). Hearth REST restores HP+MP+checkpoint but does NOT save (floppy icon is the ONE explicit save). LEVEL UP fires a rainbow-per-character banner matching title UNICORN font.

Primary sources verified 2026-08-29 (js13kgames.com/2026/blog/submit-form-open,
docs.wavedash.com/publishing/metadata + /content-guidelines). Terms unchanged.

## Names (keep identical everywhere)
- **Title:** `UNICORN, Hooves of Hope`
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

Name your unicorn and cross one large connected world to defeat the five DARK CORNS
and reclaim the five RAINBOW SHARDS that bring the color back.

- ⚔️ **STR-based combat** — damage scales with your stats and gear. LUCK boosts crit chance.
- 📈 **Full RPG** — 5 stats, a 12-node tiered skill tree, quadratic XP curve, and gear
  that appears on your unicorn's body, piece by piece (mane / horn / body / hooves).
- ⚔️ **6 enemy kinds + rare SELECT elites** — sprinters, hoppers, casters; learn the
  colors, learn the moves. ~6% of foes spawn as elites (crowned mini-bosses).
- 👑 **5 named boss Mares** — dark mirrors of yourself, each holding one rainbow band
  (R-O-Y-B-V), each with a phase-2 twist.
- 🌍 **Unified world** — one connected map. Ability gates (double-jump, dash) control
  where you can reach; no portals, no zone transitions, just exploration.
- 🎒 **5-slot inventory** for gear (expands to 10 via STASH skill). Two-slot potion
  hot-bar (HP + MP, always +10 fixed value, +15 with POT +5 skill).
- 💾 Saves your progress across 2 slots.

**Controls:** WASD/arrows + Space jump · P pause · J dash-attack · L shot · H heal — or
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

## Achievements — SLATE ON RECORD (Wavedash-side, needs verification)

**Live on Wavedash (from earlier slate):** 8 achievements defined via
`wavedash achievement create` / `achievement update --image` with the API key.
Verify with `wavedash achievement list --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv`.

Icons: `design/achievements/*.png` (256×256, dark starry badge + rainbow ring + distinct
glyph per achievement; Wavedash transcodes to webp server-side).

| Identifier | Title | Threshold (as recorded) | Notes on current game |
|---|---|---|---|
| FIRST_LIGHT | First Light | first DARK CORN kill | ✓ still valid |
| HALFWAY | Halfway to Whole | 3 of 5 shards | ✓ still valid |
| PRISMATIC | Prismatic | all 5 shards (win) | ✓ still valid |
| NATURAL_20 | Natural 20 | land a crit | ✓ still valid |
| APOTHEOSIS | Apotheosis | reach level 15 | ✓ still reachable (in-game popup removed but LV 15 remains the cap) |
| FULLY_GEARED | Fully Geared | all 4 gear slots equipped | ✓ still valid |
| **EXPLORER** | Explorer | *enter all 5 zones* | ⚠️ **STALE** — no zones exist in unified world. Needs repurposing or removal via CLI. |
| **HOARDER** | Hoarder | *open all 20 chests* | ⚠️ **STALE** — unified world has 4 chests. Threshold needs update (e.g. "open all 4 chests") or achievement retired. |

**Wavedash glue status:** wrapped build emits `Wavedash.init({})` (minimum contract).
No `setAchievement()` calls emitted yet. Wiring decision still open — costs zero
game.zip bytes (lives in `dist/wavedash/index.html` glue outside the 13KB zip).

**Pre-submission achievement work required:**
1. Retire EXPLORER (no zones) — via `wavedash achievement delete` or repurpose
   (e.g. "reach every corner of the world" — no code hook needed if manually claimed)
2. Update HOARDER threshold from 20 → 4 via `wavedash achievement update`
3. Verify APOTHEOSIS threshold (LV 15 is still the reachable cap ✓)

---

## Master checklist (operator)

### ✅ Done
| # | Action | Notes |
|---|---|---|
| ✓ | Store copy + tagline current | This doc + README aligned to unified-world state |
| ✓ | Build under budget | 11,366 / 13,312 B (1946 free, **14.6% headroom** — best of project) |
| ✓ | Unified world architecture | Single 600×120 MEADOW map, all 5 CORN bosses in-world, no portals |
| ✓ | Map audit passes | All bosses reachable at expected ability tier (RED base · YELLOW/BLUE DJ · ORANGE/VIOLET DASH), 0 stuck cells, 4 chests reachable, spike-audit clean |
| ✓ | Save format v40 | Strict version gate, prior saves auto-discarded |
| ✓ | Elite event system | ~94% regular / ~6% elite (mini-boss variant: 3× HP, +2 dmg, +1 size, aqua tint, guaranteed drop + gold flourish + XP bonus) |
| ✓ | GitHub `main` pushed | 56 commits shipped 2026-09-02 (12,535 → 11,366 B, −1,169 B) |
| ✓ | Wavedash aligned | Every code change shipped as atomic git+Wavedash push |
| ✓ | Achievement icons on disk | 8 PNGs in `design/achievements/` (2 need repurposing per above) |

### ⚠️ Pre-submission action items
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name | js13kgames.com/submit | NOW — locks name; tests roadroller zip early. Deadline Sep 13 |
| 2 | Update EXPLORER + HOARDER on Wavedash | `wavedash achievement update / delete` | Before Sep 20 publish |
| 3 | Firefox console check on `dist/game.zip` | local | Before each js13k re-upload (hard rule) |
| 4 | Screenshot refresh for unified world | replace 02_cave/03_cliffs/04_peak/05_depths with unified-world captures | Before Wavedash store upload |
| 5 | Wavedash store page paste-in | Portal → Metadata (see `WAVEDASH-UPLOAD.md`) | Anytime — review has lag |
| 6 | Playtest current build | most-recent Wavedash play URL | After each meaningful build change |
| 7 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 8 | Wavedash PUBLISH | Portal dashboard → publish latest build | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

### ⏸ Deferred (operator decision)
| # | Action | Why |
|---|---|---|
| ⏸ | Wavedash `setAchievement()` wiring | Achievements defined + init contract works. Wiring adds game→wrapper event hooks for prize competitiveness (bytes-free since wrapper is OUTSIDE the 13KB zip). Decide before Sep 20. |
| ⏸ | Mobile category — separate submission | Game has touch input. Rules allow multi-game entries; same-game-across-platforms is BANNED. Would need a dedicated mobile-tuned build. |

### 🔬 Parked research (untested byte-reduction — only if headroom becomes tight)
| Avenue | Estimated upside | Risk |
|---|---|---|
| Closure Compiler ADVANCED | +50–200 B (js13k-forge research) | Silently breaks dynamic property access; needs externs + full browser verification |
| String-pack numeric data arrays | Unknown (Sanxion case ~16% on data) | "Obvious" wins often backfire in this pipeline; needs A/B measurement |

---

**RELEASE RITUAL — one process, always together (Joey directive 2026-09-02):** every code change ships as `commit → git push origin main → node build.mjs → wavedash build push -m "…"`. GitHub push and Wavedash deploy are NEVER done separately — they go as one unit so the deploy never drifts from source. (Docs-only commits with no build change are exempt — no re-push needed.)

### 📋 Assets inventory
```
design/
├── cover_square.png             ✅ (720×720, ~18 KB — upload this)
├── screenshots/
│   ├── 01_title.png             ✅ (title screen — rainbow title + arc + unicorn)
│   ├── 02_cave.png              ⚠️ STALE — reshoot as unified-world exploration screenshot
│   ├── 03_cliffs.png            ⚠️ STALE — reshoot
│   ├── 04_peak.png              ⚠️ STALE — reshoot
│   ├── 05_depths.png            ⚠️ STALE — reshoot
│   └── 06_rpg_menu.png          ⚠️ NEEDS REFRESH — character menu heavily redesigned since 2026-08-31 (new HUD, potion hot-bar, skill tree, colored equipment outlines)
└── achievements/                ✅ 8 PNGs (256×256 each — EXPLORER + HOARDER need retiring/repurposing on Wavedash-side)
```

**Screenshot refresh plan:** capture 4 fresh gameplay screenshots showcasing the
unified world (west climb / central hub / east extension / one of the boss encounters)
plus one refreshed character menu screenshot showing the new HUD and skill tree.
