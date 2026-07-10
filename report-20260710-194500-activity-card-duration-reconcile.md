# Activity Card Duration Reconciliation

**Date:** 2026-07-10 19:45 ET  
**Requested by:** John  
**Scope:** Read-only — resolve contradiction between staff-app cards showing 180–500 "hours" vs `created_at` timestamps from today  

---

## 1. What the Card Actually Shows

**Verdict: the timer format is `minutes:seconds`, not `hours:minutes`.** There is no rollover to hours.

### Render code (app.js line 1176–1180):

```javascript
function renderSessionCard(session, isOther, species) {
  const outTime = new Date(session.created_at || session.startTime).getTime();
  const elapsed = Math.floor((Date.now() - outTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
```

### Live-update code (app.js line 1399–1401):

```javascript
function updateServerSessionTimer(sessionId, outTime) {
  const timerEl = document.getElementById(`timer-server-${sessionId}`);
  if (!timerEl) return;
  const elapsed = Math.floor((Date.now() - new Date(outTime).getTime()) / 1000);
  timerEl.textContent = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;
}
```

### Timer binding (app.js line 1165):

```javascript
sessionTimers[timerId] = setInterval(() => updateServerSessionTimer(session.id, session.created_at || session.startTime), 1000);
```

**The field used for duration is `session.created_at`** (falling back to `session.startTime` for local-only sessions). It computes `Date.now() - created_at` in seconds, divides by 60 to get minutes, and displays `minutes:seconds`. [VERIFIED: source code]

**There is no hours digit, no `h`/`m`/`s` labels, and no rollover.** The HTML template is just:

```html
<span class="card-timer" id="timer-server-${sessionId}">${timeStr}</span>
```

### What the cards display RIGHT NOW (reproduced with Python matching the JS math):

| Animal | created_at | Timer Shows | Actual Elapsed |
|--------|-----------|-------------|----------------|
| Jennifur Lopez | 2026-07-10T15:20:07Z | **506:13** | 8.4 hours |
| Peanut Butter | 2026-07-10T17:00:27Z | **405:54** | 6.8 hours |
| Caramel | 2026-07-10T17:00:30Z | **405:51** | 6.8 hours |
| Nova | 2026-07-10T20:40:58Z | **185:23** | 3.1 hours |

[VERIFIED: reproduced from `created_at` timestamps at 2026-07-10T23:46 UTC]

**"506:13" reads as "506 hours" to a human expecting HH:MM format. It actually means 506 minutes = 8.4 hours.**

---

## 2. Where the Card Gets Its Data

**Endpoint:** `GET /api/sessions/active/:species` (server.ts line 8021)

**Server query (localDatabase.ts line 3999):**

```typescript
export function getActiveSessionsBySpecies(species: string): ActiveSession[] {
  return database.prepare(
    `SELECT * FROM active_sessions WHERE species = ? ORDER BY created_at ASC`
  ).all(species.toLowerCase()) as ActiveSession[];
}
```

**Client fetch (app.js line 1050):**

```javascript
const response = await fetch(`${API_BASE}/sessions/active/${species}`);
```

The response is stored in `serverActiveSessions` and passed directly to `renderSessionCard()`. 

**This is the SAME `active_sessions` table and SAME 4 rows the prior diagnosis read.** [VERIFIED: endpoint → query → table match]

---

## 3. SELECT * of All Four Rows (Every Column)

[VERIFIED: `SELECT * FROM active_sessions`]

