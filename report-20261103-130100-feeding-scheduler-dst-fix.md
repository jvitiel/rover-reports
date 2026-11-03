# Feeding Scheduler DST Fix — 2026-11-03

**Commit:** c8f4252  
**File:** server/src/server.ts (scheduleMidnightFeedingJob, lines 12679–12696)

---

## Diff

```diff
 // Schedule the midnight feeding job
 function scheduleMidnightFeedingJob(): void {
-  const msUntilMidnight = msUntilMidnightEastern();
-  const hoursUntil = (msUntilMidnight / (1000 * 60 * 60)).toFixed(2);
-
-  console.log(`[Feeding Cron] Scheduling next run in ${hoursUntil} hours (midnight Eastern)`);
-
-  setTimeout(async () => {
-    try {
-      await runMidnightFeedingJob();
-    } catch (err) {
-      console.error('[Feeding Cron] Job failed:', err);
-    }
-
-    // Schedule next run (24 hours from now)
-    setInterval(async () => {
+  const scheduleNext = () => {
+    const delay = Math.max(msUntilMidnightEastern(), 60 * 1000);
+    const hoursUntil = (delay / (1000 * 60 * 60)).toFixed(2);
+    console.log(`[Feeding Cron] Scheduling next run in ${hoursUntil} hours (midnight Eastern)`);
+    setTimeout(async () => {
       try {
         await runMidnightFeedingJob();
       } catch (err) {
-        console.error('[Feeding Cron] Job failed:', err);
+        console.error('[Feeding Cron] job threw:', err);
       }
-    }, 24 * 60 * 60 * 1000);
-
-  }, msUntilMidnight);
+      scheduleNext();
+    }, delay);
+  };
+  scheduleNext();
 }
```

**Change:** Replaced `setTimeout` + `setInterval(24h)` with self-rescheduling `scheduleNext()` that calls `msUntilMidnightEastern()` before each run. Added `Math.max(..., 60_000)` floor to prevent tight-loop if `msUntilMidnightEastern()` returns near-zero (e.g., called at exactly midnight).

## Build

```
npm run build → exit 0 (tsc clean)
```

## Logic Gate — 4 DST Cases [VERIFIED]

Test script: `/tmp/test-midnight-dst.js` — standalone copy of `msUntilMidnightEastern` algorithm, driven with mocked `now`. Run with `TZ=UTC node`.

### (a) Just after midnight ET — no tight loop

| Field | Value |
|-------|-------|
| now (UTC) | 2026-11-03T05:00:05Z |
| now (ET) | Nov 3, 12:00:05 AM EST |
| raw delay | 86,395,000 ms (~24h) |
| floored delay | 86,395,000 ms (floor irrelevant) |
| fire UTC | 2026-11-04T05:00:00Z |
| fire ET | Nov 4, 12:00:00 AM EST |
| **PASS** | ✅ ~24h delay, well above 60s floor |

### (b) Just after fall-back — correct post-DST midnight

| Field | Value |
|-------|-------|
| now (UTC) | 2026-11-01T06:30:00Z |
| now (ET) | Nov 1, 1:30:00 AM EST |
| raw delay | 81,000,000 ms (~22.5h) |
| fire UTC | 2026-11-02T05:00:00Z |
| fire ET | Nov 2, 12:00:00 AM EST |
| **PASS** | ✅ Fires at midnight EST (05:00 UTC), NOT 23:00 EST |

### (c) Just after spring-forward — correct post-DST midnight

| Field | Value |
|-------|-------|
| now (UTC) | 2027-03-14T07:30:00Z |
| now (ET) | Mar 14, 3:30:00 AM EDT |
| raw delay | 73,800,000 ms (~20.5h) |
| fire UTC | 2027-03-15T04:00:00Z |
| fire ET | Mar 15, 12:00:00 AM EDT |
| **PASS** | ✅ Fires at midnight EDT (04:00 UTC), correctly shifted from EST's 05:00 UTC |

Note: 2027 spring-forward is March 14 (2nd Sunday of March), not March 8/9. Test adjusted accordingly.

### (d) 5 minutes before midnight — short delay

| Field | Value |
|-------|-------|
| now (UTC) | 2026-11-04T04:55:00Z |
| now (ET) | Nov 3, 11:55:00 PM EST |
| raw delay | 300,000 ms (5 min) |
| floored delay | 300,000 ms (above floor) |
| fire UTC | 2026-11-04T05:00:00Z |
| fire ET | Nov 4, 12:00:00 AM EST |
| **PASS** | ✅ ~5 min delay |

**All 4 cases resolve to midnight ET wall-clock. No DST drift.**

## Commit

```
c8f4252 — Fix feeding scheduler DST drift: re-chain setTimeout(msUntilMidnightEastern) with 60s floor, replacing setInterval(24h)
```

No git remote configured for shelter-apps — commit is local only.

## Post-Restart Verification

| Check | Result |
|-------|--------|
| `systemctl is-active shelter-app` | **active** |
| `curl http://localhost:3000/api/health` | **HTTP 200** |
| Scheduler registration log | `[Feeding Cron] Scheduling next run in 11.00 hours (midnight Eastern)` |
| Immediate runaway check | **0 occurrences** of "Starting midnight feeding roster job" in last 2 min — no immediate fire |

The scheduler correctly calculated ~11 hours until midnight EST from ~13:00 ET. No runaway.

## Remaining Notes

- **5 other schedulers** (Activity Auto-Close, SM Photo Sync, Adoptable Alert, Generic Bio, Searcher Snapshot) still use the `setTimeout + setInterval(24h)` pattern. Of these, only Searcher Snapshot (00:10 ET target) crosses a date boundary post-DST. The others drift 1h but don't break date logic. These can be patched in a follow-up.
- The `msUntilMidnightEastern()` function was not modified (per instructions).
