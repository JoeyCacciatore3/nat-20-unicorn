# Submission Kit — UNICORN, Hooves of Hope

Copy is paste-ready. **All facts verified against `src/*.js` at batch 28.**

**State snapshot (2026-09-09, batch 28 — SHIPPED):** build **13,255 / 13,312 B (57 B free, 99.6%)**, git `cee3393` == Wavedash build `mn78pamdxftzswxqyh235wbayn8e39hn`. GitHub `main` == code == Wavedash live — **ALIGNED** (Release Ritual atomic push). Save **v44**, single slot `uni_s0`. Play URL rotates per deploy — grab the current one from `wavedash build push` output or the Developer Portal. For the authoritative running state see the **Definitive State** knowledge entry; the Wavedash build id + play URL are pinned there.

> **Ground-truth rule:** if any figure here disagrees with `src/data.js` + `src/main.js` + `src/world.js`, the source wins — re-grep before trusting.

## Verified game facts (from source, batch 28)
- **Title (player-facing):** the title screen renders `UNICORN` (one word, rainbow letters) over `HOOVES OF HOPE`; the cover art matches. → **`UNICORN, Hooves of Hope`**.
- **Physics (B28):** player and every enemy share ONE jump/gravity model (`GV=900`, launch `JV=280`) — arcs are identical and learnable; enemies no longer out-jump you. The player keeps a smaller, nimbler collision box.
- **6 enemy kinds (`FT`) organized into 3 ATTACK TIERS × 2 kinds** — pursuit speed is UNIFORM for every foe (they all home at one speed); the **attack** is what separates them (cap bits: 1=shoot, 2=hop, 16=charge):
  - **Tier 1 — HOP (melee leapers):** k1 (fragile), k4 (tankier) — leap toward you on a cadence.
  - **Tier 2 — SHOOT (ranged):** k2, k6 — hold position and fire bolts.
  - **Tier 3 — CHARGE (elite):** k3 (heavy), k5 (glass) — telegraphed dash: wind-up tell → fast lunge → recover.
  - Sprites are still per-kind (cosmetic) but no longer signal the tier — the attack does.
- **7 DARKCORN bosses** (`RBC`, 7 entries; bands RED, ORANGE, YELLOW, BLUE, VIOLET, GREEN, INDIGO). All named "DARKCORN"; identity = horn + mane color. Every boss runs the **full apex kit** (charge + hop + shoot, cap=19). Difficulty scales with tier `bi` and your level: HP `(20+bi*4)+lvl²`, dmg `(8+bi)+(lvl>>2)`. Bosses are always present (seeded), idle until you enter their 128px ring, then hunt relentlessly (ungated — they chase off ledges and through spike pits). Defeated = the band's rainbow shard banks; killed bosses don't respawn. *(No half-HP enrage — that mechanic was removed.)*
- **7 zones** (`ZB`) — surface: PEAK (BLUE), CANOPY (YELLOW), MEADOW (RED), EAST RUN (ORANGE), SUMMIT (GREEN); underground: DEPTHS (VIOLET), CAVERN (INDIGO). One contiguous 600×160 world, each zone its own 5-color palette.
- **7 rainbow shards** — one per DARKCORN. GREATCORN intro: "Reclaim every shard. One per DARKCORN. There are seven."
- **10 skill nodes** (`TREE`) — SHOT, FAR SHOT, HEAL, SUPER HEAL, DBL JUMP, TRI JUMP, DASH, LONG DASH, DBL SHOT, TRI SHOT. Level-gated rows, no prerequisite lines: `canBuy = lvl >= [1,9,1,6,3,6,1,3,6,9][i]`. One point per node; start with only JUMP.
- **20 chests** (`seeds.chests`), all reachability-audited by `tools/map-audit.mjs`.
- **54 regular foes** — hand-placed `foes` (42) + fill `foesX` (12), **exactly 9 of each of the 6 kinds** (verified 2026-09-10 by reading the `foes`+`foesX` seed arrays in `world.js` @ B28; the earlier "9/9/10" reading was a loose grep catching non-foe 3-element arrays). Safe marketing figure: "over 50 enemies across 6 kinds."
- **4 gear slots** — BODY (+HP), MANE (+MAG), HORN (+STR), HOOVES (+DEF). Gear drops as pixel icons and recolors the matching body part. `BAG=10` (gear only).
- **5 stats** (`SC`) — STR (red), HP (green), MAG (blue), DEF (violet), LUCK (orange). Cap **LV20** (`CAP=20`); +2 stat points per level. Start HP/MP = 15.
- **Potion hot-bar** — 2 slots (HP / MP), stack to 5 each, **+10 heal** per drink (+1.5s i-frame flash). HP slot flanks HEAL, MP slot flanks DASH.
- **Bounce mushrooms** — spring-launch traversal, stacks with DBL/TRI JUMP (west bounce-sky route feeds the BLUE summit).
- **Controls** — Keyboard: WASD/arrows move · Space/W/↑ jump (= interact) · J dash-attack · L shot · H heal · P menu. Touch: floating joystick + action buttons. One build, desktop + mobile.
- **Save** — v44, strict version gate (no cross-version compat), single slot `uni_s0`. Auto-saves on level-up + respawn; player always respawns at the paddock.
- **Console errors** — 0 in Chromium (B28 smoke test). ⚠️ **Firefox DevTools zero-console check is a SEPARATE hard requirement** — re-run against the final `dist/game.zip` before each js13k upload.

