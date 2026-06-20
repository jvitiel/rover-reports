# Unit 2 Commit: weak-trigger redefinition, A2 boundary, policy-topic routing

**Commit:** `d762aec`
**Branch:** master
**Path:** server/src/server.ts (1 file, 296 insertions, 59 deletions)
**Staged:** server/src/server.ts ONLY. Backup files untracked, NOT staged. No git add -A.

## What's in the commit

1. **Hard-miss detection** — re-runs `hardFilter()` with original (pre-expansion) intent against selected animals. `intentMissMap` tracks per-animal missed SM attributes.

2. **Sort re-pointed** — `intentMissOf` (hard-miss count) replaces dead `tierOf`. More misses → sorts lower. Blank-last secondary preserved.

3. **One-source signal** — `codeDerivedLowConfidence = anyHardMiss || expansionHappened`. Feeds both response `lowConfidence` boolean and preamble gate.

4. **PREAMBLE SIGNAL block** — replaces MATCH QUALITY signal in user message. Carries intent status, per-animal hard-miss breakdown, soft terms vs policy topics, preamble gate directive.

5. **Policy-topic routing** — signal-assembly code splits soft terms into `policyTopics` vs `preferences` using `POLICY_KEYWORDS` (12 keywords, all FAQ-backed). Policy topics get `POLICY TOPICS RAISED` with "preamble only, zero bios." Three-way gate: fully-met / policy-only / misses.

6. **All 6 prompts updated** — preamble tier model (fully-met / all-3 / 1-2), per-animal mismatch clause rules + GUARD, A2 boundary (engage+hedge+route, no false-assertion), policy-topic category rule, trust-source framing.

## Verified before commit

| Test | Result |
|------|--------|
| Flying-cat (soft-unmet all-3) | ✅ preamble fires + bios clean |
| Strong ("a black cat") | ✅ no preamble, no over-fire |
| Spay FAQ routing | ✅ FAQ in preamble + 0/3 bio leak |
| SEL-RULE5 (all-black) | ✅ |
| Routine "adopt" not policy-routed | ✅ |
| Expansion (orange siamese) | ✅ preamble + lowConfidence |
| Sort limitation (soft not sorted) | ✅ by design |

## Commit chain on master

```
d762aec Unit 2: weak-trigger redefinition, A2 boundary, policy-topic routing  ← NEW
4d11de6 Floor C: FIV/FeLV must-disclose (cat-only)
d425d28 Blank-last sub-sort
d9a08e7 PEND-1: adoption_pending pool exclusion
cd659bd ES color translation table (177/177 coverage)
08a8a7c Phase-1 selection rebuild
```

## Post-commit status

Working tree: clean (only untracked .backup files remain).
