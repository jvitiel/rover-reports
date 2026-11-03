# Dog Feeding Empty — DST / Midnight Job Diagnosis

**Date:** 2026-11-03  
**Symptom:** Staff App "Dog Feeding" page shows "No dogs found" (empty state) since ~12:30 ET  

---

## 1. Endpoint + Live Response

**Staff-pwa fetch:** `${API_BASE}/staff/feeding/${species}` (app.js:1581–1582)  
**Server route:** `GET /api/staff/feeding/:species` (server.ts:8647)

Live curl results (2026-11-03 ~17:30 UTC):

| Endpoint | HTTP Status | `success` | Count |
|----------|------------|-----------|-------|
| `/api/staff/feeding/dog` | 200 | true | **0** |
| `/api/staff/feeding/cat` | 200 | true | **0** |
| `/api/staff/feeding/small` | 200 | true | **0** |

**All three species return empty arrays.** This is a system-wide feeding outage, not dog-specific. The "No dogs found" message is rendered by `renderFeedingList()` at app.js:1603 when `feedingData.length === 0`.

## 2. Server Handler + Query

**Route:** server.ts:8647–8716  
**Date calculation:** `now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })` → today's Eastern date (server.ts:8662)  
**Query:** `getDailyFeedingBySpecies(easternDate, species)` → localDatabase.ts:3368  
**SQL:** `SELECT * FROM daily_feeding WHERE date = ? AND species = ? ORDER BY location, name` (localDatabase.ts:3369–3370)

No status/adoptable filter — it returns all `daily_feeding` rows matching today's date + species. If no rows exist for today, the result is empty. **The handler is correct; the problem is upstream — no rows were created for 2026-11-03.**

## 3. Roster Data

### daily_feeding table (active roster)

| Date | Dog | Cat | Small | Total |
|------|-----|-----|-------|-------|
| 2026-11-02 | 46 | 136 | 14 | 196 |
| 2026-11-01 | 47 | 127 | 14 | 188 |
| **2026-11-03** | **—** | **—** | **—** | **0 (no rows)** |

**No roster exists for 2026-11-03.** The midnight feeding job never created it.

### feeding_archive (archived older dates)

| Date | Dog | Cat | Small |
|------|-----|-----|-------|
| 2026-10-31 | 46 | 125 | 13 |

Oct 31 was properly archived when Nov 2 roster was created.

### animal_metadata (underlying animal population)

| Species | Count |
|---------|-------|
| Dog | 246 |
| Cat | 1,289 |
| Rabbit | 35 |
| Guinea Pig | 10 |
| (others) | 7 |
| **Total** | **1,589** |

Animals exist. The data is populated. The problem is exclusively the missing daily_feeding rows for Nov 3.

## 4. Midnight Feeding Job — DST Analysis

### Scheduling Mechanism

**Pattern:** setTimeout-to-midnight + setInterval(24h) — **DST-vulnerable (Pattern A)**  
**File:** server.ts:12678–12701

```
scheduleMidnightFeedingJob() {
  setTimeout(async () => {
    await runMidnightFeedingJob();
    setInterval(async () => { await runMidnightFeedingJob(); }, 24 * 60 * 60 * 1000);
  }, msUntilMidnightEastern());
}
```

`msUntilMidnightEastern()` (server.ts:12434–12449) correctly calculates delay to next midnight ET — **but only for the initial setTimeout**. The subsequent `setInterval(24h)` fires every 86,400,000ms regardless of DST changes.

### Process Start

Last shelter-app restart: **Oct 22, 2026 21:34:32 UTC**  
Initial setTimeout targeted midnight EDT (04:00 UTC Oct 23). setInterval locked to 04:00 UTC thereafter.

### Fire Times (journalctl evidence)

