# Submission Kit — UNICORN, Hooves of Hope

Copy is paste-ready. **All facts below re-verified against source (`src/*.js`) on 2026-09-07 (batch 12).**

**State snapshot (2026-09-07 batch 12):** build **13,076 / 13,312 B (236 B free, 98.2%)**. Save **v44**. World **600×160**, one contiguous world — **7 zones** (5 surface + 2 underground, each with a unique 5-color palette — no cross-zone overlap except deliberate PEAK/SUMMIT storm-sky pair), **7 DARKCORN bosses**, **7 rainbow shards** (one per DARKCORN), **20 chests**, **56 regular foes**, **all suspended platforms are one-way (v=2)** — uniform thickness, DOWN-jump drops through anywhere. **LUCK now compounds across three payoffs** (drop chance + crit + gear tier). GitHub `main` == code == Wavedash live — **aligned** (Release Ritual atomic push). Wavedash build id updated per push — pin lives in the Definitive State knowledge entry. Play URL rotates per deploy — get the current one from `wavedash build push` output, or the Developer Portal.

**Batch 9 changes (2026-09-07):**
- Enemy hit reaction: unified `f.fl` timer drives red strobe flash + AI pause + i-frame together (matches player's `hf` grammar). Baseline 0.4s; physical hits (dash/stomp) overwrite to 0.8s. Shots gated on `f.fl` for consistency (DBL/TRI SHOT still stacks because each bolt refreshes).
- Camera framing: vertical offset `-60` → `+20` (player sits slightly above center). Every routine jump — single/double/triple — now fits inside one viewport. Ground visibility at rest ≈ 8.8 tiles (was 3.8).
- Dead-code prune (line 672 boss-minion prune) removed — a no-op predicate; deletion clarifies "player kills everything" contract.

> **Ground-truth note:** last full audit 2026-09-07 (batch 12). If any figure here disagrees with `src/data.js` + `src/main.js` + `src/world.js`, the source wins — re-grep before trusting.

## Verified game facts (from `src/data.js` + `src/main.js` + `src/world.js`, 2026-09-07)
- **Title (player-facing):** the title screen renders `UNICORN` (one word, rainbow letters) over `HOOVES OF HOPE`; the cover art matches. → **`UNICORN, Hooves of Hope`**.
- **7 DARKCORN bosses** — `RBC` has 7 entries. Bands: RED, ORANGE, YELLOW, BLUE, VIOLET, GREEN, INDIGO. All named "DARKCORN"; identity = horn + mane color. Every boss uses the **same 3-move kit** (chase + hop + ranged, cap=19). Difficulty comes purely from tier `bi`: HP `(20+bi*4)+lvl²`, dmg `(8+bi)+(lvl>>2)`, speed `1+bi*0.1`. At half HP a universal **1.5× speed enrage** kicks in (no per-boss twist tables). Defeated bosses turn friendly (talkable GREATCORN-purple NPCs, eyes go white).
- **7 zones** (`ZB`, 7 rows) — surface: PEAK (BLUE), CANOPY (YELLOW), MEADOW (RED), EAST RUN (ORANGE), SUMMIT (GREEN); underground: DEPTHS (VIOLET), CAVERN (INDIGO).
- **7 rainbow shards** — one per DARKCORN. GREATCORN intro: "Reclaim every shard. One per DARKCORN. There are seven."
- **6 enemy kinds** (`FT`) — capability-bit kit (bits: 1=ranged, 2=hop, 16=chase): k1 hop-only (pink), k2 chase+ranged (teal), k3 full 3-move kit (violet, mini-boss feel), k4 pure chase fast (orange), k5 chase+hop (gold frog leaper), k6 ranged+hop (purple sniper). **No elites** (elite system removed 2026-09-04).
- **10 skill nodes** (`TREE`) — SHOT, FAR SHOT, HEAL, SUPER HEAL, DBL JUMP, TRI JUMP, DASH, LONG DASH, DBL SHOT, TRI SHOT. **Level-gated rows** (no prerequisite lines): `canBuy = lvl >= [1,9,1,6,3,6,1,3,6,9][i]` — Row 1 at LV1, Row 2 at LV3, Row 3 at LV6, Row 4 at LV9. All player-chosen; skill points cap at 10 (one per node).
- **20 chests** (`seeds.chests`, idx 0–19), all reachability-audited by `tools/map-audit.mjs`.
- **4 gear slots** — BODY (+HP), MANE (+MAG), HORN (+STR), HOOVES (+DEF). Gear drops as pixel icons and recolors the matching body part. Tint palette = all 17 `PAL` colors (batch 8).
- **5 stats** (`SC` colors) — STR (red), HP (green), MAG (blue), DEF (violet), LUCK (orange). Cap **LV20** (`CAP=20`); +2 stat points per level (40 total).
- **Potion hot-bar** — 2 slots (HP red / MP blue), stack to 5 each, fixed **+10 heal** per drink. Inventory holds gear only, **10 slots fixed** (`BAG=10`, no STASH skill).
- **Bounce mushrooms** — spring-launch traversal, stacks with DBL/TRI JUMP.
- **Controls** — Keyboard: WASD / arrows move · Space jump · J dash-attack · L shot · H heal · P pause. Touch: floating joystick + action buttons. One build serves desktop + mobile.
- **Save** — v44, strict version gate (no cross-version compat), **single slot** (`n20_s0`). Stats stored as array `t:[STR,HP,MAG,DEF,LCK]`. Auto-saves on level-up + respawn.
- **Console errors** — 0 observed in Chromium (last full playthrough 2026-09-05, batch-6). ⚠️ Firefox DevTools zero-console check is a SEPARATE hard requirement — re-run before js13k upload, especially since batches 7 and 8 changed sprite/HUD code paths.

## Names (keep identical everywhere)
- **Title:** `UNICORN, Hooves of Hope`
- js13k draft registration LOCKS the unique name — register early to claim it.
- Wavedash: title must be primarily Latin script ✅; URL slug `nat-20-unicorn` is permanent.

---

## js13k submit form (js13kgames.com/submit — deadline Sep 13, 13:00 CEST)
Flow: register draft → upload zip (automated in-browser test; console errors block; roadroller zips process slowly) → details → Presentation (cover/thumbnails) → team (prefilled from repo) → submit. Draft stays editable until deadline.

**Description (Markdown supported):**

```markdown
**The DARKNESS drained the world to grey, and you are the last unicorn left to bring the color back.**

Name your unicorn and cross one large connected world to defeat all seven DARKCORN
and reclaim the rainbow shards they shattered.

- ⚔️ **STR-based combat** — damage scales with your stats and gear; LUCK boosts crit chance.
- 📈 **Full RPG** — 5 stats, a 10-node level-gated skill tree, and gear that drops as
  pixel item icons and recolors the matching part of your unicorn (mane / horn / body / hooves).
- 👑 **7 DARKCORN bosses** — dark mirrors of yourself, each holding one rainbow band
  (red → indigo). All share the full 3-move kit; at half HP they enrage 1.5× faster. Beat one and it turns friendly.
- 🌍 **7 regions in one connected world** — sunlit meadows, high canopy, storm peaks, and
  underground caverns. Ability gates (double-jump, dash, bounce mushrooms) control your reach.
- 🐴 **6 enemy kinds** built from a capability-bit kit (chase / hop / ranged) — every kind reads differently. Learn the colors, learn the moves.
- 🗨️ **A GREATCORN guide** greets you with a chatty intro and re-talk quips, and fully heals you when you return.
- 🎒 20 hidden chests · 2-slot potion hot-bar (HP + MP, stack to 5, +10 heal) · single save slot, auto-saves on level-up and respawn.

**Controls:** WASD/arrows + Space jump · P pause · J dash-attack · L shot · H heal — or
touch: floating joystick + action buttons. One build, desktop and mobile.
```

**Categories:** Desktop · Mobile · Wavedash

---

## Wavedash store page
See **`design/WAVEDASH-UPLOAD.md`** for the paste-ready portal checklist (title, description, tags, screenshot order, trailer). Store metadata is editable ONLY in the browser Developer Portal (session-auth gated) — the CLI/API key has no metadata endpoint.

Portal: **https://wavedash.com/dev-portal** → game **nat-20-unicorn** → Store page.

---

## Achievements — 8 on record (needs live CLI verification)
Verify current live state with `wavedash achievement list --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv`. Icons: `design/achievements/*.png` (256×256). Thresholds below reflect the CURRENT 7-boss / 7-shard / 20-chest build.

| Identifier | Title | Correct threshold (current build) | Note |
|---|---|---|---|
| FIRST_LIGHT | First Light | first DARKCORN kill | ✓ valid |
| HALFWAY | Halfway to Whole | reach 3–4 of 7 shards (or keep count-agnostic) | re-tune — was "3 of 5" |
| PRISMATIC | Prismatic | all **7** shards (win) | re-tune — was "5" |
| NATURAL_20 | Natural 20 | land a crit | ✓ valid |
| APOTHEOSIS | Apotheosis | reach level 15 | ✓ valid (mid-late; cap is LV20) |
| FULLY_GEARED | Fully Geared | all 4 gear slots equipped | ✓ valid |
| EXPLORER | Explorer | reach all **7** zones (or "every corner of the world") | re-tune — was "5 zones" |
| HOARDER | Hoarder | open all **20** chests | ✓ **now correct** — source has 20 chests |

**Glue status:** wrapped build emits `Wavedash.init({})` (minimum contract). No `setAchievement()` calls yet — wiring is byte-free (lives in `dist/wavedash/index.html` outside the 13 KB zip). Decide before Sep 20.

---

## Assets inventory (refreshed 2026-09-05)
```
design/
├── cover_square.png      ✅ 720×720 — upload as cover art
├── trailer.mp4           ⚠️ 960×540, 15.6s — captured 09-05; predates batches 7-9 (outlines, HUD recolor, enemy hit-flash, camera framing). Re-cut before final submission.
├── screenshots/          ⚠️ ALL 5 are STALE (predate batches 7-9 — no outlines, old white HUD, no enemy hit-flash, old sky-heavy camera). Re-shoot before submission:
│   ├── 01_intro.png        GREATCORN intro + HUD + action buttons
│   ├── 02_world.png        spike-pit traversal, mushrooms, platforms, enemies
│   ├── 03_exploration.png  meadow with spikes, bounce mushroom, enemy
│   ├── 04_skill_tree.png   character menu — stats + equipment + 10-node skill tree
│                            ⚠️ STALE — current file shows the pre-09-05 14-node tree with STASH/HP+5/MP+5/POT+5
│                              and white HUD text (batch 8 recolored to #8cf). RE-SHOOT against batch-12 build (adds enemy hit-flash + camera framing + differentiated PEAK/CANOPY palettes + uniform one-way platform arenas + LUCK-tiered gear + tuned drop pickup) before final submission.
│   ├── 05_title.png        title screen (rainbow UNICORN / HOOVES OF HOPE)
│   └── _stale_aug31/       OLD 5-zone captures — do NOT upload
└── achievements/         ✅ 8 PNGs (thresholds need CLI re-tune per table above)
```

---

## Master checklist (operator)

### ⚠️ Pre-submission action items
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name `UNICORN, Hooves of Hope` | js13kgames.com/submit | NOW — locks name; tests roadroller zip. Deadline Sep 13 13:00 CEST |
| 2 | Firefox DevTools zero-console-errors check on `dist/game.zip` | local | Before each js13k upload (disqualifying criterion) |
| 3 | Wavedash store paste-in (title, desc, tags, cover, screenshots, trailer) | Portal (see `WAVEDASH-UPLOAD.md`) | Anytime — review has lag |
| 4 | Re-tune EXPLORER / HALFWAY / PRISMATIC thresholds | `wavedash achievement update` | Before Sep 20 |
| 5 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 6 | Wavedash PUBLISH latest build | Portal dashboard | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

### ⏸ Deferred (operator decision)
| # | Action | Why |
|---|---|---|
| ⏸ | Wavedash `setAchievement()` wiring | Byte-free (wrapper outside 13 KB zip); raises Wavedash prize competitiveness. Decide before Sep 20. |
| ⏸ | Mobile category — separate submission | Touch input works; rules allow multi-game entries but same-game-across-platforms is BANNED. |

---

**RELEASE RITUAL (Joey directive 2026-09-02):** every code change ships as `commit → git push origin main → node build.mjs → wavedash build push -m "…"`. GitHub push + Wavedash deploy go as ONE unit so the live deploy never drifts from source. Docs-only commits (like this one) are exempt — no rebuild/re-push.
