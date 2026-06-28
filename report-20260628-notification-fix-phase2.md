# Notification Archive Fix — Phase 2: Applied

**Date:** 2026-06-28 17:11 UTC  
**Type:** Production fix (Auditor-approved)  
**Status:** COMPLETE — all gates passed, singleton cycle verified

---

## Pre-flight

**Backup confirmed:** `/home/shelter/backups/pre-notif-archive-fix-20260628-162916.db` — 32,268,288 bytes, present.

---

## STEP 1 — Schema ALTER

**Change applied to** `localDatabase.ts` (before line 930):
```typescript
// Staff notifications: add status column for archive-preserving clear
try { db.exec(`ALTER TABLE staff_notifications ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch {}
```

**Build:** `tsc` — exit code 0, no errors.  
**Restart:** `systemctl restart shelter-app` — status: active.

### HARD GATE — Column verification (1c):
```
sqlite> .schema staff_notifications
CREATE TABLE staff_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  button_label TEXT,
  long_message TEXT,
  push_version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active'
);
```
**✅ PASSED:** `status TEXT NOT NULL DEFAULT 'active'` column present.

---

## STEP 2 — Recovery INSERTs

Executed `/tmp/recovery-final.sql` (6 explicit-column INSERTs, all `status='dismissed'`).

### Verification:
```
id | status    | published_at        | button_label
30 | dismissed | 2026-04-18 23:44:30 | New Feature Drops
31 | dismissed | 2026-05-03 03:52:35 | Picture enhancements
32 | dismissed | 2026-05-07 03:12:15 | New Cleaning and Disinfecting Buttons
33 | dismissed | 2026-05-07 03:13:00 | New Cleaning and Disinfecting Buttons
34 | dismissed | 2026-05-24 04:02:09 | New Profiler Setup
35 | dismissed | 2026-06-23 23:35:17 | Automatic Check-in
```
**✅ PASSED:** 6 rows, ids 30–35, all `status='dismissed'`, historical `published_at` preserved.

---

## STEP 3 — Logic Changes (server.ts)

Five changes applied:

| # | Line | Change |
|---|------|--------|
| 1 | 832 | Current query: added `WHERE status = 'active'` |
| 2 | 865 | Publish: added dismiss-before-insert (`UPDATE ... SET status='dismissed' WHERE status='active'`) |
| 3 | 876 | Clear: replaced `DELETE FROM staff_notifications` with `UPDATE ... SET status='dismissed' WHERE status='active'` |
| 4 | 891 | Archive query: added `WHERE status = 'dismissed'` |
| 5 | 903 | Re-push query: added `WHERE status = 'active'` |

**Build:** `tsc` — exit code 0, no errors.  
**Restart:** `systemctl restart shelter-app` — status: active.

---

## STEP 4 — Post-State Verification

### 4a. Schema
✅ `status TEXT NOT NULL DEFAULT 'active'` column present.

### 4b. Dismissed count
```
SELECT COUNT(*) FROM staff_notifications WHERE status='dismissed';
→ 6
```
✅

### 4c. Active count
```
SELECT COUNT(*) FROM staff_notifications WHERE status='active';
→ 0
```
✅

### 4d. Archive endpoint
```
GET /api/notifications/staff/archive
→ success: true, count: 6
  id=35 Automatic Check-in
  id=34 New Profiler Setup
  id=33 New Cleaning and Disinfecting Buttons
  id=32 New Cleaning and Disinfecting Buttons
  id=31 Picture enhancements
  id=30 New Feature Drops
```
✅

### 4e. Current endpoint
```
GET /api/notifications/staff
→ success: true, message: null
```
✅

### 4f. Singleton Cycle (end-to-end)

**Publish test notification:**
```
POST /api/notifications/staff
  {"buttonLabel":"TEST","longMessage":"singleton test","publishedBy":"Dashboard"}
→ {"success":true}
```

**After publish:**
- `active` count: **1** ✅
- `dismissed` count: **6** ✅ (recovered rows untouched)

**Clear:**
```
POST /api/notifications/staff
  {"publishedBy":"Dashboard"}
→ {"success":true}
```

**After clear:**
- `active` count: **0** ✅
- `dismissed` count: **7** ✅ (6 recovered + test now dismissed)
- Current endpoint: `message: null` ✅

**Singleton cycle proves:**
- Publish creates exactly 1 active notification
- Clear dismisses (not deletes) — moves to archive
- Archive preserves all history
- No data loss on clear

---

## Commit

```
commit 76c516f
  staff notifications: status column + archive-preserving clear + recover 6 rows (Auditor-verified)
  2 files changed, 11 insertions(+), 6 deletions(-)
```

Files committed: `server/src/localDatabase.ts`, `server/src/server.ts`

---

## Cleanup

Removed temp files:
- `/tmp/recsrc-23.db`
- `/tmp/recsrc-24.db`
- `/tmp/recovery-final.sql`

All confirmed deleted.
