# Submission Kit — UNI-CORN, Hooves of Hope

Copy is paste-ready. **State snapshot: 2026-08-31 — build 12,325 B, save v34, 5-zone hub-and-spoke world, all assets current, achievement slate clean.**

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
— to defeat the five dark Mares and reclaim the five RAINBOW SHARDS that bring the
color back.

- ⚔️ **STR-based combat** — damage scales with your stats and gear. LUCK boosts crit chance.
- 📈 **Full RPG** — 5 stats, a 10-node tiered skill tree, quadratic XP curve, and gear that
  appears on your unicorn's body, piece by piece (body/mane/horn/hooves).
- ⚔️ **6 enemy kinds + elites** — sprinters, hoppers, casters… learn the colors, learn the moves.
  Zone tier scales enemy HP (up to 3×) and damage (+1 per zone).
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

## Wavedash store page (Developer Portal → game settings; lightweight review applies)

**Description (lead hook + skimmable beats):**

> A lone unicorn fights the DARKNESS in this pastel pixel platformer-RPG.
>
> The Darkness has stolen the world's color. Name your unicorn and cross five themed
> zones — meadow, cave, cliffs, peak, and depths — to defeat five dark Mares (your own
> shadowed reflections) and reclaim the five rainbow shards.
>
> Every strike scales with your STR stat and gear, with LUCK-driven crits. Spend stat
> points, climb a 10-node tiered skill tree, and wear the gear you win — every piece shows
> on your unicorn's body. Six enemy kinds with readable color-coded behaviors, elites
> with crowns, and boss arenas that announce their keeper.
>
> Plays with keyboard or touch — desktop and mobile, one build, under 13 kilobytes.

**Tags (accuracy over reach):** `platformer` · `rpg` · `pixel-art` · `action` · `adventure` · `singleplayer`

**Cover art (RULES: 1:1 square · MUST show title · NO other text · no letterboxing):**
- ✅ `design/cover_square.png` (720×720, ~18 KB) — CURRENT. Rainbow arc + pixel unicorn +
  `UNI-CORN` title + `Hooves of Hope` subtitle on starry black background.
  ⚠ Title screen now uses rainbow per-character title + green subtitle — cover
  art may need regeneration to match. Compliant with Wavedash content rules.
- Old draft `cover_square_draft.png` (Aug 29, letterboxed, green strobe frame) — kept
  in tree as historical reference only. **Do NOT upload the draft.**

**Screenshots (3–5 PNG, native res, lead with gameplay):** `design/screenshots/`
- ✅ ALL CURRENT (regenerated 2026-08-30, 960×540 native 16:9):
  - `01_title.png` — title screen (rainbow title, green subtitle, rainbow arc, unicorn) ⚠ may need re-capture
  - `02_name_entry.png` — name-your-unicorn flow
  - `03_slot_select.png` — 3-slot save picker (shows `STAR · LV1` for a saved slot)
  - `04_meadow.png` — open exploration (sky, clouds, trees, cave shaft with rungs)
  - `05_gameplay_enemies.png` — combat frame (elite CRAWLER with crown, BLOB in the
    cave below, spike hazard, DJ platform above) — LEAD WITH THIS
  - `06_pause_menu.png` — full RPG UI (character portrait, 5 stats, 4 equipment slots,
    10-node skill tree, inventory grid, SHARDS 0/5 counter)
- Recommend the 5-pick order for the store: **05 → 04 → 06 → 01 → 03**
  (lead gameplay-first per Wavedash guideline, then meadow, then RPG UI, then title,
  then save picker)

---

## Achievements — SLATE CLEAN (2026-08-30 purge)

**Current status: all 13 stale achievements DELETED from Wavedash** (2026-08-30). They
described a completely different game concept ("Kevin the troll", "gather 50 flowers",
"build home modules", "gloomlings") that never existed here — leftovers from a template.
Verified `wavedash achievement list` returns "No achievements found."

