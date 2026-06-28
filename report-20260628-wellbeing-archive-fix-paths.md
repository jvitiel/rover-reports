# Notification Archive Fix Paths — Schema & Read/Write Analysis

**Date:** 2026-06-28  
**Type:** Read-only diagnosis (follow-up to report-20260627-wellbeing-archive-empty.md)  
**Status:** Full path analysis for fix design

---

## 1. staff_notifications Schema (verbatim)

```sql
CREATE TABLE staff_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  published_by TEXT NOT NULL,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  button_label TEXT,
  long_message TEXT,
  push_version INTEGER DEFAULT 1
);
```

**Active/archived distinction: NO.** There is no `status`, `archived`, `archived_at`, `dismissed_at`, `is_read`, `active`, or any other column that distinguishes current from archived rows. Every row is structurally identical.

---

## 2. The "Current" Notification — How It's Determined

The system uses **"most recent row by id"** as the implicit "current" notification. There is no status flag.

### Endpoint: `GET /api/notifications/staff` (server.ts:829–853)

```typescript
app.get('/api/notifications/staff', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT message, button_label, long_message, published_by, published_at, push_version '
      + 'FROM staff_notifications ORDER BY id DESC LIMIT 1'
    ).get() as { ... } | undefined;

    if (!row) {
      res.json({ success: true, data: { message: null } });
      return;
    }

    res.json({
      success: true,
      data: {
        message: row.message,
        buttonLabel: row.button_label,
        longMessage: row.long_message,
        publishedBy: row.published_by,
        publishedAt: row.published_at,
        pushVersion: row.push_version || 1
      }
    });
  } catch (error) { ... }
});
```

**Key query:** `ORDER BY id DESC LIMIT 1` — the row with the highest `id` is "current."

### Consumers of the current notification:
- **Dashboard** (`dashboard/index.html:9993`) — `loadStaffNotification()` populates the edit fields and shows "✓ Active notification" status
- **Staff PWA** (`staff-pwa/app.js:190`) — `GET /api/notifications/staff` to display the notification banner
- **Staging Staff** (`staging-staff/app.js:190`) — same

### Re-push endpoint: `POST /api/notifications/staff/repush` (server.ts:898–912)

Also uses `ORDER BY id DESC LIMIT 1` to find the "current" notification and increment its `push_version`.

---

## 3. The Clear Button — Exact Path

### Frontend (dashboard/index.html:10045–10060)