## Names (keep identical everywhere)
- **Title:** `UNICORN, Hooves of Hope`
- js13k draft registration LOCKS the unique name — register early to claim it.
- **Slug (CONFIRMED):** **`hoovesofhope`** — title **"Hooves Of Hope"**. Verified 2026-09-10 via `wavedash project list`: game_id `j97697bsqqnzpcxbmpdhfs3hen8cp5yv` (the same id in `wavedash.toml`) → slug `hoovesofhope`. The old `nat-20-unicorn` slug is fully retired — no ambiguity remains.

---

## js13k submit form (js13kgames.com/submit — deadline Sep 13, 13:00 CEST)
Flow: register draft → upload zip (automated in-browser test; **console errors block**; roadroller zips process slowly) → details → Presentation (cover/thumbnails) → team (prefilled from repo) → submit. Draft stays editable until deadline.

**Description (Markdown supported):**

```markdown
**The DARKNESS drained the world to grey, and you are the last unicorn left to bring the color back.**

Name your unicorn and cross one large connected world to defeat all seven DARKCORN
and reclaim the rainbow shards they shattered.

- ⚔️ **STR-based combat** — damage scales with your stats and gear; LUCK boosts crit chance.
- 📈 **Full RPG** — 5 stats, a 10-node level-gated skill tree, and gear that drops as
  pixel item icons and recolors the matching part of your unicorn (mane / horn / body / hooves).
- 👑 **7 DARKCORN bosses** — dark mirrors of yourself, each holding one rainbow band
  (red → indigo). All run the full apex kit — charge, hop, and ranged fire — and hunt you relentlessly once woken.
- 🌍 **7 regions in one connected world** — sunlit meadows, high canopy, storm peaks, and
  underground caverns. Ability gates (double-jump, dash, bounce mushrooms) control your reach.
- 🐴 **6 enemy kinds in 3 attack tiers** — melee leapers, ranged snipers, and telegraphed chargers. Everyone pursues at the same speed; it's the attack that separates them, so you learn one moveset at a time.
- 🗨️ **A GREATCORN guide** greets you with a chatty intro and re-talk quips, and fully heals you when you return.
- 🎒 20 hidden chests · 2-slot potion hot-bar (HP + MP, stack to 5, +10 heal) · single save slot, auto-saves on level-up and respawn.

**Controls:** WASD/arrows + Space jump · P menu · J dash-attack · L shot · H heal — or
touch: floating joystick + action buttons. One build, desktop and mobile.
```

