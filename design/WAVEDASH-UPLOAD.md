# WaveDash store-page update — STAGED, ready to paste (refreshed 2026-09-02)

**Latest deployed build:** `mn719n5j7pm0dv1cp3se4fb6vd8dsfkf` (2026-09-04, **13,212 B**, git `e748b3e`: 7 zones-per-DARKCORN + music engine + touch UI overhaul + scatter v3 + hidden bosses + binary-choice popup unification). Source and live deploy are ALIGNED. **RELEASE RITUAL: GitHub push + Wavedash deploy always go together (Joey directive).**
**Playtest URL:** https://wavedash.com/playtest/nat-20-unicorn/90c398b7-5063-4a61-8757-69c7b2d3efdf
**Playtest data:** wiped 2026-09-01 (all players, all categories) — clean slate. Wipe still in effect. Achievement definitions confirmed intact (8 rows on record; 2 need repurposing — see below).

**Why this doc exists:** the store page (title, description, cover, screenshots, tags) is
editable **only** in the web Developer Portal — it is session-auth gated. The CLI/API key
(`wd_…`) has NO store-metadata endpoint. An agent with only the API key **cannot** push
these — they need your logged-in browser. Everything below is pre-written so your part is
copy-paste + file-pick.

Portal: **https://wavedash.com/dev-portal** → game **nat-20-unicorn** → Store page / Metadata.

---

## 1. TITLE — the big one (currently WRONG on WaveDash)
The store currently shows **`NAT 20 UNICORN`** (old working name). Change to:

```
UNICORN, Hooves of Hope
```

> Note: the URL slug `nat-20-unicorn` is permanent and fine to leave — only the display title changes.

---

## 2. DESCRIPTION (paste verbatim — unified-world accurate)

```
A lone unicorn fights the DARKNESS in this pastel pixel platformer-RPG — under 13 KB.

The Darkness stole the world's color. Name your unicorn and cross one large connected
world to defeat the DARK CORNS (your own shadowed reflections) and reclaim the
Rainbow Shards they shattered.

- One connected 800×160 world — spike pits, ability-gated climbs, floating platforms,
  bounce mushrooms, hidden chests. Ability gates (double-jump, dash, bounce) control reach.
- Full RPG: 5 stats, a 12-node tiered skill tree, quadratic XP curve, and gear that drops
  as pixel item icons (armor / cape / sword / boots) and recolors the matching body part.
- Movement kit that unlocks the world: DBL JUMP, TRI JUMP, DASH, LONG DASH, bounce pads.
- Six enemy kinds plus crowned SELECT elites (~6% roll); each level tier scales enemies.
- DARK CORN bosses, each holding one rainbow band (R-O-Y-B-V-G), each with a phase-2 twist.
  Defeat one and it turns friendly — a redeemed unicorn you can talk to at its arena.
- A GREAT CORN elder greets you with a chatty intro + re-talk quips (head-stemmed bubbles).
- Two-slot potion hot-bar (HP + MP, fixed +10 each; POT +5 skill boosts to +15).
- Plays with keyboard or touch — desktop and mobile from one build. Saves across 2 slots.
```

**Tags:** `platformer` · `rpg` · `pixel-art` · `action` · `adventure` · `singleplayer`

---

## 3. SCREENSHOTS

**⚠️ ALL CURRENT SCREENSHOTS ARE STALE.** They were captured 2026-08-31 from the old
5-zone build. The unified-world consolidation (Sep 2 today) removed CAVE/CLIFFS/PEAK/DEPTHS
as separate zones — everything now lives in one big MEADOW map.

**Screenshot refresh needed before Wavedash store upload:**

| Order | Suggested file | Shows |
|---|---|---|
| 1 | `01_west_climb.png` | Western climb showing DJ terraces + YELLOW/BLUE CORN reach (LEAD: gameplay) |
| 2 | `02_east_run.png` | East extension with DASH gap + LONG DASH gap + TRI-JUMP stack |
| 3 | `03_boss_fight.png` | One of the CORN bosses mid-fight (RED at center or ORANGE at east walkway) |
| 4 | `04_char_menu.png` | Character menu — new HUD (LV/name/rainbow) + 4-tier skill tree + colored equipment |
| 5 | `05_title.png` | Title screen — rainbow "UNICORN / Hooves of Hope" |

Capture at native 960×540 via the Wavedash playtest URL or local `dist/index.html`.
Path: `design/screenshots/` (overwrite existing stale files).

> The OLD screenshots (5-zone, pre-rename) are archived in
> `design/screenshots/_stale_aug30/` — do NOT upload those.

---

## 4. COVER ART
`design/cover_square.png` (720×720) — rainbow arc + pixel unicorn + `UNICORN` /
`Hooves of Hope`, starry black. Title-correct and content-rule compliant. Keep as-is.
(Cover uses solid gold title; in-game title uses rainbow per-letter — cosmetic, not
worth regenerating unless you want an exact match.)

---

## 5. ACHIEVEMENTS — 2 need updating on Wavedash-side

The 8 achievement records on Wavedash still describe the OLD 5-zone game. Two are stale:

| ID | Recorded threshold | Status |
|---|---|---|
| EXPLORER | "enter all 5 zones" | ⚠️ STALE — no zones exist. Retire or repurpose (e.g. "reach every corner of the world") |
| HOARDER | "open all 20 chests" | ⚠️ STALE — unified world now has **8 chests**. Update threshold to 8 |
| HALFWAY | "3 of 5 shards" | ⚠️ shard count changed — now **6 bosses** (heading to 7 w/ INDIGO). Re-tune or keep count-agnostic ("half the shards") |
| PRISMATIC | "all 5 shards (win)" | ⚠️ win is now **all 6** shards (`seeds.bosses.length`). Update or keep count-agnostic ("all shards") |

Others (FIRST_LIGHT, NATURAL_20, APOTHEOSIS, FULLY_GEARED) still describe current gameplay
correctly and need no changes.

**To update via CLI:**
```
wavedash achievement update EXPLORER --description "..." --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
wavedash achievement update HOARDER --description "..." --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
# or:
wavedash achievement delete EXPLORER --game-id j97697bsqqnzpcxbmpdhfs3hen8cp5yv
```

---

## What the operator needs to do (portal login required)

1. **Change title** on store page from `NAT 20 UNICORN` → `UNICORN, Hooves of Hope`
2. **Paste description** from Section 2 above
3. **Add tags** from Section 2
4. **Upload cover art** (`design/cover_square.png`) — unchanged, still valid
5. **Refresh screenshots** — see Section 3 (blocking on capture from unified-world build)
6. **Update EXPLORER + HOARDER achievements** via CLI (Section 5) or delete/recreate

Deferred until:
- Screenshot capture is a ~10 minute task with the Wavedash playtest URL and any screenshot tool
- Achievement CLI edits take ~2 minutes once decided
