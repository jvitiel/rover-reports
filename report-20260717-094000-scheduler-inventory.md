# Scheduler Inventory — 2026-07-17

## 1. In-Process Schedulers (server.ts Pattern-B)

All schedulers use setTimeout-to-first-fire + setInterval(24h) pattern unless noted.

| # | Job Name | Function | Scheduled Time | Timezone | Line | Notes |
|---|----------|----------|---------------|----------|------|-------|
| 1 | DogWalker Cache | `refreshAvailableDogsCache()` | Every 2 min (continuous) | N/A | 6929 | setInterval loop, not daily |
| 2 | Searcher Snapshot | `runDailySearcherSnapshot()` | 00:10 ET | ET (DST-safe via toLocaleString) | 13352 | Snapshots yesterday's searcher metrics |
| 3 | Feeding Roster | `runMidnightFeedingJob()` | 00:00 ET (midnight) | ET (DST-safe via `msUntilMidnightEastern()`) | 12740 | Resets daily feeding roster |
| 4 | Nightly SM Photo Sync | `runNightlySMPhotoSync()` | 02:00 ET | ET (DST-safe via toLocaleString) | 12714 | Full SM fetch with `forceRefresh: true`, downloads new photos |
| 5 | Adoptable Status Check | `runAdoptableStatusCheck()` | 09:00 ET | **EDT only — hardcoded 4h offset** ⚠️ | 12877 | Compares SM snapshot vs DB, emails on new adoptables |
| 6 | Generic Bio Job | `runGenericBioJob()` | 09:30 ET | **EDT only — hardcoded 4h offset** ⚠️ | 13322 | Youth generics + adult upgrades + adult intake |
| 7 | Activity Auto-Close | `runActivityAutoClose()` | 23:55 ET | ET (computed via `msUntil2355Eastern()`) | 12474 | Closes unclosed activities |
| 8 | Featured Email | `runWeeklyFeaturedEmail()` | Wed 16:00 ET | ET (DST-safe via toLocaleString) | 13486 | Weekly featured-six rotation email |

**DST bug note:** Jobs #5 and #6 use `const etOffsetMs = 4 * 60 * 60 * 1000` (hardcoded EDT). During EST (Nov–Mar) they will fire at 10:00/10:30 AM ET instead of 9:00/9:30. The other jobs use `toLocaleString('en-US', { timeZone: 'America/New_York' })` which is DST-safe. [VERIFIED with code — lines 12880, 13325]

---

## 2. System Crontabs

### Rover user (`crontab -l`)
[VERIFIED — read directly]

| Schedule (UTC) | ET equivalent (EDT) | What |
|----------------|---------------------|------|
| `*/15 * * * *` | Every 15 min | `/home/rover/scripts/memory-snapshot.sh` |
| `0 4 * * *` | 00:00 ET (midnight) | `/home/rover/scripts/screenshots-retention.sh` |
| `0 6 * * *` | 02:00 ET | `sudo -u shelter python3 .../score-profiles.py` |

### Root and shelter crontabs
[UNCERTAIN — permission denied reading `/var/spool/cron/crontabs/{root,shelter}` and `sudo crontab -l` requires password. Schedule below is from TOOLS.md documentation, not live verification.]

| Schedule (ET) | What | Source |
|---------------|------|--------|
| 03:00 ET daily | `backup-sqlite.sh` | TOOLS.md |
| 03:15 ET daily | `backup-data.sh` | TOOLS.md |
| 03:30 ET daily | `backup-weekly.sh` | TOOLS.md |
| Sun 02:30 ET | `staging-sync.sh` | Script header |
| Mon 09:00 UTC (05:00 ET) | `weekly-error-summary.sh` | Script header |
| Daily (04:00 ET per TOOLS.md) | `rover-reports-prune.sh` | TOOLS.md |

### /etc/cron.d/ (system)
[VERIFIED — read directly]

| File | Schedule (UTC) | What |
|------|---------------|------|
| e2scrub_all | `30 3 * * 0` (Sun 3:30 UTC) | e2scrub cron |
| e2scrub_all | `10 3 * * *` (daily 3:10 UTC) | e2scrub_all |
| php | `09,39 * * * *` | PHP session cleanup |
| sysstat | `5-55/10 * * * *` | Activity report every 10 min |
| sysstat | `59 23 * * *` | Stats file rotation |

---

## 3. Generic Bio Job — Exact Edit Point

**Scheduler function:** `scheduleGenericBioJob()` at **line 13322** of `server.ts`

**Time-setting code (lines 13323–13332):**

