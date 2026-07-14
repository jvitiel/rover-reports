# /api/sessions/start Git History: Was daily_activities-at-Start Deliberately Removed?

**Date:** 2026-07-14 16:05 UTC (read-only git investigation)

---

## 1. When /api/sessions/start Landed

**Commit:** `d9494351fea1fb6b3e47d5e1191d9c3aaa4e42ac`
**Date:** 2026-03-27 19:54:40 UTC
**Author:** Clawd (clawdxjv@gmail.com)
**Full commit message:**

> Phase 1: shared sessions server + test activity app
>
> Server-side changes (invisible to staff):
> - Added active_sessions SQLite table for shared session state
> - POST /api/sessions/start - Creates session with unique animal_id constraint
> - GET /api/sessions/active/:species - Returns all active sessions for a species
> - PUT /api/sessions/:id/observe - Updates observations (anyone can call)
> - DELETE /api/sessions/:id/end - Ends session, writes to daily_activities + Sheets
>
> Test Activity PWA (/test-activity/):
> - Blue themed standalone app for testing shared sessions
> - Dogs only, no feeding or profiler sections
> - Shows all active sessions from server, sorted by user
> - Own sessions in blue, others in muted gray
> - Voice/photo buttons work on any card
> - Polling every 15 seconds
> - QR scanning for check-out/check-in
>
> Git tag: pre-shared-sessions (before these changes)
> Caddy route: test.4lgshelterapp.duckdns.org -> /test-activity/

[VERIFIED — `git log -1 --format="%B" d949435`]

**Key observation from the commit message:** The message explicitly states the architecture split — `/api/sessions/start` "Creates session" while `/api/sessions/:id/end` "Ends session, writes to daily_activities + Sheets." The daily_activities write is described as an END concern, not a START concern. **No mention of daily_activities at start, and no mention of removing it from start.** [VERIFIED — quoted above]

## 2. The Staff-PWA Migration

**Commit:** `175ca3afa5def4f0c4ea28ed1d94aa7dd42ea456`
**Date:** 2026-04-02 13:00:28 UTC
**Author:** Clawd
**Full commit message:**

> production cutover: shared sessions staff app v2.0

One-line message. No explanation of what changed or why. The diff shows the staff-pwa `startSession()` function changed from:
```javascript
// BEFORE:
const response = await fetch(`${API_BASE}/staff/session/start`, {
  body: JSON.stringify({ animalId: pendingAnimal.animalId, ..., caregiver: userName, appType: APP_TYPE })
// AFTER:
const serverResponse = await fetch(`${API_BASE}/sessions/start`, {
  body: JSON.stringify({ animalId: pendingAnimal.shelterCode || pendingAnimal.animalId, ..., caregiverName: userName, caregiverType: 'S' })
```

The commit also created `staff-pwa-backup/` (a full copy of the pre-migration staff app). [VERIFIED — `git show 175ca3a --stat` and diff]

**The old `/api/staff/session/start` endpoint was NOT removed.** It still exists in server.ts. The staff-pwa simply stopped calling it (except in the offline queue at line 3424). [VERIFIED — endpoint still present at server.ts:7707]

## 3. Intent on daily_activities

**The daily_activities-at-start write was NEVER INCLUDED in `/api/sessions/start`.** It was not present in the original commit (d949435). The endpoint was written from scratch with only `createActiveSession()` — no `insertDailyActivityRow()` call ever appeared in the new endpoint's code. [VERIFIED — full diff of d949435 reviewed]

The commit message describes the architecture as:
- START → "Creates session" (active_sessions only)
- END → "Ends session, writes to daily_activities + Sheets"

This was a **new design**, not a modification of the old endpoints. The old `/api/volunteer/session/start` and `/api/staff/session/start` (which DO write daily_activities at start) were left untouched. The new shared endpoint was built alongside them as a parallel system. [VERIFIED — the old endpoints are unchanged in commit d949435]

