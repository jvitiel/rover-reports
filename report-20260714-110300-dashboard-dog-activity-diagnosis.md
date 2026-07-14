# Dashboard Dog Activity — Zero Rows Today: Diagnosis

**Date:** 2026-07-14 11:03 ET (read-only diagnosis)

---

## Bottom Line

The dashboard dog-activity table reads **SQLite `daily_activities`** — NOT the Google Sheets. The Google Sheets 1000-row limit is a real but unrelated problem. The dashboard shows zero dog activity for today because `daily_activities` rows are only written at **session END** (check-in), and as of 11:03 AM ET, no dog sessions have been completed today — all 5 are still active (checked out). This is not a bug; it's a design gap where in-progress sessions are invisible to the dashboard's activities table. [VERIFIED]

---

## 1. Staff App Data Source

The staff app calls `/api/staff/available/dogs` (server.ts line 7480), which calls `getTodayActivityStatsFromDb('dog')` (localDatabase.ts line 4122). This function reads **two** SQLite sources:

- `daily_activities WHERE date = ? AND species = ?` → completed session counts
- `active_sessions WHERE species = ?` → currently-active flag

The staff app shows dogs as "Active" because it cross-references `active_sessions`. [VERIFIED with code]

**Today's active dog sessions (5 rows in `active_sessions`):**
```
S2025310 Jax       - Staff    - checked out 10:48 AM  - Dog Kennel
A2024048 Leo(Petey)- Staff    - checked out 10:43 AM  - Dog Kennel
A2024053 Nanook    - Staff    - checked out 10:43 AM  - Dog Kennel::16
S2025131 Scottie   - Holland  - checked out 08:17 AM  - Shelter
+ 1 more (count changed during diagnosis)
```
[VERIFIED via SELECT on active_sessions at 15:02 UTC]

## 2. Dashboard Dog-Activity Table Data Source

The dashboard calls `/api/dashboard/activities/dog` (server.ts line 1652). This endpoint reads **only** from SQLite:

```typescript
const rows = database.prepare(`
  SELECT * FROM daily_activities 
  WHERE species = ? 
  ORDER BY date DESC, created_at DESC
`).all(species);
```

**It reads SQLite `daily_activities`. It does NOT read Google Sheets.** [VERIFIED with code at server.ts lines 1663-1672]

**It does NOT cross-reference `active_sessions`.** In-progress sessions are invisible to this endpoint. [VERIFIED with code]

## 3. Why Zero Dog Rows Today

The `daily_activities` table is populated by `insertDailyActivityRow()`, which is called in exactly one place for the current session flow: **`closeActiveSession()`** (server.ts line 8165) — i.e., at session END, not session START.

The current staff app's primary session-start path calls `/api/sessions/start` (server.ts line 7955), which creates an `active_sessions` row but does **NOT** call `insertDailyActivityRow()`. [VERIFIED with code — the endpoint calls only `createActiveSession()`, lines 7996-8003]

**Timeline for today (2026-07-14):**
| Species | Completed sessions | Active sessions | `daily_activities` rows |
|---------|-------------------|-----------------|------------------------|
| cat | 52 | 4 | 52 ✅ |
| dog | 0 | 5 | 0 ← this is the "missing" data |
| small | 0 | 0 | 0 |

All 52 cat `daily_activities` rows have `in_time` populated — confirming they were created at session END. [VERIFIED via SELECT: `SUM(CASE WHEN in_time IS NOT NULL ... THEN 1) = 52`]

Dogs simply haven't completed any sessions yet today (11 AM ET). When a dog session ends, the row will appear. [VERIFIED]

## 4. Dog-Only or All Species?

**It's not dog-specific.** Small animals also show zero for today (no completed sessions). Cats show 52 because cats have faster turnover (more sessions completed by 11 AM). The dashboard endpoint returns the same date breakdown:

```
Dog:   2026-07-13: 70 rows | 2026-07-14: 0 rows
Cat:   2026-07-14: 52 rows | 2026-07-13: 112 rows
Small: 2026-07-12: 12 rows | 2026-07-14: 0 rows
```
[VERIFIED via curl to /api/dashboard/activities/{species}]

## 5. Google Sheets Status (Separate Issue)

The Google Sheets 1000-row limit problem is real but **does not affect the dashboard**:

- `closeActiveSession()` writes to Google Sheets (dual-write at line 8204+) as a compatibility layer
- The sheet write failing silently doesn't matter for the dashboard — it reads SQLite only
- The Sheets issue affects only the Google Sheets tab itself (anyone reading the Sheet directly)

## 6. Root Cause & Verdict

**Answer: Neither (A) the dead Google Sheet, nor (B) a SQLite query/timezone/join bug.**

The dashboard dog-activity table correctly reads SQLite `daily_activities`. The table correctly shows zero rows for today because zero dog sessions have been completed (checked back in) today. The design gap is that the dashboard has no visibility into in-progress sessions — it can only show completed activities.

### Design Gap Summary

| Component | Reads `daily_activities` | Reads `active_sessions` | Shows in-progress? |
|-----------|------------------------|-----------------------|-------------------|
| Staff app (available dogs list) | ✅ for counts | ✅ for "Active" flag | **Yes** |
| Dashboard (Dog Activities table) | ✅ | ❌ | **No** |

The old session-start endpoints (`/api/volunteer/session/start`, `/api/staff/session/start`) wrote to `daily_activities` at session START (creating a row with empty `in_time`). The new shared endpoint (`/api/sessions/start`) only writes to `active_sessions`. The staff app switched to the new endpoint (staff-pwa/app.js line 652) but the dashboard was never updated to also query `active_sessions`. [VERIFIED with code]

### If John Wants In-Progress Dogs Visible on the Dashboard

This requires either:
1. The dashboard endpoint to also query `active_sessions` and merge results, or
2. The `/api/sessions/start` endpoint to also insert a `daily_activities` row at session START (like the old endpoints did), or
3. A separate "Active Now" panel on the dashboard

This is an implementation decision, not a diagnosis item.
