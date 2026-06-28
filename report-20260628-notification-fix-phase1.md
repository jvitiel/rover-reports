# Notification Archive Fix — Phase 1: Prepare & Show

**Date:** 2026-06-28 16:29 UTC  
**Type:** Phase 1 preparation (read-only — nothing applied)  
**Status:** AWAITING CONFIRMATION before Phase 2

---

## STEP A — Backup

```
/home/shelter/backups/pre-notif-archive-fix-20260628-162916.db
Size: 32,268,288 bytes (30.8 MB)
Owner: shelter:shelter
```
Backup confirmed non-empty and in place before any changes.

---

## STEP B — Extracted Rows (6 rows from 2 backup sources)

### From shelter-2026-06-23.db (ids 30–34)

| id | message | published_by | published_at | button_label | push_version |
|----|---------|-------------|--------------|--------------|-------------|
| 30 | (empty) | Dashboard | 2026-04-18 23:44:30 | New Feature Drops | 1 |
| 31 | (empty) | Dashboard | 2026-05-03 03:52:35 | Picture enhancements | 1 |
| 32 | (empty) | Dashboard | 2026-05-07 03:12:15 | New Cleaning and Disinfecting Buttons | 1 |
| 33 | (empty) | Dashboard | 2026-05-07 03:13:00 | New Cleaning and Disinfecting Buttons | 1 |
| 34 | (empty) | Dashboard | 2026-05-24 04:02:09 | New Profiler Setup | 1 |

### From shelter-2026-06-24.db (id 35)

| id | message | published_by | published_at | button_label | push_version |
|----|---------|-------------|--------------|--------------|-------------|
| 35 | (empty) | Dashboard | 2026-06-23 23:35:17 | Automatic Check-in | 1 |

### long_message content (all 6 rows)

**id 30 — "New Feature Drops" (Apr 18):**
> Hi All, We just added two new features to the Staff app. 1) There is now a "History Lookup" button on the home screen and a "Hist" button in each animal's activity card. 2) Food and Water buttons are now available on the activity cards for Cats and Smalls. [...] Best, John

**id 31 — "Picture enhancements" (May 3):**
> Hi All, I just saw a few cute cat pictures that staff has taken with the app. One was a little blurry and the others had the cats behind bars. We can easily make a blurry picture sharp or remove the bars [...] Best, John

**id 32 — "New Cleaning and Disinfecting Buttons" (May 7 03:12):**
> We have added Cleaning and Disinfecting buttons to the app to comply with the NYS AG and Markets reporting requirements. [...] combined the Food and Water buttons into a single button labeled F/W. [...]

**id 33 — "New Cleaning and Disinfecting Buttons" (May 7 03:13):**
> Same as id 32 but reformatted with line breaks. (Duplicate publish, 1 minute apart.)

**id 34 — "New Profiler Setup" (May 24):**
> The Bi-Weekly Profile app has been renamed to just Profiler and the recording process has been simplified. Now when you record a profile you will be asked each of the 10 questions one at a time. [...]

**id 35 — "Automatic Check-in" (Jun 23):**
> Hi All, From now on any animal checked out past midnight in the Activity app will automatically be checked back in. Thanks, John

---

## STEP C — Recovery INSERTs (/tmp/recovery-final.sql)

These are the exact statements to be executed in Phase 2, AFTER the ALTER TABLE adds the status column. All 6 INSERTs have been validated against a test schema (all parsed and inserted correctly, 6 rows with status='dismissed').

