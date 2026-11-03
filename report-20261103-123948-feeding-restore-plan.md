# Feeding Roster Restore Plan — Safety Analysis

**Date:** 2026-11-03  
**Context:** Nov 3 feeding roster missing due to DST drift (diagnosed in previous report)

---

## 1. Manual Trigger Endpoint

**Exists: `POST /api/feeding/run-cron`** — server.ts:13860–13868

```typescript
app.post('/api/feeding/run-cron', async (req: Request, res: Response) => {
  console.log('[Feeding Cron] Manual trigger via API');
  const result = await runMidnightFeedingJob();
  res.json({ success: true, data: result });
});
```

- **No auth middleware** on this route (same as other admin endpoints — relies on Caddy not exposing to public).
- Calls `runMidnightFeedingJob()` directly — identical behavior to the scheduled midnight run.
- Returns `{ success, data: { created: { dog, cat, small }, archived } }`.

There is no separate "Generate Report" button in staff-pwa for rebuilding the roster — the staff-pwa feeding module only has read + update endpoints. The `/api/feeding/run-cron` endpoint is the only manual trigger.

## 2. runMidnightFeedingJob Safety If Run Mid-Day

### (a) Date targeting — SAFE ✅

server.ts:12188–12189:
```typescript
const now = new Date();
const easternDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
```

At ~13:00 ET on Nov 3, `easternDate` resolves to `"2026-11-03"`. **Correct.**

### (b) Insert idempotency — SAFE ✅

