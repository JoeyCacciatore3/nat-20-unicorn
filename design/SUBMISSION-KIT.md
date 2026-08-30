# Submission Kit — UNI-CORN, Hooves of Hope

Copy is paste-ready. **State snapshot: 2026-08-30 — build 11,700 B, save v32, 5-zone hub-and-spoke world.**

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

- 🎲 **D&D combat** — every hit is a die roll: d4 at level 1, d12 at the cap. Max roll = CRIT.
- 📈 **Full RPG** — 5 stats, a 16-node open skill tree, quadratic XP curve, and gear that
  appears on your unicorn's body, piece by piece (body/mane/horn/hooves).
- ⚔️ **6 enemy kinds + elites** — sprinters, hoppers, casters… learn the colors, learn the moves.
  Zone tier scales enemy HP (up to 3×) and damage (+1 per zone).
- 👑 **5 named boss Mares** — dark mirrors of yourself, each holding one rainbow band
  (R-O-Y-B-V), each with a phase-2 twist.
- 🌈 **Rainbow portals** connect the 5 zones from the MEADOW hub. Ability gates
  (double-jump, dash, magic bolt) control progression order.
- 🎒 **10-slot inventory** (+5 via SADDLEBAGS skill) — HP potions, MP potions, gear drops.
  Click to use / equip, X to discard. Consumables auto-consume when applicable.
- 💾 Saves your progress across 3 slots.

**Controls:** WASD/arrows + Space jump · J or X dash-attack · L shot · H heal — or
touch: floating joystick + action buttons. Works on desktop and mobile from one build.
```

**Categories:** Desktop · Mobile · Wavedash

---

## Wavedash store page (Developer Portal → game settings; lightweight review applies)

**Description (lead hook + skimmable beats):**

> A lone unicorn rolls dice against the DARKNESS in this pastel pixel platformer-RPG.
>
> The Darkness has stolen the world's color. Name your unicorn and cross five themed
> zones — meadow, cave, cliffs, peak, and depths — to defeat five dark Mares (your own
> shadowed reflections) and reclaim the five rainbow shards.
>
> Every strike is a real die roll, d4 to d12, with crits on the max face. Spend stat
> points, climb a 16-node open skill tree, and wear the gear you win — every piece shows
> on your unicorn's body. Six enemy kinds with readable color-coded behaviors, elites
> with crowns, and boss arenas that announce their keeper.
>
> Plays with keyboard or touch — desktop and mobile, one build, under 13 kilobytes.

**Tags (accuracy over reach):** `platformer` · `rpg` · `pixel-art` · `action` · `adventure` · `singleplayer`

**Cover art (RULES: 1:1 square · MUST show title · NO other text · no letterboxing):**
- ⚠️ `design/cover_square_draft.png` (720×720) — from earlier build. **Needs regeneration** to reflect current title screen (static gold, no rainbow strobe).

**Screenshots (3–5 PNG, native res, lead with gameplay):** `design/screenshots/`
- ⚠️ Existing 4 screenshots are from earlier build state (before Phase B zones / naming refactor / rainbow-strobe removal). **Regenerate before final submission.**

---

## Achievements — DEFERRED

**Current status: intentionally NOT connected.** WD_GLUE was rewritten to the minimum
Wavedash SDK contract (`Wavedash.init({})`) in a prior cleanup pass. The stale
achievement polling was removed. The 13 achievement IDs on the platform have no
in-game hooks yet.

**Operator decision (still valid):** hold achievements until game scope is locked.
When ready to revisit: decide (a) rebuild the achievement-watcher pipeline against
current save format v32, (b) delete the 13 dead IDs from the portal, or (c) leave
deferred through submission.

---

## Master checklist (operator)

### ✅ Done
| # | Action | Notes |
|---|---|---|
| ✓ | Store copy + tagline current | This doc, README, src headers all aligned to "Hooves of Hope" + DARKNESS/RAINBOW theme |
| ✓ | Build under budget | 11,700 / 13,312 B (1,612 free, 12.1% headroom) |
| ✓ | 5-zone world architecture | Rainbow portals connect MEADOW hub to CAVE/CLIFFS/PEAK/DEPTHS |
| ✓ | Multi-zone map audit passes | All portals, bosses, chests reachable at expected ability tier |
| ✓ | Save format v32 | Multi-zone aware, strict version gate |
| ✓ | GitHub `main` pushed | Latest commit up-to-date |

### ⏸ Deferred (operator decision)
| # | Action | Why |
|---|---|---|
| ⏸ | Achievements pipeline | Holding until game scope is locked |
| ⏸ | Cover art + screenshots regeneration | Regenerate closer to submission (avoid re-doing after further build changes) |
| ⏸ | Zone visual theming (per-zone sky/ground palettes) | Phase C — 1,600+ B free, feature-level decision |
| ⏸ | Wavedash PUBLISH (not playtest) | One-way commit — save for post-scope-lock, ≤ Sep 20 |

### ⚠️ Todo (in order)
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register js13k draft, claim name | js13kgames.com/submit | NOW — locks name; tests roadroller zip early. Deadline Sep 13 |
| 2 | Firefox console check on `dist/game.zip` | local | Before each js13k re-upload (hard rule) |
| 3 | Regenerate cover + screenshots | local capture from latest build | Before final submission |
| 4 | Store page (Wavedash portal): paste title/desc/tags, upload cover + screenshots | Wavedash Portal | Anytime — but store review has a lag, don't leave for Sep 20 |
| 5 | Playtest the current build via Wavedash URL | current playtest link (see recent commits) | After each meaningful build change |
| 6 | (Re-)push Wavedash build | `wavedash build push -m "…"` | After each finalized build |
| 7 | Final zip → js13k form | js13kgames.com/submit | ≤ Sep 13 13:00 CEST |
| 8 | Wavedash PUBLISH | Portal dashboard | ≤ Sep 20 CEST (deploy-only week — no fixes after) |

### 📋 Assets inventory (current state on disk)
```
design/
├── cover_square_draft.png       (720×720, stale — regenerate before submission)
└── screenshots/
    ├── 01_title.png             (stale — regenerate)
    ├── 02_gameplay_meadow.png   (stale — regenerate; also rename to reflect current MEADOW zone)
    ├── 03_gameplay_cliff.png    (stale — regenerate)
    └── 04_character_sheet.png   (stale — regenerate; UI has evolved)
```

**Note:** all design assets predate the 5-zone refactor, naming cleanup, rainbow-strobe
removal, and visual polish passes. Old ones still convey the concept but should be
refreshed before final store-page upload.