```sql
-- Recovery of 6 staff_notifications rows from backups
-- Source: shelter-2026-06-23.db (ids 30-34), shelter-2026-06-24.db (id 35)
-- All rows set to status='dismissed' so they appear in archive only
-- Requires: ALTER TABLE staff_notifications ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

INSERT INTO staff_notifications (id, message, published_by, published_at, button_label, long_message, push_version, status)
VALUES (30, '', 'Dashboard', '2026-04-18 23:44:30', 'New Feature Drops', 'Hi All,

We just added two new features to the Staff app.

1) There is now a "History Lookup" button on the home screen and a "Hist" button in each animal''s activity card. Those will bring up any recent voice messages or pics of the selected animal.

2) Food and Water buttons are now available on the activity cards for Cats and Smalls. If you are in an activity session and you feed or water a cat or a small, you don''t have to use the feeder section of the app. Just click food and/or water right in the activity section. Note that food and water for the dogs remains only in the dog feeding section.

If you find any bugs or need changes, please let Holland know and THANK YOU FOR CARING FOR THE ANIMALS !

Best,
John', 1, 'dismissed');

INSERT INTO staff_notifications (id, message, published_by, published_at, button_label, long_message, push_version, status)
VALUES (31, '', 'Dashboard', '2026-05-03 03:52:35', 'Picture enhancements', 'Hi All,

I just saw a few cute cat pictures that staff has taken with the app.

One was a little blurry and the others had the cats behind bars.

We can easily make a blurry picture sharp or remove the bars from an otherwise cute photo - so if you see something that you think might be cute with a little fix, take the pic and we will see what we can do.

Thank you for caring for the animals!

Best,
John', 1, 'dismissed');

INSERT INTO staff_notifications (id, message, published_by, published_at, button_label, long_message, push_version, status)
VALUES (32, '', 'Dashboard', '2026-05-07 03:12:15', 'New Cleaning and Disinfecting Buttons', 'We have added Cleaning and Disinfecting buttons to the app to comply with the NYS AG and Markets reporting requirements. These buttons will be in the Activities sections for cats and smalls and in the Feeding section for dogs. We have also combined the Food and Water buttons into a single button labeled F/W. Use them as you perform your daily activities just like with he other buttons. If you have any questions about how to use them please ask Holland first.

THANK YOU FOR CAREING FOR THE ANIMALS!', 1, 'dismissed');

INSERT INTO staff_notifications (id, message, published_by, published_at, button_label, long_message, push_version, status)
VALUES (33, '', 'Dashboard', '2026-05-07 03:13:00', 'New Cleaning and Disinfecting Buttons', 'We have added Cleaning and Disinfecting buttons to the app to comply with the NYS AG and Markets reporting requirements.

These buttons will be in the Activities sections for cats and smalls and in the Feeding section for dogs. We have also combined the Food and Water buttons into a single button labeled F/W. Use them as you perform your daily activities just like with he other buttons.

If you have any questions about how to use them please ask Holland first.

THANK YOU FOR CAREING FOR THE ANIMALS!', 1, 'dismissed');

INSERT INTO staff_notifications (id, message, published_by, published_at, button_label, long_message, push_version, status)
VALUES (34, '', 'Dashboard', '2026-05-24 04:02:09', 'New Profiler Setup', 'The Bi-Weekly Profile app has been renamed to just Profiler and the recording process has been simplified.

Now when you record a profile you will be asked each of the 10 questions one at a time. Just click next after each one and click stop recording after the last question. No more trying to remember the questions or scrolling the list when recording.

This should make it easier and faster and all of the necessary information will be collected each time.

THANK YOU FOR CARING FOR THE ANIMALS !!', 1, 'dismissed');

INSERT INTO staff_notifications (id, message, published_by, published_at, button_label, long_message, push_version, status)
VALUES (35, '', 'Dashboard', '2026-06-23 23:35:17', 'Automatic Check-in', 'Hi All,

From now on any animal checked out past midnight in the Activity app will automatically be checked back in.

Thanks,
John', 1, 'dismissed');
```

### Validation result
All 6 INSERTs were dry-run against a temp DB with the target schema (including `status` column). Result: 6 rows inserted, all `status='dismissed'`, all `long_message` lengths match originals (721, 405, 502, 504, 501, 130 chars).

---

## STEP D — Empty-Message Render Check

### Archive renderer code (dashboard/index.html:10108–10121)

The archive table renders 4 columns per row:

| Column | Source field | Fallback |
|--------|------------|----------|
| Date | `row.published_at` | `'—'` |
| Title | `row.button_label` | `'(no title)'` |
| Message | `row.long_message` | `'(empty)'` |
| Pushes | `row.push_version` | `1` |

**Key finding:** The renderer uses `button_label` for the Title column and `long_message` for the Message column. The `message` column is **never referenced** in the archive renderer. All 6 recovered rows have `message=''` but have populated `button_label` and `long_message` — they will render correctly.

**Verdict: No render issue.** Empty `message` field is irrelevant to the archive display.

---

## STEP E — Proposed Code Diffs (NOT applied)

### Diff 1: localDatabase.ts — Add status column (idempotent ALTER)

**Location:** Insert before line 933 (`console.log('[Database] Initialized SQLite database');`), after the `featured_rotation_queue` CREATE INDEX blocks.

```diff
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_frq_shelter_code ON featured_rotation_queue(shelter_code)`);

+ // Staff notifications: add status column for archive-preserving clear
+ try { db.exec(`ALTER TABLE staff_notifications ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`); } catch {}
+
  console.log('[Database] Initialized SQLite database');
