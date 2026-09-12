# Wavedash store-page update — STAGED, ready to paste

**Currency: B37 shipped & aligned (git `main == origin == 3f58b9c`; Wavedash playtest build `mn77zd3d8pmjbe1nzzg8z9kqdh8e9fmz`).** Build **12,809 B / 503 free (96.2%)** (B37 = mobile portrait rotate-to-landscape prompt). Copy re-verified against `src/*.js`. The world is a compact **480×30** 3-band map — shallow single-level caves, full-width developed underground, spawn centered at tile 240, dense sky+cave platforming; the **skill tree is gone** (abilities always-on); all six enemies are **grounded walkers**.

> ⚠️ **MEDIA STALE — RE-SHOOT REQUIRED.** Every cover / screenshot / trailer / GIF referenced below is B28: it shows the removed skill tree, the old 600×160 world, and the old floater enemies. Re-capture against B35 before uploading.

**Why this doc exists:** the store page (title, description, cover, screenshots, tags, trailer) is editable **only** in the web Developer Portal — session-auth gated. The CLI/API key has NO store-metadata endpoint. An agent cannot push these; they need your logged-in browser. Everything below is pre-written so your part is copy-paste + file-pick.

Portal: **https://wavedash.com/dev-portal** → your game → Store page.
> ✅ **Slug CONFIRMED = `hoovesofhope`**, portal title **"Hooves Of Hope"**. Verified 2026-09-10 via `wavedash project list` (game_id `j97697bsqqnzpcxbmpdhfs3hen8cp5yv` — the same id in `wavedash.toml`). The old `nat-20-unicorn` slug is fully retired; no ambiguity remains. Display **title** everywhere = **HOOVES OF HOPE**.

---

## 1. TITLE
```
UNICORN, Hooves of Hope
```
> Only the display title changes; the URL slug is fixed by the platform.

---

## 2. DESCRIPTION (paste — Wavedash-style: one-line hook, then skimmable beats)

```
The world lost its color. You're the last unicorn who can bring it back.

The DARKCORN shattered the rainbow and drained the world to grey. Name your unicorn, grow strong, and hunt down all seven DARKCORN to reclaim the rainbow shards — a full pixel-art platformer-RPG in under 13 KB.

- Level up 5 stats — every level you allocate +2 points (the game locks you in until you spend them). Triple jump, long dash, double shot, and healing are all yours from the start.
- Loot gear that drops as pixel icons and recolors your unicorn — horn, mane, body, and hooves each carry a stat.
- Fight 6 enemy kinds across three attack styles — melee leapers, ranged snipers, and telegraphed chargers — then face 7 DARKCORN bosses that run the full apex kit and hunt you down once woken.
- Explore a compact three-band world — sky platform routes, a walkable highway, and an underground cave network across meadows, canopy, storm peaks, and deep caverns.
- Crit with LUCK, heal in a pinch, return to the GREATCORN for a full restore, and hunt down 20 hidden chests.

Plays with keyboard or touch, desktop or mobile — one build, both.

Controls — Keyboard: WASD/arrows move · Space jump · J dash · L shot · H heal · I/O potions · P menu · Esc back. Touch: floating joystick + action buttons.
```

---

## 3. TAGS (pick 5–8; Wavedash says favor accuracy over reach)
```
platformer · rpg · action · pixel-art · metroidvania · adventure · fantasy · singleplayer
```
> `metroidvania` is honest here (one connected map, ability-gated reach). Drop it if you'd rather stay conservative.

---

## 4. COVER ART
```
design/cover_square.png   🔴 STALE B28 — RE-SHOOT against B35 (1080×1080)
```
> The title-screen logo/arch composition is largely unchanged, so the cover is the *least* stale asset — but re-verify against the B35 title before uploading. If the portal wants 16:9 instead of 1:1, use a fresh `screenshots/01_title.png`.

---

