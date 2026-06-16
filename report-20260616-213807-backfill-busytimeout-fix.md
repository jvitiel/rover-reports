# Backfill busy_timeout Fix

**Date:** 2026-06-16 21:38 UTC  
**Commit:** `efb9cd6` — `thumbnails Phase 2b: set busy_timeout=5000 on backfill connection (Auditor SOP-3 condition; process-isolated, still not run)`

---

## git diff --stat [VERIFIED]
```
 server/src/scripts/backfill-photo-thumbnails.ts | 1 +
 1 file changed, 1 insertion(+)
```

---

## Edited Section (backfill-photo-thumbnails.ts:36-38) [VERIFIED]

```typescript
  initDatabase();
  const db = getDatabase();
  db.pragma('busy_timeout = 5000');

  const rows = db.prepare(`
```

The pragma line is immediately after `getDatabase()` and before any queries. It applies only to this process's SQLite connection — shelter-app runs in a separate process with its own connection and is unaffected. [VERIFIED]

---

## Confirmations [VERIFIED]

- **Script was NOT executed.** No `npx tsx`, `node`, or any run command was issued. No thumbnails generated. No DB rows modified. [VERIFIED]
- **No other file changed.** Only `server/src/scripts/backfill-photo-thumbnails.ts` — 1 insertion, 0 deletions. [VERIFIED]
- **Commit:** `efb9cd6` on master. [VERIFIED]

---

## Deviations

None.