```

**Note:** The `staff_notifications` table has no `CREATE TABLE IF NOT EXISTS` in localDatabase.ts — it was created outside this file (likely via a one-time migration or direct SQL). The table already exists in the live DB; this ALTER is the only schema change needed. The `try {} catch {}` pattern matches the existing idempotent ALTER pattern used throughout the file (lines 117–119, 226–233, 243, 256–260, 829, 832, 835–837, 914).

---

### Diff 2: server.ts line 832 — Current-notification query: add WHERE status='active'

```diff
- const row = db.prepare('SELECT message, button_label, long_message, published_by, published_at, push_version FROM staff_notifications ORDER BY id DESC LIMIT 1').get() as { message: string; button_label: string | null; long_message: string | null; published_by: string; published_at: string; push_version: number | null } | undefined;
+ const row = db.prepare("SELECT message, button_label, long_message, published_by, published_at, push_version FROM staff_notifications WHERE status = 'active' ORDER BY id DESC LIMIT 1").get() as { message: string; button_label: string | null; long_message: string | null; published_by: string; published_at: string; push_version: number | null } | undefined;
```

---

### Diff 3: server.ts lines 863–875 — Publish handler: dismiss previous + clear changes

```diff
    const hasContent = (message?.trim()) || (buttonLabel?.trim()) || (longMessage?.trim());
    if (hasContent) {
+     // Dismiss any currently-active notification before inserting the new one
+     db.prepare("UPDATE staff_notifications SET status = 'dismissed' WHERE status = 'active'").run();
      db.prepare('INSERT INTO staff_notifications (message, button_label, long_message, published_by) VALUES (?, ?, ?, ?)').run(
        message?.trim() || '',  // message column is NOT NULL, use empty string
        buttonLabel?.trim() || null,
        longMessage?.trim() || null,
        publishedBy || 'Dashboard'
      );
      console.log(`[Notifications] Staff notification published by ${publishedBy || 'Dashboard'}: button="${buttonLabel || ''}" message="${(message || longMessage || '').substring(0, 50)}..."`);
    } else {
-     // Clear = delete all notifications (including archive)
-     db.prepare('DELETE FROM staff_notifications').run();
-     console.log(`[Notifications] Staff notification cleared by ${publishedBy || 'Dashboard'}`);
+     // Clear = dismiss the active notification (archive-preserving)
+     db.prepare("UPDATE staff_notifications SET status = 'dismissed' WHERE status = 'active'").run();
+     console.log(`[Notifications] Staff notification dismissed by ${publishedBy || 'Dashboard'}`);
    }
```

---

### Diff 4: server.ts line 889 — Archive query: filter to dismissed only

```diff
- const rows = db.prepare('SELECT id, button_label, long_message, published_by, published_at, push_version FROM staff_notifications ORDER BY id DESC LIMIT 50').all();
+ const rows = db.prepare("SELECT id, button_label, long_message, published_by, published_at, push_version FROM staff_notifications WHERE status = 'dismissed' ORDER BY id DESC LIMIT 50").all();
```

*Per Auditor minor 1: uses `= 'dismissed'` (not `!= 'active'`) for future-proof status extensibility.*

---

### Diff 5: server.ts line 901 — Re-push query: add WHERE status='active'

```diff
- const row = db.prepare('SELECT id, push_version FROM staff_notifications ORDER BY id DESC LIMIT 1').get() as { id: number; push_version: number | null } | undefined;
+ const row = db.prepare("SELECT id, push_version FROM staff_notifications WHERE status = 'active' ORDER BY id DESC LIMIT 1").get() as { id: number; push_version: number | null } | undefined;
```

---

## Summary of All Changes (Phase 2)

| # | File | Line(s) | Change |
|---|------|---------|--------|
| 1 | localDatabase.ts | before 933 | Add idempotent `ALTER TABLE ... ADD COLUMN status` |
| 2 | server.ts | 832 | Add `WHERE status = 'active'` to current-notification query |
| 3 | server.ts | 863–875 | Dismiss-before-insert on publish; change clear from DELETE to UPDATE |
| 4 | server.ts | 889 | Add `WHERE status = 'dismissed'` to archive query |
| 5 | server.ts | 901 | Add `WHERE status = 'active'` to re-push query |
| 6 | Live DB | — | Run /tmp/recovery-final.sql to restore 6 rows as dismissed |

**Phase 2 execution order:**
1. Schema: ALTER TABLE (via server restart picking up localDatabase.ts change, or direct SQL)
2. Recovery: Run /tmp/recovery-final.sql against live DB
3. Code: Apply diffs 2–5 to server.ts
4. Build & restart: `cd /home/shelter/shelter-apps/server && npm run build && sudo systemctl restart shelter-app`
5. Verify: Check archive endpoint returns 6 rows; check current-notification endpoint returns null (no active); test publish/clear cycle

---

## ⏸️ PHASE 1 COMPLETE — AWAITING CONFIRMATION

The 6 recovery INSERTs and 6 code diffs above are ready. **Nothing has been applied.** The live DB, server.ts, and localDatabase.ts are untouched.

**Confirm to proceed with Phase 2**, which will:
- Apply the ALTER TABLE (add `status` column)
- Run the 6 recovery INSERTs
- Apply the 5 code diffs
- Build and restart shelter-app
