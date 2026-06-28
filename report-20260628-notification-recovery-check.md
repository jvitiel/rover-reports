# Notification Archive Recovery Check

**Date:** 2026-06-28  
**Type:** Read-only investigation  
**Status:** Recovery feasibility determined

---

## 1. Backup Inventory

### WAL/SHM alongside live DB

| File | Size |
|------|------|
| shelter.db | 32,268,288 bytes |
| shelter.db-wal | 4,779,232 bytes |
| shelter.db-shm | 32,768 bytes |

WAL contains pending writes for the live DB; deleted rows are not recoverable from WAL.

### All database snapshots in /home/shelter/backups/ (oldest → newest)

| Backup | Date (ctime) | Size | staff_notifications rows | sqlite_sequence seq |
|--------|-------------|------|--------------------------|---------------------|
| shelter-2026-06-14.db | Jun 14 03:00 | 20,574,208 | **5** | 34 |
| shelter-pre-last-source-20260614.db | Jun 14 17:41 | 20,971,520 | **5** | 34 |
| shelter-2026-06-15.db | Jun 15 03:00 | 20,979,712 | **5** | 34 |
| pre-source-columns.db | Jun 15 23:00 | 21,577,728 | **5** | 34 |
| shelter-2026-06-16.db | Jun 16 03:00 | 21,590,016 | **5** | 34 |
| pre-thumbnail-backfill.db | Jun 16 21:39 | 21,966,848 | **5** | 34 |
| shelter-2026-06-17.db | Jun 17 03:00 | 22,040,576 | **5** | 34 |
| shelter-2026-06-18.db | Jun 18 03:00 | 22,380,544 | **5** | 34 |
| shelter-2026-06-19.db | Jun 19 03:00 | 23,588,864 | **5** | 34 |
| shelter-2026-06-20.db | Jun 20 03:00 | 25,223,168 | **5** | 34 |
| shelter-2026-06-21.db | Jun 21 03:00 | 28,516,352 | **5** | 34 |
| shelter-2026-06-22.db | Jun 22 03:00 | 29,081,600 | **5** | 34 |
| shelter-2026-06-23.db | Jun 23 03:00 | 29,454,336 | **5** | 34 |
| shelter-2026-06-24.db | Jun 24 03:00 | 29,872,128 | **1** | 35 |
| shelter-2026-06-25.db | Jun 25 03:00 | 30,191,616 | **0** | 35 |
| pre-featured-rotation-20260626-033020.db | Jun 26 03:30 | 30,613,504 | **0** | 35 |
| pre-seed-insert-20260626-034323.db | Jun 26 03:43 | 30,613,504 | **0** | 35 |
| shelter-2026-06-26.db | Jun 26 03:00 | 30,613,504 | **0** | 35 |
| pre-intake-recipient-deactivate-20260626-161651.db | Jun 26 16:16 | 30,994,432 | **0** | 35 |
| shelter-2026-06-27.db | Jun 27 03:00 | 31,014,912 | **0** | 35 |
| pre-stale-draft-cleanup-20260627-201523.db | Jun 27 20:15 | 31,895,552 | **0** | 35 |
| shelter-2026-06-28.db | Jun 28 03:00 | 31,899,648 | **0** | 35 |

(7 `shelter-backup-slot1fix-*` backups also exist from Jun 22–28; these are frozen copies of the Jun 21 snapshot and contain the same 5 rows.)

### Timeline of wipes

1. **Jun 14–23:** 5 rows present (ids 30–34, seq=34)
2. **Between Jun 23 03:00 and Jun 24 03:00:** Row 35 was inserted (seq bumped to 35) AND rows 30–34 were wiped by a Clear. Only row 35 survived in the Jun 24 backup.
3. **Between Jun 24 03:00 and Jun 25 03:00:** Row 35 was wiped by another Clear. Table empty from Jun 25 onward.

---

## 2. Which Backups Have Data

**Best backup for rows 30–34:** Any daily backup from Jun 14–23 (all identical content: 5 rows, ids 30–34).

**Best backup for row 35:** `shelter-2026-06-24.db` (the only snapshot that captured it before it was cleared).

**Maximum recoverable rows: 6** (5 from Jun 23 backup + 1 from Jun 24 backup).

---

## 3. Recoverable Rows — Content

### From shelter-2026-06-23.db (5 rows, ids 30–34)