localDatabase.ts:3280–3283:
```sql
INSERT OR IGNORE INTO daily_feeding (id, date, species, location, name, shelter_code, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

Dedup key: `UNIQUE INDEX idx_feeding_date_code ON daily_feeding(date, shelter_code)` — localDatabase.ts:594.

This means:
- **New rows for 2026-11-03:** INSERT succeeds (no prior rows for this date). ✅
- **Existing Nov 1 rows:** Not touched — different date. ✅
- **Existing Nov 2 rows:** Not touched — different date. ✅
- **If run twice for same date:** Second run inserts 0 rows (all ignored). ✅

The INSERT only writes blank rows (no food/water/caregiver data). It cannot overwrite any existing feeding logs.

### (c) Archive step — SAFE ✅

server.ts:12232–12244:
```typescript
const dates = getDailyFeedingDates(); // sorted oldest first
if (dates.length > 2) {
  const datesToArchive = dates.slice(0, dates.length - 2);
  for (const oldDate of datesToArchive) {
    const archived = archiveFeedingDate(oldDate);
  }
}
```

`getDailyFeedingDates()` returns distinct dates sorted ASC — localDatabase.ts:3289–3293.

**Current state of daily_feeding:**
- Nov 1 (188 rows, with feeding data logged by staff)
- Nov 2 (196 rows, with feeding data logged by staff)

**After running now (Nov 3 rows created):**
- Nov 1 (188 rows)
- Nov 2 (196 rows)  
- Nov 3 (new rows)

`dates.length` = 3, which is > 2, so `datesToArchive = dates.slice(0, 1)` = `["2026-11-01"]`.

**Result:** Nov 1 gets archived (moved to `feeding_archive` with all food/water/caregiver data preserved, then deleted from `daily_feeding`). Nov 2 and Nov 3 remain in `daily_feeding`. **This is the intended behavior.**

`archiveFeedingDate()` — localDatabase.ts:3317–3358:
- Reads all columns from `daily_feeding WHERE date = ?`
- INSERTs each row into `feeding_archive` with all 22 columns (including voice notes, photos, clean, disin)
- DELETEs from `daily_feeding WHERE date = ?`
- All within a single transaction

**No data loss.** All Nov 1 feeding logs (food, water, caregiver, voice notes, photos, clean/disin) are fully preserved in `feeding_archive`.

### [VERIFIED] Safe to run `runMidnightFeedingJob()` now at ~13:00 ET.

Evidence:
- INSERT OR IGNORE with UNIQUE(date, shelter_code) — localDatabase.ts:3280+594 — idempotent, cannot overwrite existing data
- Archive keeps 2 most recent dates — server.ts:12232–12244 — Nov 1 archives (with full data), Nov 2 + Nov 3 stay
- Date resolves to Eastern time — server.ts:12188–12189 — correct for mid-day run
- No DELETE/TRUNCATE/wipe of existing rows except the date-targeted archive move

### Side effects of mid-day run (non-destructive):
- **Step 6** (server.ts:12249): Archives activity rows older than 7 days — routine cleanup, safe
- **Step 7** (server.ts:12253): Generates wellbeing alerts for yesterday (Nov 2) — may generate alerts if Nov 2 had missing feedings; `wellbeingAlertsExistForDate()` prevents duplicates if already run

## 3. Startup Catch-Up Behavior

**No catch-up logic exists.** [VERIFIED]

`scheduleMidnightFeedingJob()` (server.ts:12679–12701) only does:
1. Calculate `msUntilMidnightEastern()` 
2. `setTimeout` for that delay
3. Inside the timeout: run job, then `setInterval(24h)`

There is no "is today's roster missing? build it now" check at startup or anywhere in the scheduling function.

**A plain `systemctl restart shelter-app` would:**
- Recalculate `msUntilMidnightEastern()` correctly (fixing the DST drift for future runs)
- Schedule next run for midnight EST tonight (~11h from 13:00 ET)
- **NOT build the Nov 3 roster** — staff would see empty feeding pages until midnight

**Conclusion:** Restart alone fixes future timing but does NOT create today's missing roster. The manual trigger (`POST /api/feeding/run-cron` or direct `runMidnightFeedingJob()` call) is needed to populate Nov 3.

## 4. Other Pattern A (setTimeout + setInterval 24h) Jobs

All use identical pattern: initial setTimeout to target time, then setInterval(24 * 60 * 60 * 1000).

| Job | Target Time (ET) | Anchor (UTC pre-DST) | Anchor (UTC post-DST) | Drifted? | Date-sensitive? | file:line |
|-----|-------------------|----------------------|----------------------|----------|-----------------|-----------|
| **Midnight Feeding** | 00:00 ET | 04:00 UTC | 04:00 UTC = 23:00 EST ❌ | **Yes, -1h** | **YES — creates wrong date** | server.ts:12679–12701 |
| **Activity Auto-Close** | 23:55 ET | 03:55 UTC | 03:55 UTC = 22:55 EST | **Yes, -1h** | Moderate — closes sessions 1h early, but no date-keyed logic | server.ts:12412–12432 |
| **SM Photo Sync** | 02:00 ET | 06:00 UTC | 06:00 UTC = 01:00 EST | **Yes, -1h** | Low — photo sync is date-agnostic | server.ts:12652–12677 |
| **Adoptable Alert** | 09:00 ET | 13:00 UTC | 13:00 UTC = 08:00 EST | **Yes, -1h** | Low — runs daily check, 1h early is harmless | server.ts:12815–12844 |
| **Generic Bio** | 08:30 ET | 12:30 UTC | 12:30 UTC = 07:30 EST | **Yes, -1h** | Low — bio generation, no date boundary | server.ts:13260–13288 |
| **Searcher Snapshot** | 00:10 ET | 04:10 UTC | 04:10 UTC = 23:10 EST ❌ | **Yes, -1h** | **YES — snapshots "yesterday" but now runs at 23:10, still "today"** | server.ts:13290–13315 |
| **DogWalker Cache** | every 2min | N/A | N/A | No | No — short interval | server.ts:6868 |

**Critical impact:** Only the **Midnight Feeding** (date-boundary, creates roster for wrong day) and potentially **Searcher Snapshot** (00:10 target, now fires at 23:10 previous day — may snapshot wrong "yesterday"). The others drift 1h but don't cross a date boundary from their target time.

## Summary

| Question | Answer |
|----------|--------|
| Manual trigger exists? | **Yes** — `POST /api/feeding/run-cron` (server.ts:13860), no auth |
| Safe to run mid-day? | **[VERIFIED] Yes** — INSERT OR IGNORE (localDatabase.ts:3280), archive keeps 2 most recent (server.ts:12232) |
| Restart builds today's roster? | **No** — only schedules next midnight, no catch-up |
| Other affected jobs? | 6 total use Pattern A; Searcher Snapshot (00:10 ET) also crosses date boundary post-DST |