**In-game code has zero achievement calls.** Only `Wavedash.init({})` fires on load.

**When ready to add achievements:** define them fresh in the Developer Portal (or bulk
import via Portal → Add achievement → Import JSON). Match current game exactly. Then
add `Wavedash.setAchievement("ID", true)` calls in `dist/wavedash/index.html` build
glue (build.mjs) — costs zero game.zip bytes since the SDK integration lives only in
the Wavedash-wrapped build.

**Suggested first slate** (all achievable in current game, no design work needed):
- `FIRST_LIGHT` — Free your first Rainbow Shard *(triggers on any boss kill)*
- `HALFWAY` — Free 3 Rainbow Shards
- `PRISMATIC` — Free all 5 Rainbow Shards *(win the game)*
- `NATURAL_20` — Land a critical hit *(natural die-max)*
- `APOTHEOSIS` — Reach level 15
- `FULLY_GEARED` — Equip all 4 slots simultaneously
- `EXPLORER` — Enter all 5 zones
- `HOARDER` — Open all 16 chests

---

## Master checklist (operator)

### ✅ Done
| # | Action | Notes |
|---|---|---|
| ✓ | Store copy + tagline current | This doc, README, src headers all aligned to "Hooves of Hope" + DARKNESS/RAINBOW theme |
| ✓ | Build under budget | 12,325 / 13,312 B (987 free, 7.4% headroom) |
| ✓ | 5-zone world architecture | Rainbow portals connect MEADOW hub to CAVE/CLIFFS/PEAK/DEPTHS |
| ✓ | Multi-zone map audit passes | All portals, bosses, chests reachable at expected ability tier |
| ✓ | Save format v34 | Multi-zone aware, strict version gate |
| ✓ | GitHub `main` pushed | Latest commit up-to-date |

### ⏸ Deferred (operator decision)
| # | Action | Why |
|---|---|---|
| ⏸ | Achievements pipeline (define + SDK integration) | Slate is clean; add together when scope locked |
| ⏸ | Zone visual theming (per-zone sky/ground palettes) | Phase C — 1,600+ B free, feature-level decision |
| ⏸ | Wavedash PUBLISH (not playtest) | One-way commit — save for post-scope-lock, ≤ Sep 20 |

### ⚠️ Todo (in order)
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name | js13kgames.com/submit | NOW — locks name; tests roadroller zip early. Deadline Sep 13 |
| 2 | Firefox console check on `dist/game.zip` | local | Before each js13k re-upload (hard rule) |
| 3 | Wavedash store page: paste title/desc/tags, upload `design/cover_square.png` + 5 screenshots | Wavedash Developer Portal (game settings → Metadata) | Anytime — review has lag, don't leave for Sep 20 |
| 4 | Playtest the current build via Wavedash URL | most-recent `wavedash build push` output | After each meaningful build change |
| 5 | (Re-)push Wavedash build after any code change | `node build.mjs && wavedash build push -m "…"` | Immediately after final commit |
| 6 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 7 | Wavedash PUBLISH | Portal dashboard → publish latest build | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

### 📋 Assets inventory (current state on disk, 2026-08-30)
```
design/
├── cover_square.png             ✅ CURRENT (720×720, 18 KB — upload this)
├── cover_square_draft.png       ❌ old draft (Aug 29, letterboxed, wrong title color)
└── screenshots/                 ✅ ALL CURRENT (regenerated 2026-08-30, native 960×540)
    ├── 01_title.png             (rainbow title, green subtitle, arc, unicorn)
    ├── 02_name_entry.png        (name-your-unicorn input)
    ├── 03_slot_select.png       (3-slot save picker showing STAR · LV1)
    ├── 04_meadow.png            (meadow exploration — trees, clouds, cave shaft)
    ├── 05_gameplay_enemies.png  (combat: elite crown crawler + blob + spikes) [LEAD]
    └── 06_pause_menu.png        (full RPG UI: stats, gear, skill tree, shard tracker)
```
