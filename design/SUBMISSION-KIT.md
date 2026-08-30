# Submission Kit — UNI-CORN, Hooves of Hope

Copy is paste-ready. **State snapshot: 2026-08-30 — build 11,437 B, save v31.**

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
**The gloom has swallowed the realm, and you are the last unicorn left to fight it.**

Name your unicorn and set out across a connected world of meadows,
root caves, cliffs, treetops and the Gloom Heart — to defeat the five dark Mares and
claim the five golden rainbow shards that bring the color back.

- 🎲 **D&D combat** — every hit is a die roll: d4 at level 1, d12 at the cap. Max roll = CRIT.
- 📈 **Full RPG** — 5 stats, a 16-node open skill tree, and gear that appears on
  your unicorn's body, piece by piece (body/mane/horn/hooves).
- ⚔️ **6 enemy kinds + elites** — sprinters, hoppers, casters… learn the colors, learn the moves.
- 👑 **5 named boss Mares** — dark mirrors of yourself, each guarding a shard, each with a phase-2 twist.
- 🎒 **10-slot inventory** (+5 via SADDLEBAGS skill) — HP potions, MP potions, gear drops.
  Click to use / equip, X to discard. Consumables auto-consume when applicable.
- 💾 Saves your progress across 3 slots.

**Controls:** WASD/arrows + Space jump · J dash-attack · L shot · S heal — or
touch: floating joystick + action buttons. Works on desktop and mobile from one build.
```

**Categories:** Desktop · Mobile · Wavedash

---

## Wavedash store page (Developer Portal → game settings; lightweight review applies)

**Description (lead hook + skimmable beats):**

> A lone unicorn rolls dice against the dark in this pastel pixel platformer-RPG.
>
> The gloom has swallowed the realm. Name your unicorn and fight
> across meadows, caves, cliffs and treetops to defeat five dark Mares — your own
> shadowed reflections — and recover the five golden rainbow shards.
>
> Every strike is a real die roll, d4 to d12, with crits on the max face. Spend stat
> points, climb a 16-node open skill tree, and wear the gear you win — every piece shows
> on your unicorn's body. Six enemy kinds with readable color-coded behaviors, elites
> with crowns, and boss arenas that announce their keeper.
>
> Plays with keyboard or touch — desktop and mobile, one build, under 13 kilobytes.

**Tags (accuracy over reach):** `platformer` · `rpg` · `pixel-art` · `action` · `adventure` · `singleplayer`

**Cover art (RULES: 1:1 square · MUST show title · NO other text · no letterboxing):**
- ✅ `design/cover_square_draft.png` (720×720) — **REGENERATED 2026-08-30 from real title screen with "Hooves of Hope" tagline**. Verify against Wavedash guidelines before final upload.

**Screenshots (3–5 PNG, native res, lead with gameplay):** `design/screenshots/`
- ✅ `01_title.png` — branded title (Hooves of Hope, gold horn, rainbow mane, tail)
- ✅ `02_gameplay_meadow.png` — unicorn walking in meadow, HP+MP HUD, touch buttons visible
- ✅ `03_gameplay_cliff.png` — cliff terrain variety (terraced platforms + wall)
- ✅ `04_character_sheet.png` — RPG depth (equipped gear w/ tier trims, stat row, skill tree, populated inventory, right-column buttons)
- **All 4 regenerated 2026-08-30 from current build (11,437 B).**

---

## Achievements — DEFERRED

**Current status: intentionally NOT connected.**

The 13 achievement IDs already exist on the Wavedash platform (verified 2026-08-29 CLI import).
BUT the build's WD_GLUE reads a stale save key + a removed field — even if fixed, only 1 of 13
(SILVER_TONGUE / welcomed) has a code path that triggers it. The other 12 have no in-game hooks.

**Operator decision 2026-08-30:** hold achievements until foundation is stable; game is still
in flux. Do NOT patch WD_GLUE or re-add achievement watchers until scope is locked.

When ready to revisit: decide (a) fix glue + accept 1/13 firing, (b) delete 12 dead IDs from
portal, or (c) rebuild the achievement-watcher pipeline. See channel log for details.

---

## Master checklist (operator)

### ✅ Done
| # | Action | Notes |
|---|---|---|
| ✓ | Store copy + tagline current | This doc, README, src headers all aligned to "Hooves of Hope" |
| ✓ | Cover art regenerated | `cover_square_draft.png` 720×720 from real title screen |
| ✓ | Screenshots regenerated | 4 fresh PNGs in `design/screenshots/`, obsolete ones deleted |
| ✓ | Wavedash playtest pushed | Build ID `mn73cwktdww32j5b76hpdtmp718de0ax` (2026-08-30) |
| ✓ | GitHub `main` pushed | Commit `48feadd` |
| ✓ | Build under budget | 11,437 / 13,312 B (1,875 free, 14.1% headroom) |
| ✓ | Docs/knowledge synced | README, SUBMISSION-KIT, source headers, 2 OneStone entries |

### ⏸ Deferred (operator decision)
| # | Action | Why |
|---|---|---|
| ⏸ | Achievements pipeline | Holding until game scope is locked (see Achievements section above) |
| ⏸ | Wavedash PUBLISH (not playtest) | One-way commit — save for post-scope-lock, ≤ Sep 20 |

### ⚠️ Todo (in order)
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name | js13kgames.com/submit | NOW — locks name; tests roadroller zip early. Deadline Sep 13 |
| 2 | Firefox console check on `dist/game.zip` | local | Before each js13k re-upload (hard rule) |
| 3 | Store page (Wavedash portal): paste title/desc/tags, upload cover + screenshots | Wavedash Portal | Anytime — but store review has a lag, don't leave for Sep 20 |
| 4 | Playtest the current build via Wavedash URL | https://wavedash.com/playtest/nat-20-unicorn/9ee469cc-0a8b-4ee0-bf8c-a9cd62ee5737 | After each meaningful build change |
| 5 | (Re-)push Wavedash build | `wavedash build push -m "…"` | After each finalized build |
| 6 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 7 | Wavedash PUBLISH | Portal dashboard | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

### 📋 Assets inventory (current state on disk)
```
design/
├── cover_square_draft.png       (720×720, fresh, Hooves of Hope)
└── screenshots/
    ├── 01_title.png             (fresh, Hooves of Hope branding)
    ├── 02_gameplay_meadow.png   (fresh)
    ├── 03_gameplay_cliff.png    (fresh)
    └── 04_character_sheet.png   (fresh, shows current inventory + skill tree)

REMOVED (obsolete):
- design/title_mockup.png         (old "NAT 20 UNICORN" branding)
- design/screenshots/05_character_create.png  (that screen was removed)
- design/screenshots/03_gameplay_caves_edge.png  (replaced by cliff shot)
```