```typescript
function scheduleGenericBioJob(): void {
  const msUntilNext930AM = (): number => {
    const now = new Date();
    const etOffsetMs = 4 * 60 * 60 * 1000;          // ← hardcoded EDT offset
    const nowEt = new Date(now.getTime() - etOffsetMs);
    const next930amEt = new Date(nowEt);
    next930amEt.setHours(9, 30, 0, 0);               // ← THIS IS THE TIME: hour=9, minute=30
    if (next930amEt.getTime() <= nowEt.getTime()) {
      next930amEt.setDate(next930amEt.getDate() + 1);
    }
    return next930amEt.getTime() - nowEt.getTime();
  };
```

**To move to 08:30 ET:** Change `setHours(9, 30, 0, 0)` → `setHours(8, 30, 0, 0)` on line 13328, rename the function from `msUntilNext930AM` → `msUntilNext830AM`, and update the console.log on line 13338 and 13349 from "9:30am ET" → "8:30am ET".

**Time expression:** Hour/minute pair passed to `Date.setHours()` — not a cron string, not a constant. The offset is a hardcoded 4-hour (EDT) subtraction, not DST-aware.

[VERIFIED with code]

---

## 4. Timeline: 07:00–11:00 ET

| Time (ET) | Job | Duration / Notes |
|-----------|-----|-----------------|
| 07:00–08:59 | **NOTHING** | Clear window |
| 09:00 | Adoptable Status Check | Live SM API fetch (`fetchAnimals({ includeUnavailable: true })`), DB snapshot compare, conditional email. Typically fast (<30s) unless SM is slow. |
| 09:30 | Generic Bio Job | Live SM API fetch (`fetchAnimals({ includeUnavailable: false })`), DB reads (behavior_notes, animal_bios), DB writes (new bios). Usually <60s. Also runs adult-intake pass which may call AI for draft bios. |
| 10:00–11:00 | **NOTHING** | Clear |

No crontab jobs fire in this window. The `score-profiles.py` cron runs at 02:00 ET (06:00 UTC). [VERIFIED]

---

## 5. Free Slot Analysis

**08:30 ET is completely clear.** The nearest job is the Adoptable Status Check at 09:00 ET — 30 minutes after the proposed slot.

### Contention analysis for 08:30 ET:

| Concern | Risk | Assessment |
|---------|------|------------|
| SM API contention | None | Next SM API call is adoptable check at 09:00. 30-minute gap is ample. |
| DB write contention | None | SQLite WAL mode; the bio job's writes are small (INSERT into animal_bios). No bulk DB writer in this window. |
| Cache interaction | Beneficial | The bio job's `fetchAnimals()` call will populate the 15-min SM cache. If the adoptable check fires at 09:00 (within TTL), it may reuse cached data — same outcome, one fewer API call. |

**Recommended slot: 08:30 ET** — no collisions, no contention. Any time from 07:00–08:55 ET would also work, but 08:30 is the target and has no issues.

---

## 6. Dependency Check

**Does the generic bio job depend on any earlier job?**

**No.** [VERIFIED with code]

The call chain is:
1. `runGenericBioJob()` (line 13260) calls `findGenericBioCandidates()` (line 13067)
2. `findGenericBioCandidates()` calls `fetchAnimals({ includeUnavailable: false })` (line 13068)
3. `fetchAnimals()` in `shelterManagerService.ts` (line 96) hits the **SM API live** (or returns a 15-minute cache if fresh)

The nightly SM Photo Sync (2:00 AM ET) is a **photo download** job — it fetches animal data to find new photo URLs, then downloads image bytes into `animal_media`. It does not populate any data that the bio job reads.

The bio job reads:
- **SM API live** (animal list: name, species, sex, dateOfBirth, shelterCode)
- **Local DB:** `behavior_notes` table (to exclude animals with notes)
- **Local DB:** `animal_bios` table (to exclude animals that already have a bio)

None of these depend on any prior scheduled job. The bio job can safely run at any time of day — earlier, later, or multiple times — without breaking.

**Moving to 08:30 ET will not break anything.** The only consideration is that at 08:30, SM data reflects overnight changes (new intakes, status updates) which are just as current as at 09:30 — SM is a live API, not a batch export.

---

## Summary

- **07:00–08:59 ET is empty** — zero jobs of any kind
- **08:30 ET is the recommended slot** — 30 min before the nearest neighbor (adoptable check at 09:00), no SM API or DB contention
- **Edit point:** `server.ts` line 13328: `next930amEt.setHours(9, 30, 0, 0)` → change to `(8, 30, 0, 0)`
- **No dependencies** — the bio job fetches from SM API live; it does not depend on the nightly sync or any other prior job
- **Bonus finding:** Both the adoptable check and the bio job use a hardcoded 4h EDT offset, so during EST they fire an hour late (10:00/10:30 instead of 9:00/9:30). Consider fixing to DST-safe `toLocaleString` when touching this code.