| Fire Time (UTC) | ET Equivalent | Date Created | Dogs | Cats | Small | Status |
|-----------------|---------------|--------------|------|------|-------|--------|
| Oct 31 04:00:06 | Oct 31 00:00 EDT | 2026-10-31 | 46 | 125 | 13 | ✅ Correct |
| Nov 01 04:00:06 | Nov 01 00:00 EDT | 2026-11-01 | 46 | 127 | 13 | ✅ Correct |
| Nov 02 04:00:06 | **Nov 01 23:00 EST** | **2026-11-01** | 1 | 0 | 1 | ❌ **Wrong date** |
| Nov 03 04:00:06 | **Nov 02 23:00 EST** | **2026-11-02** | 46 | 136 | 14 | ❌ **Wrong date** |

### DST Change Event

- **Nov 1, 2026 02:00 EDT → 01:00 EST** (fall back, UTC offset EDT -4 → EST -5)
- Before DST: 04:00 UTC = 00:00 EDT ✅
- After DST: 04:00 UTC = 23:00 EST ❌ (previous day)

### Cascade of Failures

1. **Nov 2 04:00 UTC (23:00 EST Nov 1):** `toLocaleDateString('en-CA', { timeZone: 'America/New_York' })` returns `2026-11-01`. Rows for Nov 1 already existed (created correctly the night before). `INSERT OR IGNORE` silently skipped duplicates. Only 2 new animals inserted. **Nov 2's roster was never created.**

2. **Nov 3 04:00 UTC (23:00 EST Nov 2):** Date resolves to `2026-11-02`. This created 196 rows for Nov 2 — **a day late**. The archive step ran on Oct 31 (correct, keeping 2 most recent). **Nov 3's roster was never created.**

3. **Going forward:** Every night at 04:00 UTC, the job will create tomorrow's roster dated as today's. The roster for the *actual* current day will never be created until the next shelter-app restart (which re-calculates the initial setTimeout).

### Secondary Damage (Nov 2)

Nov 2 had a minimal roster (2 rows instead of ~196). Staff attempting to log feedings got errors:
```
[Staff] Feeding update failed: no row found for W2026143 on 2026-11-02
[Staff] Feeding update failed: no row found for S2026766 on 2026-11-02
```
(10+ such errors between 13:35–14:04 UTC on Nov 2.)

## 5. Recent Changes

- **No feeding-related commits** in the last 2 weeks (git log empty for server.ts, localDatabase.ts, staff-pwa/ since Oct 20).
- **No feeding errors in journalctl** other than the "no row found" errors on Nov 2 caused by the missing roster.
- The last shelter-app restart was **Oct 22, 2026** — well before DST, no code changes involved.

## Root Cause Verdict

**[VERIFIED] The midnight feeding job uses setTimeout + setInterval(24h) (server.ts:12688–12700), which is DST-vulnerable. After the Nov 1 fall-back, the job fires at 04:00 UTC = 23:00 EST (previous calendar day) instead of 05:00 UTC = 00:00 EST. The date calculation inside `runMidnightFeedingJob()` correctly resolves to Eastern time, but that Eastern time is now 23:00 on the previous day, so it creates/overwrites yesterday's roster instead of today's. Nov 3's roster was never created. All species affected (dogs, cats, smalls).**

Evidence:
- journalctl timestamps: all 4 nights fired at exactly 04:00 UTC; post-DST that's 23:00 EST
- Log lines: "Creating roster for date: 2026-11-01" on the Nov 2 run, "2026-11-02" on the Nov 3 run — each one day behind
- daily_feeding table: no rows for 2026-11-03; Nov 2 rows created late (by the Nov 3 04:00 UTC run)
- INSERT OR IGNORE: duplicate dates silently dropped, masking the date-targeting error

### Fix Direction (not implemented — read-only diagnosis)

Replace `setInterval(24h)` with re-scheduling via `setTimeout(msUntilMidnightEastern())` after each run. This recalculates the UTC target each night, correctly handling DST transitions. The `msUntilMidnightEastern()` function already exists and does the right calculation — it just needs to be called for every subsequent run, not only the first.

Immediate mitigation: restarting shelter-app would recalculate the initial setTimeout and fix timing until the next DST change (spring forward, Mar 8 2027).
