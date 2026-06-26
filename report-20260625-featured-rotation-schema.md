# Featured Rotation Queue — Schema Migration Log

Executed 2026-06-26 03:30 UTC.

---

## Step 0: Backup

```
$ sudo -u shelter /home/shelter/scripts/do-backup.sh /home/shelter/shelter-apps/data/shelter.db pre-featured-rotation
/home/shelter/backups/pre-featured-rotation-20260626-033020.db
```
Size: 30,613,504 bytes. Owner: shelter:shelter. Non-empty confirmed.

---

## Step 1: Table Added to initDatabase()

**File:** `server/src/localDatabase.ts`
**Location:** Appended immediately before `console.log('[Database] Initialized SQLite database')` (after the `sm_push_skipped_reason` migration, before the closing brace of `initDatabase()`).

### Exact statements added:

```ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS featured_rotation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      species TEXT NOT NULL,
      shelter_code TEXT NOT NULL,
      position INTEGER NOT NULL,
      date_available TEXT NOT NULL,
      added_at TEXT NOT NULL,
      last_featured_at TEXT
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_frq_species_position ON featured_rotation_queue(species, position)`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_frq_shelter_code ON featured_rotation_queue(shelter_code)`);
```

No existing tables altered. No columns added to any existing table. `featured_slots` untouched.

---

## Step 2: Build + Restart

- `npm run build` (tsc) → exit 0, clean compile
- `sudo systemctl restart shelter-app` → exit 0
- Service status: active (running) since 03:30:54 UTC

---

## Step 3: Verification

### Schema:
```
$ sqlite3 shelter.db ".schema featured_rotation_queue"
CREATE TABLE featured_rotation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      species TEXT NOT NULL,
      shelter_code TEXT NOT NULL,
      position INTEGER NOT NULL,
      date_available TEXT NOT NULL,
      added_at TEXT NOT NULL,
      last_featured_at TEXT
    );
CREATE INDEX idx_frq_species_position ON featured_rotation_queue(species, position);
CREATE UNIQUE INDEX idx_frq_shelter_code ON featured_rotation_queue(shelter_code);
```

✅ Table exists with correct columns and types.
✅ Both indexes present: `idx_frq_species_position` (composite) and `idx_frq_shelter_code` (UNIQUE on shelter_code alone).

### Clean restart:
```
[Database] Initialized SQLite database
[Feeding Cron] Midnight feeding roster cron job initialized
[Auto-Close] Activity auto-close 23:55 ET job initialized
[SM Photo Sync] Nightly 2am SM photo sync initialized
[Adoptable Alert] Daily 9am ET adoptable status check initialized
[Generic Bio] Daily 9:30am ET generic bio job initialized
```
✅ No errors related to the new table or initDatabase. All schedulers initialized normally.

### Row count:
```
$ sqlite3 shelter.db "SELECT COUNT(*) FROM featured_rotation_queue;"
0
```
✅ Table exists and is empty. Seeding is a separate step.

---

## Commit

```
2aeae58 featured rotation: add featured_rotation_queue table (Auditor-verified schema)
```

Narrow commit: only `server/src/localDatabase.ts` staged.