**The commit message says nothing about:**
- daily_activities timing (start vs end)
- Double-counting risk
- Dashboard visibility
- Activity logging strategy
- Why the new endpoint omits the start-time write

Silent. Intent not stated. [VERIFIED — full message quoted in §1, no other relevant text]

## 4. Was Double-Counting a Stated Reason?

**No.** Git history search results:

| Search term | Hits | Relevant? |
|-------------|------|-----------|
| `--grep="double"` | 3 commits | None about activity rows (CSS, Caddy fix, SM auto-gen) |
| `--grep="duplicate"` | 1 commit | Drag behavior, unrelated |
| `--grep="daily_activit"` | 5 commits | Schema work, extraction refactor, auto-close — none about dedup |
| `--grep="dedup"` | 2 commits | SM photo dedup, unrelated |
| `--grep="consolidat"` | 5 commits | Q5 schema renames, unrelated |

**No commit in the entire history mentions double-counting, duplicate activity rows, or deliberately moving the daily_activities write from start to close.** [VERIFIED — `git log --all --grep=...` for each term]

The `closeActiveSession()` extraction commit (ffd9a02, 2026-06-23) explicitly states "Behavior-preserving refactor" and "No behavior change — same DB writes, same Sheets append, same response shape." It just moved the inline close logic into a reusable function for midnight auto-close. [VERIFIED — commit message quoted]

## 5. What the New Endpoint Added

The Phase 1 commit (d949435) introduced a **new shared-session architecture**:

- **`active_sessions` SQLite table** — persistent session state visible across all phones (the old system used an in-memory `activeSessions` Map that was phone-scoped and lost on restart)
- **Live observations** via `/api/sessions/:id/observe` — any phone can update urinate/defecate/photos during a session
- **Cross-phone visibility** via `/api/sessions/active/:species` — all phones see all active sessions
- **Test Activity PWA** — blue-themed standalone app for validation before production cutover

This was a deliberate rearchitecture to solve the "my session is invisible to other phones" problem. The in-memory Map approach couldn't survive restarts and couldn't be shared. Moving to SQLite `active_sessions` fixed both. [VERIFIED — commit message + diff]

## 6. Between Phase 1 and Production Cutover

20 commits landed between d949435 (Mar 27) and 175ca3a (Apr 2):
- Service worker changes, voice timer fixes, species normalization, staging staff app creation, shelterCode migration, profiler QR flow, notification feature
- None of them modified the `/api/sessions/start` endpoint or added daily_activities to it
- None mention activity logging timing or double-counting

[VERIFIED — `git log --oneline d949435..175ca3a`]

## Bottom Line: Verdict A — Incidental Drop

**(A) The daily_activities-at-start write was an INCIDENTAL omission during a session-endpoint rearchitecture.**

Evidence:
1. The new `/api/sessions/start` was written from scratch as part of a new shared-session system. It was never a copy of the old start endpoints with the daily_activities write removed — the write was simply never added. [VERIFIED — diff shows clean new code, not modified old code]
2. The commit message is silent on activity logging timing. No mention of daily_activities, dashboard, double-counting, or why the write was omitted. [VERIFIED — full message quoted]
3. No commit in the entire repository history mentions double-counting, duplicate activity rows, or deliberate removal of the start-time write. [VERIFIED — grep of all commit messages]
4. The old endpoints (which DO write daily_activities at start) were left in place, not deprecated or documented as "wrong." [VERIFIED]
5. The rearchitecture focused on cross-phone session visibility (active_sessions table) and live observations — activity logging was an END concern in the new design's mental model, as stated in the commit message: "Ends session, writes to daily_activities + Sheets." [VERIFIED]

**Restoring the start-time daily_activities write is safe.** There is no evidence of a double-count problem that the omission was designed to prevent. Our proposed design (insert at start with NULL in_time, update at close via stored activity_id, with backward-compat INSERT fallback) correctly handles the pairing. [INFERRED from analysis]
