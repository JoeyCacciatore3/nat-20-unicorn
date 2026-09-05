# Wavedash store-page update — STAGED, ready to paste (refreshed 2026-09-05)

**Live deploy:** build `mn7ftbxsrdd4a9v13t0ncha4vx8dtk3t` (**13,230 B**, git `a9afc90`). Source and deploy are **ALIGNED**.
**Play URL:** https://wavedash.com/playtest/nat-20-unicorn/5f83bf86-7903-401d-ae67-9aa57425958b
**All copy re-verified against `src/*.js` on 2026-09-05** (prior version described a stale 6-boss / 12-node / 800×160 build — corrected throughout).

**Why this doc exists:** the store page (title, description, cover, screenshots, tags, trailer) is editable **only** in the web Developer Portal — session-auth gated. The CLI/API key has NO store-metadata endpoint. An agent cannot push these; they need your logged-in browser. Everything below is pre-written so your part is copy-paste + file-pick.

Portal: **https://wavedash.com/dev-portal** → game **nat-20-unicorn** → Store page.

---

## 1. TITLE
Store currently shows the old working name. Change to:
```
UNICORN, Hooves of Hope
```
> The URL slug `nat-20-unicorn` is permanent and fine to leave — only the display title changes.

---

## 2. DESCRIPTION (paste — Wavedash-style: one-line hook, then skimmable beats)

```
The world lost its color. You're the last unicorn who can bring it back.

The DARKCORN shattered the rainbow and drained the world to grey. Name your unicorn, grow strong, and hunt down all seven DARKCORN to reclaim the rainbow shards — a full pixel-art platformer-RPG in under 13 KB.

- Level up 5 stats and spend points across a 14-node skill tree: double & triple jump, dash-attack, ranged shots, healing, and more.
- Loot gear that drops as pixel icons and recolors your unicorn — horn, mane, body, and hooves each carry a stat.
- Battle 6 enemy types across one big connected world; every DARKCORN is a mirror of you with a phase-2 twist.
- Explore 7 regions — meadows, high canopy, storm peaks, and underground caverns — opened up by the abilities you earn.
- Crit with LUCK, heal in a pinch, rest at hearths, and hunt down 20 hidden chests.

Plays with keyboard or touch, desktop or mobile — one build, both.

Controls — Keyboard: WASD/arrows move · Space jump · J dash · L shot · H heal · P pause. Touch: floating joystick + action buttons.
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
design/cover_square.png   (720×720 — title-correct, content-rule compliant, keep as-is)
```

---

## 5. SCREENSHOTS (upload 3–5, gameplay first — REFRESHED 2026-09-05)
Captured from the current build (`dist/index.html`, 960×540). Upload in this order:

| # | File | Shows |
|---|---|---|
| 1 | `design/screenshots/01_intro.png` | GREATCORN intro bubble + HUD + action buttons (gameplay lead) |
| 2 | `design/screenshots/02_world.png` | Spike-pit traversal, bounce mushroom, platforms, enemies |
| 3 | `design/screenshots/03_exploration.png` | Meadow — spikes, mushroom, enemy, open sky |
| 4 | `design/screenshots/04_skill_tree.png` | Character menu: stats + equipment slots + 14-node skill tree (UI/feature shot) |
| 5 | `design/screenshots/05_title.png` | Title screen — rainbow UNICORN / HOOVES OF HOPE |

> Old 5-zone captures are archived in `design/screenshots/_stale_aug31/` — do NOT upload those.

---

## 6. TRAILER (optional but recommended)
```
design/trailer.mp4   (960×540, 15.6s — opens on gameplay hook, closes on title card)
```
Wavedash likes a short trailer that hooks in the first few seconds — this one opens mid-jump over a spike pit.

---

## 7. ACHIEVEMENTS — thresholds need CLI re-tune (Wavedash-side)
The 8 records may still describe the old 5-zone build. Verify live state:
```
wavedash achievement list --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
```
Correct thresholds for the CURRENT 7-boss / 7-shard / 20-chest build:

| ID | Correct threshold | Action |
|---|---|---|
| PRISMATIC | all **7** shards (win) | update — was 5 |
| HALFWAY | 3–4 of 7 shards (or count-agnostic) | update — was "3 of 5" |
| EXPLORER | reach all **7** zones (or "every corner") | update — was "5 zones" |
| HOARDER | open all **20** chests | ✓ likely already correct (source has 20 chests) |
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
4. **Cover art** → `design/cover_square.png`
5. **Screenshots** → upload the 5 from Section 5, in order
6. **Trailer** → `design/trailer.mp4` (optional)
7. **Achievements** → re-tune 3 thresholds via CLI (Section 7)

**Deadlines:** js13k submit ≤ Sep 13 13:00 CEST · Wavedash publish ≤ Sep 20 CEST.