## 5. SCREENSHOTS (upload 3–5, gameplay first) — 🔴 STALE B28, RE-SHOOT AGAINST B35
The `design/screenshots/0?_*.png` files are B28 (old 600×160 world, old menu with the **removed skill tree**, floater enemies) — **do NOT upload them.** Re-capture the set against the B35 build (equipped unicorn, overlay visible) via `tools/capture-build.mjs`. The recommended composition/order below still applies:

| # | File | Shows |
|---|---|---|
| 1 | `01_title.png` | Title — rainbow "HOOVES OF HOPE" logo, both unicorns under the arch |
| 2 | `04_menu.png` | Character menu — colored portrait + 4 FILLED gear slots, the stats column (STR/HP/MAG/DEF/LUCK) + colored inventory — the gear/RPG showcase (NO skill tree — it's removed) |
| 3 | `03_combat.png` | Combat — equipped colored unicorn at a trench, "+8 XP", pink foes, spike pits, chest + full control overlay |
| 4 | `05_world.png` | Platforming vista — equipped colored unicorn mid-jump over spikes, distant enemies, chests + full control overlay |
| 5 | `02_intro.png` | GREATCORN quest intro ("Reclaim every rainbow. One per DARKCORN. There are seven.") — equipped unicorn + full HUD + touch controls |

> Superseded sets (do NOT upload): `_preequip/` (bare white unicorn), `_prev_overlay/`, `_stale_sep05/`, `_new/`, `_stale_aug31/`.

---

## 6. TRAILER (optional but recommended)
```
design/trailer.mp4   🔴 STALE B28 — RE-CUT against B35 (shows removed skill tree + old world)
```
> Encoded with the verified best-practice recipe for flat-color pixel art: `-tune animation -crf 15 -pix_fmt yuv420p`, silent AAC track (needed for Twitter/X autoplay), `+faststart` for web streaming. Features the EQUIPPED colored unicorn (matches the screenshots). Structure: crisp title card (2.5s) → 1.8× gameplay body (movement, combat, menu flash showing equipped slots) → end card ("HOOVES OF HOPE / Unicorns and Rainbows / js13kGames 2026"). No play URL baked in (publish not yet live). Old cuts → `trailer_bareunicorn_prev.mp4`, `trailer_720_prev.mp4`, `trailer_sep05_stale.mp4`.

**GIF for the js13k description:** `design/gif/gameplay.gif` (640×360, 8s, 1.4 MB, equipped unicorn) — embed in the Markdown description; a gameplay GIF-in-description is a discoverability best-practice for js13k entries.

---

## 7. ACHIEVEMENTS — thresholds need CLI re-tune (Wavedash-side)
Verify live state:
```
wavedash achievement list --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
```
Correct thresholds for the CURRENT 7-boss / 7-shard / 20-chest / LV20-cap build:

| ID | Correct threshold | Action |
|---|---|---|
| PRISMATIC | all **7** shards (win) | update — was 5 |
| HALFWAY | 3–4 of 7 shards (or count-agnostic) | update — was "3 of 5" |
| EXPLORER | reach all **7** zones | update — was "5 zones" |
| HOARDER | open all **20** chests | ✓ valid |
| FIRST_LIGHT / NATURAL_20 / APOTHEOSIS (LV15) / FULLY_GEARED | unchanged | ✓ valid |

```
wavedash achievement update EXPLORER  --description "..." --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
wavedash achievement update HALFWAY   --description "..." --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
wavedash achievement update PRISMATIC --description "..." --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
```

---

## What the operator does (portal login required)
1. **Title** → `UNICORN, Hooves of Hope`
2. **Description** → paste Section 2
3. **Tags** → Section 3
4. **Cover art** → `design/cover_square.png` (verify/refresh first)
5. **Screenshots** → upload the re-shot B28 set (Section 5), gameplay first
6. **Trailer** → re-cut `design/trailer.mp4` (optional)
7. **Achievements** → re-tune 3 thresholds via CLI (Section 7)

**Deadlines:** js13k submit ≤ Sep 13 13:00 CEST · Wavedash publish ≤ Sep 20 CEST.