```javascript
async function clearStaffNotification() {
  try {
    await fetch(`${API_BASE}/notifications/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishedBy: 'Dashboard' })
    });
    document.getElementById('staffNotifButtonLabel').value = '';
    document.getElementById('staffNotifLongMessage').value = '';
    const status = document.getElementById('staffNotificationStatus');
    status.textContent = 'Notification cleared';
    status.classList.remove('active');
    setTimeout(() => { status.textContent = ''; }, 3000);
  } catch (err) { ... }
}
```

It POSTs to `/api/notifications/staff` with **only** `publishedBy` — no `message`, `buttonLabel`, or `longMessage`. This triggers the "else" branch on the server.

### Backend (server.ts:857–880)

```typescript
app.post('/api/notifications/staff', (req: Request, res: Response) => {
  try {
    const { message, buttonLabel, longMessage, publishedBy } = req.body;
    const db = getDatabase();

    const hasContent = (message?.trim()) || (buttonLabel?.trim()) || (longMessage?.trim());
    if (hasContent) {
      // INSERT new notification
      db.prepare('INSERT INTO staff_notifications (message, button_label, long_message, published_by) VALUES (?, ?, ?, ?)').run(
        message?.trim() || '',
        buttonLabel?.trim() || null,
        longMessage?.trim() || null,
        publishedBy || 'Dashboard'
      );
    } else {
      // Clear = delete all notifications (including archive)
      db.prepare('DELETE FROM staff_notifications').run();
    }

    res.json({ success: true });
  } catch (error) { ... }
});
```

**Confirmed:** The Clear path runs `DELETE FROM staff_notifications` with **no WHERE clause** — full table wipe. All 35 historical notifications were destroyed by this.

---

## 4. The Archive Read — Exact Path

### Endpoint: `GET /api/notifications/staff/archive` (server.ts:886–894)

```typescript
app.get('/api/notifications/staff/archive', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT id, button_label, long_message, published_by, published_at, push_version '
      + 'FROM staff_notifications ORDER BY id DESC LIMIT 50'
    ).all();
    res.json({ success: true, data: rows });
  } catch (err) { ... }
});
```

**No filtering at all.** Returns all rows (up to 50), newest first. If a `status` column existed, the archive query would need a `WHERE status = 'archived'` clause (and the current-notification query would need `WHERE status = 'active'`). Today neither query filters because no such column exists.

---

## 5. Write Path — Full Lifecycle

Only **one** code path inserts into `staff_notifications`:

**`POST /api/notifications/staff`** (server.ts:865–870) — called when the Dashboard Publish button is clicked with content.

The intended lifecycle today:
1. **Created:** Dashboard user types button label + message, clicks Publish → INSERT
2. **Shown as current:** Staff apps call `GET /api/notifications/staff` → `ORDER BY id DESC LIMIT 1` returns it
3. **Superseded:** A new notification is published → INSERT adds a new row → the new row becomes "current" (highest id); the old one naturally becomes "archived" (still in table, just not the highest id anymore)
4. **Cleared:** Dashboard user clicks Clear → `DELETE FROM staff_notifications` (all rows) → table empty → no current notification AND no archive

Step 4 is the defect. Steps 1–3 naturally create an archive (old rows stay in the table). But step 4 nukes everything.

---

## 6. Fix Shape — Schema Change Required

**A schema change is necessary.** The table has no column to distinguish active from archived rows.

### Minimal fix: Add `status` column

```sql
ALTER TABLE staff_notifications ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
```

### Changes needed:

**A. Clear handler** (server.ts:874) — change from full wipe to status flip:
```typescript
// Before (destructive):
db.prepare('DELETE FROM staff_notifications').run();

// After (archive-preserving):
db.prepare("UPDATE staff_notifications SET status = 'dismissed' WHERE status = 'active'").run();
```

**B. Current-notification query** (server.ts:832) — add status filter:
```sql
-- Before:
SELECT ... FROM staff_notifications ORDER BY id DESC LIMIT 1

-- After:
SELECT ... FROM staff_notifications WHERE status = 'active' ORDER BY id DESC LIMIT 1
```

**C. Archive query** (server.ts:889) — exclude active, show only dismissed:
```sql
-- Before:
SELECT ... FROM staff_notifications ORDER BY id DESC LIMIT 50

-- After:
SELECT ... FROM staff_notifications WHERE status != 'active' ORDER BY id DESC LIMIT 50
```

**D. Re-push query** (server.ts:901) — add status filter:
```sql
-- Before:
SELECT id, push_version FROM staff_notifications ORDER BY id DESC LIMIT 1

-- After:
SELECT id, push_version FROM staff_notifications WHERE status = 'active' ORDER BY id DESC LIMIT 1
```

**E. Publish handler** (server.ts:865) — when a new notification is published, auto-dismiss the previous active one:
```typescript
// Before INSERT:
db.prepare("UPDATE staff_notifications SET status = 'dismissed' WHERE status = 'active'").run();
// Then INSERT as before (new row gets status='active' by DEFAULT)
```

### What does NOT need to change:
- Frontend `clearStaffNotification()` — still POSTs the same empty body
- Frontend `publishStaffNotification()` — still POSTs the same content
- Frontend `loadNotifArchive()` — still calls the same endpoint; the server-side query change handles filtering
- Staff PWA readers — still call `GET /api/notifications/staff`; the server-side query change handles filtering

### Summary:
- **1 schema change** (add `status` column)
- **4 query changes** (current, archive, re-push, clear)
- **1 new statement** (auto-dismiss previous active on publish)
- **0 frontend changes** (all filtering is server-side)
