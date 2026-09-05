# Submission Kit — UNICORN, Hooves of Hope

Copy is paste-ready. **All facts below re-verified against source (`src/*.js`) on 2026-09-05.**

**State snapshot (2026-09-05):** build **13,230 / 13,312 B (82 B free, 99.4%)**. Save **v43**. World **600×160**, one contiguous MEADOW map — **7 zones** (5 surface + 2 underground), **7 DARKCORN bosses**, **7 rainbow shards** (one per DARKCORN), **20 chests**. GitHub `main` @ `a9afc90` == Wavedash build `mn7ftbxsrdd4a9v13t0ncha4vx8dtk3t` — **aligned**. Play URL: https://wavedash.com/playtest/nat-20-unicorn/5f83bf86-7903-401d-ae67-9aa57425958b

> **Ground-truth note:** this doc replaces the 2026-09-03 version, which described a stale build (800×160 / 6 bosses / 12 skill nodes / elites). Those numbers were wrong. If any figure here disagrees with `src/data.js` + `src/world.js`, the source wins — re-grep before trusting.

## Verified game facts (from `src/data.js` + `src/world.js`, 2026-09-05)
- **Title (player-facing):** the title screen renders `UNICORN` (one word, rainbow letters) over `HOOVES OF HOPE`; the cover art matches. → **`UNICORN, Hooves of Hope`**.
- **7 DARKCORN bosses** — `RBC` has 7 entries. Bands: RED, ORANGE, YELLOW, BLUE, VIOLET, GREEN, INDIGO. All named "DARKCORN"; identity = horn + mane color. Each has a phase-2 twist (`P2`). Defeated bosses turn friendly (talkable GREATCORN-purple NPCs).
- **7 zones** (`ZB`, 7 rows) — surface: PEAK (BLUE), CANOPY (YELLOW), MEADOW (RED), EAST RUN (ORANGE), SUMMIT (GREEN); underground: DEPTHS (VIOLET), CAVERN (INDIGO).
- **7 rainbow shards** — one per DARKCORN. GREATCORN intro: "Reclaim every shard. One per DARKCORN. There are seven."
- **6 enemy kinds** (`FT`) — CRAWLER, BLOB, CASTER, RUNNER, HOPPER, PUFF. **No elites** (elite system removed 2026-09-04).
- **14 skill nodes** (`TREE`) — SHOT, FAR SHOT, HEAL, SUPER HEAL, DBL JUMP, TRI JUMP, DASH, LONG DASH, STASH, HP+5, MP+5, POT+5, DBL SHOT, TRI SHOT. Prerequisite-gated (`LINK` chains).
- **20 chests** (`seeds.chests`, idx 0–19), all reachability-audited by `tools/map-audit.mjs`.
- **4 gear slots** — BODY (+HP), MANE (+MAG), HORN (+STR), HOOVES (+DEF). Gear drops as pixel icons and recolors the matching body part.
- **5 stats** — STR (gold), HP (red), MAG (blue), DEF (green), LUCK (violet).
- **Potion hot-bar** — 2 slots (HP red / MP blue), +10 fixed (+15 with POT+5). Inventory holds gear only (5 slots, 10 via STASH).
- **Bounce mushrooms** — spring-launch traversal, stacks with DBL/TRI JUMP.
- **Controls** — Keyboard: WASD / arrows move · Space jump · J dash-attack · L shot · H heal · P pause. Touch: floating joystick + action buttons. One build serves desktop + mobile.
- **Save** — v43, strict version gate (no cross-version compat), 2 slots (`n20_s0/1`).
- **Console errors** — 0 observed in Chromium across a full playthrough (title → name → intro → combat → menu), 2026-09-05. ⚠️ Firefox DevTools zero-console check is a SEPARATE hard requirement — still do it before js13k upload.

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
- 📈 **Full RPG** — 5 stats, a 14-node prerequisite skill tree, and gear that drops as
  pixel item icons and recolors the matching part of your unicorn (mane / horn / body / hooves).
- 👑 **7 DARKCORN bosses** — dark mirrors of yourself, each holding one rainbow band
  (red → indigo), each with a phase-2 twist. Beat one and it turns friendly.
- 🌍 **7 regions in one connected world** — sunlit meadows, high canopy, storm peaks, and
  underground caverns. Ability gates (double-jump, dash, bounce mushrooms) control your reach.
- 🐴 **6 enemy kinds** — crawlers, blobs, casters, runners, hoppers, puffs. Learn the colors, learn the moves.
- 🗨️ **A GREATCORN guide** greets you with a chatty intro and re-talk quips.
- 🎒 20 hidden chests · 2-slot potion hot-bar (HP + MP) · saves across 2 slots.

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
| APOTHEOSIS | Apotheosis | reach level 15 | ✓ valid (LV15 = cap) |
| FULLY_GEARED | Fully Geared | all 4 gear slots equipped | ✓ valid |
| EXPLORER | Explorer | reach all **7** zones (or "every corner of the world") | re-tune — was "5 zones" |
| HOARDER | Hoarder | open all **20** chests | ✓ **now correct** — source has 20 chests |

**Glue status:** wrapped build emits `Wavedash.init({})` (minimum contract). No `setAchievement()` calls yet — wiring is byte-free (lives in `dist/wavedash/index.html` outside the 13 KB zip). Decide before Sep 20.

---

## Assets inventory (refreshed 2026-09-05)
```
design/
├── cover_square.png      ✅ 720×720 — upload as cover art
├── trailer.mp4           ✅ 960×540, 15.6s — gameplay hook + title sign-off (NEW 09-05)
├── screenshots/          ✅ REFRESHED from current build (store order, gameplay-first):
│   ├── 01_intro.png        GREATCORN intro + HUD + action buttons
│   ├── 02_world.png        spike-pit traversal, mushrooms, platforms, enemies
│   ├── 03_exploration.png  meadow with spikes, bounce mushroom, enemy
│   ├── 04_skill_tree.png   character menu — stats + equipment + 14-node skill tree
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