| id | published_at | button_label | long_message (summary) | push_version |
|----|-------------|--------------|------------------------|-------------|
| 30 | 2026-04-18 23:44:30 | New Feature Drops | Announced History Lookup button and Food/Water buttons for cats and smalls | 1 |
| 31 | 2026-05-03 03:52:35 | Picture enhancements | Staff can take photos even if blurry or behind bars — team can enhance them | 1 |
| 32 | 2026-05-07 03:12:15 | New Cleaning and Disinfecting Buttons | Added Cleaning/Disinfecting buttons for NYS AG compliance; combined Food/Water into F/W | 1 |
| 33 | 2026-05-07 03:13:00 | New Cleaning and Disinfecting Buttons | Same as id 32 (duplicate publish, reformatted with line breaks) | 1 |
| 34 | 2026-05-24 04:02:09 | New Profiler Setup | Bi-Weekly Profile renamed to Profiler; simplified 10-question recording flow | 1 |

### From shelter-2026-06-24.db (1 row, id 35)

| id | published_at | button_label | long_message (full) |
|----|-------------|--------------|---------------------|
| 35 | 2026-06-23 23:35:17 | Automatic Check-in | "From now on any animal checked out past midnight in the Activity app will automatically be checked back in." |

**Date range of recoverable rows:** 2026-04-18 to 2026-06-23 (66 days of notification history).

**Content assessment:** All 6 rows are legitimate operational notifications from John to staff. No test data. All published by "Dashboard." These are real shelter communications worth preserving in the archive.

---

## 4. Gap Analysis

- **sqlite_sequence says:** 35 rows were ever inserted (autoincrement reached 35)
- **Best recoverable:** 6 rows (ids 30–35)
- **Unrecoverable:** 29 rows (ids 1–29) — these were created and cleared before the earliest backup (Jun 14). No backup on the VPS contains any row with id < 30.

The 29 unrecoverable rows were likely earlier staff notifications published from roughly when the feature was first built (the table was created at server startup via `CREATE TABLE IF NOT EXISTS`) through mid-April 2026, cleared by successive Clear operations before any backup captured them. They are permanently lost from VPS backups.

**Recovery ceiling: 6 of 35 (17%).** However, these 6 are the most recent/relevant ones — the 29 lost rows predate them.

---

## 5. Recovery Feasibility (NOT executed)

Recovery is straightforward because:
- The live `staff_notifications` table is **completely empty** (0 rows)
- No id collisions possible
- The `sqlite_sequence` value (35) already accounts for all 35 historical inserts; inserting rows with explicit ids 30–35 won't conflict

### Recovery procedure (to be executed only after the status-column schema change):

1. **Apply the schema fix first** — add `status TEXT NOT NULL DEFAULT 'active'` column (from report-20260628-wellbeing-archive-fix-paths.md)

2. **Extract rows from backups:**
   ```bash
   # Copy backups to temp for read access
   cp /home/shelter/backups/shelter-2026-06-23.db /tmp/recovery-src-23.db
   cp /home/shelter/backups/shelter-2026-06-24.db /tmp/recovery-src-24.db
   
   # Dump the 6 rows as INSERT statements
   sqlite3 /tmp/recovery-src-23.db ".dump staff_notifications" | grep "^INSERT" > /tmp/recovery-inserts.sql
   sqlite3 /tmp/recovery-src-24.db ".dump staff_notifications" | grep "^INSERT" >> /tmp/recovery-inserts.sql
   # Deduplicate (row 35 only in the 24 backup, so no actual dupes, but safe to check)
   sort -u /tmp/recovery-inserts.sql > /tmp/recovery-inserts-dedup.sql
   ```

3. **Modify INSERT statements to include status='dismissed'** so recovered rows land in the archive, not as active notifications.

4. **Apply to live DB:**
   ```bash
   sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db < /tmp/recovery-inserts-modified.sql
   ```

5. **Verify:**
   ```bash
   sudo -u shelter sqlite3 /home/shelter/shelter-apps/data/shelter.db \
     "SELECT COUNT(*) FROM staff_notifications WHERE status='dismissed';"
   # Expected: 6
   ```

6. **Cleanup temp files.**

### Considerations:
- The `message` column is `NOT NULL` — all 6 rows have `message = ''` (empty string, not null), so they'll insert cleanly.
- `push_version` is 1 for all rows — no issue.
- `published_at` is preserved from the original timestamps.
- No restart needed — the archive endpoint reads directly from the DB.
