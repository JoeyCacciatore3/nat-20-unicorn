#!/usr/bin/env node
// guards.mjs — the single INDEX of every build-time invariant UNI-CORN enforces.
// Centralized so an audit can read all compliance/safety rules in one place instead
// of hunting them across build.mjs and tools/. Costs ZERO shipped bytes (build-time only).
//
// ┌── FULL GUARD MAP (what runs, and where) ──────────────────────────────────────┐
// │ SOURCE guards  — pre-build, validate src/ (subprocesses at the top of build.mjs) │
// │   • tools/map-audit.mjs   Return Law: every reachable tile can path to a campfire │
// │   • tools/tpos-check.mjs   TREE edited ⇒ TPOS must be regenerated (no drift)      │
// │   • tools/spike-audit.mjs  no chest / hand-placed DECO overlaps a spike (tile 3)  │
// │ OUTPUT guards  — during build, validate the artifact (the functions below)       │
// │   • checkMinified()   js13k rule #2 (no external URL) + localStorage n20_ prefix  │
// │   • checkPacked()     packed stream must not contain </script (breaks HTML parse) │
// │ RELEASE guard  — manual / CI                                                      │
// │   • tools/pin-guard.mjs    pinned roadroller flags still beat a fresh -O2 (zip)   │
// │ BUDGET gate    — end of build.mjs: final zip ≤ 13,312 B                            │
// └───────────────────────────────────────────────────────────────────────────────┘

const fail = (msg) => { console.error('❌ ' + msg); process.exit(1); };

// Post-terser artifact checks: js13k compliance + storage-namespace safety.
export const checkMinified = (min) => {
  // js13k rule #2 — no external resources may ship.
  if (/https?:\/\//.test(min)) fail('RULES VIOLATION: external URL in bundle (js13k rule #2 — no external resources).');
  // localStorage writes must go through the n20_-prefixed helper (namespacing safety).
  if (/localStorage\.(setItem|clear)/.test(min) && !/n20_/.test(min)) fail('RULES VIOLATION: localStorage use without the n20_ prefix.');
};

// Post-roadroller check: the packed stream is inlined into <script>…</script>, so a
// literal </script anywhere inside it would close the tag early and break parsing.
export const checkPacked = (js) => {
  if (js.includes('</script')) fail('packed stream contains </script — would break HTML parsing.');
};
