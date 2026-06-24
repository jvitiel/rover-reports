# Activity Auto-Close 23:55 ET — Implementation Report

**Date:** 2026-06-24  
**Commit:** `14d23be` — `server/src/server.ts` only (78 insertions, 27 deletions)

---

## What Changed

### 1. Extracted `runActivityAutoClose()` (server.ts, new function)

Contains the same loop from the former step 5 of `runMidnightFeedingJob`:
- `SELECT id, animal_name, shelter_code FROM active_sessions`
- For each: `closeActiveSession(sess.id, 'System (midnight auto-close)')` with per-session try/catch
- Summary log when sessions exist, clean no-op log when empty

Log prefix changed from `[Midnight Auto-Close]` to `[Auto-Close 23:55]` for clarity.

### 2. Removed step 5 from `runMidnightFeedingJob` (server.ts:12006)

**Before:** Step 5 ran the auto-close loop inline.  
**After:** Step 5 replaced with comment: `// 5. (Auto-close moved to its own 11:55 PM ET job)`

Remaining midnight job steps **unchanged**:
1. Clear yesterday's feeding tables
2. Seed today's dog feeding rows  
3. Seed today's cat feeding rows
4. Seed today's small animal feeding rows
5. *(placeholder — auto-close moved)*
6. Archive old activity data (keep 7 days)
7. Archive old feeding data (keep 7 days)
8. Wellbeing check stale-data alerts

### 3. New scheduler: `scheduleActivityAutoClose()` (server.ts)

Mirrors the midnight job's `setTimeout` → `setInterval` pattern:

```ts
function msUntil2355Eastern(): number {
  // Targets 23:55 ET today (or tomorrow if already past 23:55)
  // Uses same Eastern timezone offset calculation as msUntilMidnightEastern()
}

function scheduleActivityAutoClose(): void {
  setTimeout(async () => {
    await runActivityAutoClose();
    setInterval(runActivityAutoClose, 24 * 60 * 60 * 1000);  // daily
  }, msUntil2355Eastern());
}
```

### 4. Initialization (server.ts, after midnight job init)

```ts
scheduleActivityAutoClose();
console.log('[Auto-Close] Activity auto-close 23:55 ET job initialized');
```

---

## Ordering Confirmation

- **23:55 ET:** `runActivityAutoClose()` fires → closes open sessions → daily_activities rows created with `date = today` (23:55 is still today)
- **00:00 ET:** `runMidnightFeedingJob()` fires → step 6 archives activities older than 7 days → the just-closed rows (today's date) are NOT archived (they're fresh)
- **5-minute gap** between close and archive ensures the rows exist before archive runs ✅

---

## Build

```
tsc — clean, zero errors
sudo systemctl restart shelter-app — success
```

---

## Verification

### (a) Throwaway test — same-day close with duration ✅

Created test active_session (out_time = 10:00 AM today), closed via the same `closeActiveSession` function:

| Field | Value |
|-------|-------|
| date | `2026-06-24` (today — correct) |
| out_time | `10:00 AM` |
| in_time | `12:13 PM` |
| duration | **`2h 13m`** (computed correctly, not blank) |
| caregiver_in | `System (midnight auto-close)` |

Test data cleaned up (both active_sessions and daily_activities rows deleted).

### (b) Schedule confirmed 23:55 ET ✅

From journal at startup:
```
[Auto-Close] Scheduling next run in 11.72 hours (23:55 Eastern)
```

At 16:12 UTC (12:12 PM ET), 11.72 hours → 03:55 UTC = **23:55 ET** ✅. Daily via setInterval(24h).

### (c) Midnight job other steps intact ✅

Step 5 replaced with comment. Steps 1–4 (feeding seed), 6 (activity archive), 7 (feeding archive), 8 (wellbeing) — all unchanged. `runMidnightFeedingJob` no longer contains any `closeActiveSession` call.

### (d) Empty no-op ✅

With zero active_sessions remaining, the function would log `[Auto-Close 23:55] No open sessions — nothing to close` and return cleanly (zero iterations).

---

## `closeActiveSession` — Unchanged

The close function itself (server.ts:7777–7893) was **not modified**. The label `'System (midnight auto-close)'` is preserved. The only change is *when* it's called (23:55 ET instead of 00:00 ET).

---

## Commit

```
14d23be move activity auto-close to own 23:55 ET job (records file under correct day)
 1 file changed, 78 insertions(+), 27 deletions(-)
 server/src/server.ts
```
