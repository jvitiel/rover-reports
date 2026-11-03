# Midday Scheduler Offset Fix — 2026-11-03

**Commit:** 37b5614  
**File:** server/src/server.ts — 10 insertions, 40 deletions  
**Build:** tsc exit 0

---

## Approach

Created a shared helper `msUntilNextEastern(hour, minute)` using the proven `toLocaleString('en-US', { timeZone: 'America/New_York' })` technique (same as `msUntil2355Eastern` and `msUntilNext0010`). Replaced the three hardcoded-EDT-offset inline calculators with one-line calls:

- `msUntilNext2AM` → `msUntilNextEastern(2, 0)`
- `msUntilNext9AM` → `msUntilNextEastern(9, 0)`
- `msUntilNext830AM` → `msUntilNextEastern(8, 30)`

Also refactored `msUntil2355Eastern` to call the shared helper (`msUntilNextEastern(23, 55)`) — preserving the existing function name and all callers.

## Diff

```diff
+// Shared helper: ms until next <hour>:<minute> in America/New_York
+function msUntilNextEastern(hour: number, minute: number): number {
+  const now = new Date();
+  const easternNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
+  const target = new Date(easternNow);
+  target.setHours(hour, minute, 0, 0);
+  if (easternNow >= target) {
+    target.setDate(target.getDate() + 1);
+  }
+  const easternOffset = easternNow.getTime() - now.getTime();
+  const targetUtc = target.getTime() - easternOffset;
+  return targetUtc - now.getTime();
+}
+
 function msUntil2355Eastern(): number {
-  ... (17 lines)
+  return msUntilNextEastern(23, 55);
 }

-  const msUntilNext2AM = (): number => { ... 10 lines with hardcoded 4h offset ... };
+  const msUntilNext2AM = (): number => msUntilNextEastern(2, 0);

-  const msUntilNext9AM = (): number => { ... 10 lines with hardcoded 4h offset ... };
+  const msUntilNext9AM = (): number => msUntilNextEastern(9, 0);

-  const msUntilNext830AM = (): number => { ... 10 lines with hardcoded 4h offset ... };
+  const msUntilNext830AM = (): number => msUntilNextEastern(8, 30);
```

## Logic Gate — All 15 Cases [VERIFIED]

Test script: `/tmp/test-offset-fix.js` — standalone copy of `msUntilNextEastern`. Run with `TZ=UTC node`.

### SM Photo Sync (02:00 ET)

| Case | now | Fire UTC | Fire ET | Pass |
|------|-----|----------|---------|------|
| EST now 13:00 | 2026-11-03T18:00Z | 2026-11-04T**07:00**Z | 2:00 AM EST | ✅ |
| EDT now 13:00 | 2026-07-15T17:00Z | 2026-07-16T**06:00**Z | 2:00 AM EDT | ✅ |
| Just after fire EST | 2026-11-03T07:00:05Z | 2026-11-04T07:00Z | ~24h | ✅ |
| Fall-back (01:30 EST) | 2026-11-01T06:30Z | 2026-11-01T**07:00**Z | 2:00 AM EST | ✅ |
| Spring-forward (03:30 EDT) | 2027-03-14T07:30Z | 2027-03-15T**06:00**Z | 2:00 AM EDT | ✅ |

Before fix, EST case would have fired at 06:00 UTC = 1:00 AM EST (1h early). Now fires at 07:00 UTC = 2:00 AM EST ✅.

### Adoptable Alert (09:00 ET)

| Case | now | Fire UTC | Fire ET | Pass |
|------|-----|----------|---------|------|
| EST now 13:00 | 2026-11-03T18:00Z | 2026-11-04T**14:00**Z | 9:00 AM EST | ✅ |
| EDT now 13:00 | 2026-07-15T17:00Z | 2026-07-16T**13:00**Z | 9:00 AM EDT | ✅ |
| Just after fire EST | 2026-11-03T14:00:05Z | 2026-11-04T14:00Z | ~24h | ✅ |
| Fall-back (01:30 EST) | 2026-11-01T06:30Z | 2026-11-01T**14:00**Z | 9:00 AM EST | ✅ |
| Spring-forward (03:30 EDT) | 2027-03-14T07:30Z | 2027-03-14T**13:00**Z | 9:00 AM EDT | ✅ |

Before fix: EST would fire at 13:00 UTC = 8:00 AM EST (1h early). Now 14:00 UTC = 9:00 AM EST ✅.

### Generic Bio (08:30 ET)

| Case | now | Fire UTC | Fire ET | Pass |
|------|-----|----------|---------|------|
| EST now 13:00 | 2026-11-03T18:00Z | 2026-11-04T**13:30**Z | 8:30 AM EST | ✅ |
| EDT now 13:00 | 2026-07-15T17:00Z | 2026-07-16T**12:30**Z | 8:30 AM EDT | ✅ |
| Just after fire EST | 2026-11-03T13:30:05Z | 2026-11-04T13:30Z | ~24h | ✅ |
| Fall-back (01:30 EST) | 2026-11-01T06:30Z | 2026-11-01T**13:30**Z | 8:30 AM EST | ✅ |
| Spring-forward (03:30 EDT) | 2027-03-14T07:30Z | 2027-03-14T**12:30**Z | 8:30 AM EDT | ✅ |

Before fix: EST would fire at 12:30 UTC = 7:30 AM EST (1h early). Now 13:30 UTC = 8:30 AM EST ✅.

**All 15 cases: correct wall-clock target, no near-zero delays, no drift across DST.**

## Commit

```
37b5614 — Fix hardcoded EDT offset in SM-sync/adoptable/generic-bio schedulers:
          timezone-aware next-Eastern-time calc (fires correctly year-round)
```

Local only (no git remote for shelter-apps).

## Post-Restart Verification

| Check | Result |
|-------|--------|
| `systemctl is-active shelter-app` | **active** |
| `curl http://localhost:3000/api/health` | **HTTP 200** |
| systemd start time | **Nov 03 18:22:14 UTC** (from journalctl "Started shelter-app.service") |
| Immediate job fires | **0** |

### All Six Schedulers Registered (18:22:15 UTC)

| Scheduler | Delay | Target ET |
|-----------|-------|-----------|
| Feeding Cron | 10.63h | ~05:00 UTC = 00:00 EST ✅ |
| Auto-Close | 10.55h | ~04:55 UTC = 23:55 EST ✅ |
| **SM Photo Sync** | **12.63h** | ~07:00 UTC = **02:00 EST** ✅ |
| **Adoptable Alert** | **19.63h** | ~14:00 UTC = **09:00 EST** ✅ |
| **Generic Bio** | **19.13h** | ~13:30 UTC = **08:30 EST** ✅ |
| Searcher Snapshot | 10.80h | ~05:10 UTC = 00:10 EST ✅ |

### Delay Shift (confirms 1h correction)

| Scheduler | Before fix (18:13 UTC) | After fix (18:22 UTC) | Δ (adjusted for 9min gap) |
|-----------|----------------------|----------------------|---------------------------|
| SM Photo Sync | 11.78h | 12.63h | **+1.00h** ✅ |
| Adoptable Alert | 18.78h | 19.63h | **+1.00h** ✅ |
| Generic Bio | 18.28h | 19.13h | **+1.00h** ✅ |

All three now point ~1h later, confirming they target the correct EST wall-clock time instead of firing 1h early.
