# Submission Kit — UNI-CORN, the last savior
All specs verified from primary sources 2026-08-29 (js13kgames.com/2026/blog/submit-form-open,
docs.wavedash.com/publishing/metadata + /content-guidelines). Copy below is paste-ready.

## Names (keep identical everywhere)
- **Title:** `UNI-CORN, the last savior`
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
- 📈 **Full RPG** — 5 stats, a 19-node skill tree in 3 branches, and gear that appears
  on your unicorn's body, piece by piece.
- ⚔️ **6 enemy kinds + elites** — sprinters, hoppers, casters… learn the colors, learn the moves.
- 👑 **5 named boss Mares** — dark mirrors of yourself, each guarding a shard, each with a phase-2 twist.
- 💾 Saves your progress. 🏆 13 achievements on Wavedash.

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
> points, climb a 19-node skill tree, and wear the gear you win — every piece shows
> on your unicorn's body. Six enemy kinds with readable color-coded behaviors, elites
> with crowns, and boss arenas that announce their keeper.
>
> Plays with keyboard or touch — desktop and mobile, one build, under 13 kilobytes.

**Tags (accuracy over reach):** `platformer` · `rpg` · `pixel-art` · `action` · `adventure` · `singleplayer`

**Cover art (RULES: 1:1 square · MUST show title · NO other text · no letterboxing):**
- ✅ `design/cover_square_draft.png` (720×720, from the real title screen) — compliant draft.
- ❌ `design/title_mockup.png` — OLD BRANDING ("NAT 20 UNICORN" + tagline), not square. Do not use.

**Screenshots (3–5 PNG, native res, lead with gameplay):** `design/screenshots/`
1. `02_gameplay_meadow.png` — platforming + enemies (LEAD)
2. `03_gameplay_caves_edge.png` — world variety
3. `04_character_sheet.png` — RPG depth
4. `05_character_create.png` — name entry on the title screen
5. `01_title.png` — branding (last)

**Achievements:** ✅ DONE (verified 2026-08-29 via CLI — all 13 identifiers exist on the
platform). Optional: glance at display text in the portal to confirm it matches this JSON.

---

## Master checklist (operator)
| # | Action | Where | When |
|---|---|---|---|
| 1 | Register draft, claim name | js13kgames.com/submit | NOW (locks name; tests roadroller zip early) |
| 2 | Firefox console check | local | before submit (hard rule) |
| 3 | ~~Import achievements JSON~~ ✅ done 08-29 (13 IDs live; optional text glance) | Wavedash Portal | — |
| 4 | Store page: title/desc/tags/cover/screens | Wavedash Portal | any time (review lag — don't leave for Sep 20) |
| 5 | Final zip + GitHub submit | js13k form | ≤ Sep 13 13:00 CEST |
| 6 | `wavedash update && wavedash build push` | CLI | after final build |
| 7 | PUBLISH (not playtest) | Wavedash dashboard | ≤ Sep 20 (deploy-only week — no fixes allowed) |