**Categories:** Desktop · Mobile · Wavedash

---

## Wavedash store page
See **`design/WAVEDASH-UPLOAD.md`** for the paste-ready portal checklist (title, description, tags, screenshot order, trailer). Store metadata is editable ONLY in the browser Developer Portal (session-auth gated) — the CLI/API key has no metadata endpoint.

Portal: **https://wavedash.com/dev-portal** → **Hooves Of Hope** (slug `hoovesofhope`) → Store page.

---

## Achievements — 8 on record (needs live CLI verification)
Verify current live state with `wavedash achievement list --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv`. Icons: `design/achievements/*.png` (256×256). Thresholds below reflect the CURRENT 7-boss / 7-shard / 20-chest / LV20-cap build.

| Identifier | Title | Correct threshold (current build) | Note |
|---|---|---|---|
| FIRST_LIGHT | First Light | first DARKCORN kill | ✓ valid |
| HALFWAY | Halfway to Whole | reach 3–4 of 7 shards (or keep count-agnostic) | re-tune — was "3 of 5" |
| PRISMATIC | Prismatic | all **7** shards (win) | re-tune — was "5" |
| NATURAL_20 | Natural 20 | land a crit | ✓ valid |
| APOTHEOSIS | Apotheosis | reach level 15 | ✓ valid (mid-late; cap is LV20) |
| FULLY_GEARED | Fully Geared | all 4 gear slots equipped | ✓ valid |
| EXPLORER | Explorer | reach all **7** zones | re-tune — was "5 zones" |
| HOARDER | Hoarder | open all **20** chests | ✓ valid |

**Glue status:** wrapped build emits `Wavedash.init({})` (minimum contract). No `setAchievement()` calls yet — wiring is byte-free (lives in `dist/wavedash/index.html` outside the 13 KB zip). Decide before Sep 20.

---

## Assets inventory
```
design/
├── cover_square.png      ✅ FRESH B28 (2026-09-10) — 1080×1080, center-crop of the B28 title (full "HOOVES OF HOPE" logo + rainbow arch + both unicorns). Lossless. (Old Aug-30 720² archived → cover/cover_square_aug30_stale.png.)
├── cover/                ✅ downscaled cover variants: cover_512.png (512²), cover_256.png (256²) — for gallery thumb / social. cover_square_aug30_stale.png = old, do NOT use.
├── trailer.mp4           ✅ FRESH B28 (2026-09-10, EQUIPPED colored unicorn) — 1920×1080 @ 60fps h264 (High) + silent AAC + faststart, 25.6s, 6.7 MB. Recipe: -tune animation -crf 15 -pix_fmt yuv420p (verified best-practice for flat-color pixel art). Title card → 1.8× gameplay (movement/combat/menu-flash) → end card. (Bare-unicorn cut → trailer_bareunicorn_prev.mp4; 720p → trailer_720_prev.mp4; 09-05 → trailer_sep05_stale.mp4.)
├── gif/gameplay.gif      ✅ FRESH B28 (2026-09-10, equipped unicorn) — 640×360, 8s, 20fps, 1.4 MB (palettegen 192c + bayer dither, gifsicle-optimized). For the js13k Markdown description embed (GIF-in-description is a discoverability best-practice).
├── masters_4k/           ✅ 3840×2160 press masters (engine renders resolution-independently, so 4K is free-crisp). 01_title.png done; more on request.
├── screenshots/          ✅ FRESH B28 (2026-09-10) — all 1920×1080 NATIVE (engine re-rasterizes crisply at any res; captured at delivery res, not upscaled), lossless truecolor (rainbows = 3800–5600 colors, so NO palette quant), zero console errors during capture. **On-screen button overlay VISIBLE by design** (click OR hotkeys). **Player unicorn is EQUIPPED with colorful gear** (blue BODY / pink MANE / gold HORN / teal HOOVES) to showcase the 4-slot color-driven equipment system — the shots show boosted stats (HP 23, MP 21, STR 6) from that gear. (Gear is a real in-game drop system; staged for capture via a temp seed that was reverted — shipped build unchanged, HEAD cee3393.):
│   ├── 01_title.png        title screen — rainbow "HOOVES OF HOPE" logo, both unicorns under the arch (title = decorative logo, pre-game, no player equip)
│   ├── 02_intro.png        GREATCORN quest intro ("Reclaim every rainbow. One per DARKCORN. There are seven.") — EQUIPPED colored unicorn + full HUD + touch controls
│   ├── 03_combat.png       combat — EQUIPPED colored unicorn at a trench, "+8 XP" popup, pink foes, spike pits, chest + full control overlay
│   ├── 04_menu.png         character menu — colored portrait + 4 FILLED gear slots (pink mane +3 / gold horn +5 / blue body +4 / teal hooves +4), STR6/HP5/MAG4/DEF5, 3 colored inventory items, full skill tree + controls — THE equipment-system showcase
│   ├── 05_world.png        platforming vista — EQUIPPED colored unicorn mid-jump over spikes, distant enemies, chests + full control overlay
│   ├── _preequip/          prior 09-10 bare-white-unicorn set — superseded, do NOT upload
│   ├── _prev_overlay/ _stale_sep05/ _new/ _stale_aug31/   OLD sets — do NOT upload
└── achievements/         ✅ 8 PNGs (thresholds need CLI re-tune per table above)
```
**Screenshot set is current for B28, overlay-visible, gear-equipped.** Upload order for the store: 01_title → 04_menu → 03_combat → 05_world → 02_intro (lead with logo, then the gear/RPG depth, then action). Trailer + GIF also feature the equipped unicorn.