```
id                                   | species | shelter_code | animal_name    | location             | photo_url  | caregiver_out | caregiver_out_type | out_time | urinate | defecate | placeholder_1 | placeholder_2 | voice_note_1 | voice_note_2 | voice_note_3 | photo_1 | photo_2 | photo_3 | created_at                  | behavior_status | clean | disin
9f30126f-bba1-4123-969b-5285a275d9a0 | cat     | W2026103     | Jennifur Lopez | Cat Room 4           | (url)      | Leilani       | S                  | 11:20 AM | (null)  | (null)   | (null)        | (null)        | (null)       | (null)       | (null)       | (null)  | (null)  | (null)  | 2026-07-10T15:20:07.970Z    | green           | (null)| (null)
dcfd1777-946f-4ef6-bd21-ce30ed205db4 | small   | R2025005     | Peanut Butter  | Small Animal Trailer | (url)      | Nova          | S                  | 01:00 PM | (null)  | (null)   | (null)        | (null)        | (null)       | (null)       | (null)       | (null)  | (null)  | (null)  | 2026-07-10T17:00:27.008Z    | red             | (null)| (null)
13675a02-7025-41a5-888e-91acd1c701da | small   | R2025003     | Caramel        | Small Animal Trailer | (url)      | Nova          | S                  | 01:00 PM | (null)  | (null)   | (null)        | (null)        | (null)       | (null)       | (null)       | (null)  | (null)  | (null)  | 2026-07-10T17:00:30.227Z    | red             | (null)| (null)
ade16c9d-1828-4953-a05a-bbf21e1fe8c9 | dog     | S2026045     | Nova           | Dog Kennel           | (url)      | Junior        | S                  | 04:40 PM | (null)  | (null)   | (null)        | (null)        | (null)       | (null)       | (null)       | (null)  | (null)  | (null)  | 2026-07-10T20:40:58.049Z    | green           | (null)| (null)
```

**Time-related columns in the schema:**
- `out_time` — time-only string (e.g., "11:20 AM"), no date component
- `created_at` — full ISO-8601 UTC timestamp (today, July 10)

**There is no column holding a stale/old date.** No stored duration, no stored elapsed value, no secondary timestamp. The `out_time` column is time-only and is NOT used for the timer calculation (the code uses `created_at`). [VERIFIED: all columns shown above]

---

## 4. The Verdict

### **(A) — Display presentation issue. The data is correct; the timer format is misleading.**

**Evidence:**

1. **All four `created_at` timestamps are from today** (2026-07-10, between 15:20 and 20:40 UTC). No column in the table contains an old date. [VERIFIED: SELECT *]

2. **The timer code correctly computes elapsed time from `created_at`** — the math is right. 506 minutes HAVE passed since Jennifur Lopez was checked out. [VERIFIED: manual reproduction matches JS output]

3. **The bug is purely presentational:** the timer displays `minutes:seconds` (`506:13`) with no hours rollover and no unit labels. This is visually indistinguishable from `hours:minutes` (`506h:13m`). A human reading "506:13" on a card naturally interprets it as "506 hours, 13 minutes" rather than "506 minutes, 13 seconds." [VERIFIED: source code — no `h`, `m`, or `s` labels in the template, no modulo-60 on the hours digit]

4. **`runActivityAutoClose` did not miss these sessions** — they didn't exist when it last ran (03:55 UTC = 11:55 PM ET July 9). They were created today, hours after the job fired. [VERIFIED: journal + created_at timestamps]

---

## 5. What the Card Should Show (if formatted correctly)

Using proper `HH:MM:SS` or `Xh Ym` format:

| Animal | Timer Shows Now | Should Show |
|--------|----------------|-------------|
| Jennifur Lopez | 506:13 | **8h 26m** |
| Peanut Butter | 405:54 | **6h 46m** |
| Caramel | 405:51 | **6h 46m** |
| Nova | 185:23 | **3h 5m** |

The underlying data is completely sane. All `created_at` values are today. No session has survived a missed auto-close. The auto-close will fire in ~4 hours (11:55 PM ET) and close all four normally.

---

## Summary

The prior report's "UI misread" hypothesis was correct but unsupported. The field-level evidence confirms it:

- **Timer source field:** `session.created_at` (correct, from today)
- **Timer format:** `minutes:seconds` with no hours rollover → `506:13` for 8.4 hours
- **No stale data anywhere:** all 22 columns inspected, no old timestamps
- **The sessions are from today.** The display format makes 506 minutes look like 506 hours.
- **Fix needed:** the timer code should roll minutes over to hours (e.g., `8:26:13` or `8h 26m`) once elapsed exceeds 60 minutes.