---

## Master checklist (operator)

### ⚠️ Pre-submission action items
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name `UNICORN, Hooves of Hope` | js13kgames.com/submit | NOW — locks name; tests roadroller zip. Deadline Sep 13 13:00 CEST |
| 2 | Firefox DevTools zero-console-errors check on `dist/game.zip` | local | Before each js13k upload (disqualifying criterion) |
| 3 | ✅ DONE (2026-09-10) — full B28 media at final quality, EQUIPPED colored unicorn (showcases gear system): 5× 1920×1080 overlay-visible screenshots (lossless), 1080p60 trailer (tune-animation/crf15/faststart/AAC, 25.6s), 1080² square cover + 512/256 variants, 640×360 gameplay GIF, 4K title master. All native-res, research-backed encodes. Gear staged via temp seed, reverted — shipped build unchanged (HEAD cee3393). | local | — |
| 4 | Wavedash store paste-in (title, desc, tags, cover, screenshots, trailer) | Portal (see `WAVEDASH-UPLOAD.md`) | Anytime — review has lag |
| 5 | Re-tune EXPLORER / HALFWAY / PRISMATIC thresholds | `wavedash achievement update` | Before Sep 20 |
| 6 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 7 | Wavedash PUBLISH latest build | Portal dashboard | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

### ⏸ Deferred (operator decision)
| # | Action | Why |
|---|---|---|
| ⏸ | Wavedash `setAchievement()` wiring | Byte-free (wrapper outside 13 KB zip); raises Wavedash prize competitiveness. Decide before Sep 20. |
| ⏸ | Mobile category — separate submission | Touch input works; rules allow multi-game entries but same-game-across-platforms is BANNED. |

---

**RELEASE RITUAL (Joey directive 2026-09-02):** every code change ships as `commit → git push origin main → node build.mjs → wavedash build push -m "…"`. GitHub push + Wavedash deploy go as ONE unit so the live deploy never drifts from source. Docs-only commits (like this one) are exempt — git-push only, no rebuild/re-push.
