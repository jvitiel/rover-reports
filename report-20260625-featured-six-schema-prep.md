# Featured Six Rotation — Schema & Code Placement Diagnosis

Read-only. Queried 2026-06-26 03:24 UTC.

---

## 1. TABLE CREATION / MIGRATION MECHANISM

### How tables are created:
All tables are created in `initDatabase()` at **localDatabase.ts:11-918**. The function runs on app startup (called at line 921 and on-demand via `getDatabase()`). Pattern:

1. **New tables:** `CREATE TABLE IF NOT EXISTS` — idempotent, runs every startup
2. **Schema migrations:** `ALTER TABLE ... ADD COLUMN` wrapped in `try { } catch (_) { /* column already exists */ }` — also idempotent
3. **Indexes:** `CREATE INDEX IF NOT EXISTS` after the table

There is no version-tracked migration runner, no migrations array, no separate migrations file. Everything is inline in `initDatabase()`.

### House style (representative examples):

**animal_bios (localDatabase.ts:204-215):**
```sql
CREATE TABLE IF NOT EXISTS animal_bios (
  id TEXT PRIMARY KEY,
  shelter_code TEXT NOT NULL,
  bio_en_long TEXT NOT NULL DEFAULT '',
  bio_es_long TEXT NOT NULL DEFAULT '',
  status_long TEXT NOT NULL DEFAULT 'draft',
  approved_at_long TEXT,
  bio_en_short TEXT NOT NULL DEFAULT '',
  bio_es_short TEXT NOT NULL DEFAULT '',
  status_short TEXT NOT NULL DEFAULT 'draft',
  approved_at_short TEXT,
  generated_at TEXT NOT NULL
)
```

**featured_slots (created outside initDatabase — manually or early migration, not in current code):**
```sql
CREATE TABLE featured_slots (
  slot_index INTEGER PRIMARY KEY,
  shelter_code TEXT,
  media_id TEXT,
  media_type TEXT,
  updated_at TEXT NOT NULL
)
```

### Conventions:
- Column names: **snake_case**
- Types: `TEXT`, `INTEGER`, `REAL` — no fancy types
- Timestamps: **TEXT** containing ISO-8601 strings (e.g. `datetime('now')`, or JS `new Date().toISOString()`)
- Primary keys: either `INTEGER PRIMARY KEY AUTOINCREMENT` or `TEXT PRIMARY KEY` (UUID)
- Indexes: separate `CREATE INDEX IF NOT EXISTS` statements

### Where to add a new table:
Append the `CREATE TABLE IF NOT EXISTS` statement at the **end of `initDatabase()`** in `localDatabase.ts`, just before the final `console.log('[Database] Initialized SQLite database')` at line 917. Follow with any indexes.

---

## 2. CANONICAL SPECIES VALUE

### The canonical triple: **`'cat' | 'dog' | 'small'`**

### The canonical mapping function:

**server.ts:12040-12045:**
```ts
function normalizeSpecies(speciesName: string): 'dog' | 'cat' | 'small' {
  const s = speciesName.toLowerCase();
  if (s.includes('dog')) return 'dog';
  if (s.includes('cat')) return 'cat';
  return 'small'; // rabbits, guinea pigs, etc.
}
```

This function is **defined twice** in server.ts:
- Line 1635: local to a specific handler (inline arrow)
- Line 12040: module-level function used by the SM photo sync, generic bio, and other features

**Neither is exported.** For a new module (`featuredRotation.ts`), it should either:
- Be moved to `utils.ts` or `shelterManagerService.ts` and exported, or
- Be duplicated in the new module (matches how line 1635 duplicates line 12040 today — not ideal but precedented)

### Other spellings in the codebase:
| Spelling | Where | Usage |
|----------|-------|-------|
| `'cat' \| 'dog' \| 'small'` | server.ts:12040, 1479, 1559, 1622 | normalizeSpecies, custom-search validation |
| `'small_animal'` | server.ts:4499-4510 | Searcher SPECIES_MAP keys + VALID_SPECIES |
| `'small-animal'` | Foster roster diagnosis only | Ad-hoc mapping in the one-off query |

The `'cat' | 'dog' | 'small'` triple is the most widely used internally (6+ call sites). The `'small_animal'` variant is searcher-specific. Use `'small'` for the rotation queue.

---

## 3. DATEAVAILABLEFORADOPTION ACCESS

### Confirmed: NOT in normalizeAnimal

`shelterManagerService.ts` normalizes only two date fields (line 66-67):
```ts
dateOfBirth: raw.DATEOFBIRTH || '',
dateIntake: raw.DATEBROUGHTIN || '',
```

`DATEAVAILABLEFORADOPTION` is not extracted, not in the `Animal` interface (types.ts:53-54 has only `dateOfBirth` and `dateIntake`).

### Cleanest access path:

**House-style way: add to normalizeAnimal + Animal interface.**

1. **types.ts:54** — add after `dateIntake`:
   ```ts
   dateAvailableForAdoption: string;
   ```

2. **shelterManagerService.ts:67** — add after `dateIntake`:
   ```ts
   dateAvailableForAdoption: raw.DATEAVAILABLEFORADOPTION || '',
   ```

This follows the exact pattern of `dateIntake` (line 67) and `dateOfBirth` (line 66): raw SM field → string, empty-string fallback. All consumers of `fetchAnimals()` would then have access without re-querying the SM API.

### Alternative (if touching normalizeAnimal is out of scope):
Access raw SM data directly by calling `fetchAnimals({ includeUnavailable: false })` to get cached animals, but the raw data isn't exposed. The only raw access is inside `fetchAnimals` before normalization. A new field in normalizeAnimal is the right approach.

---

## 4. WHERE ROTATION CODE LIVES

### Recommended structure (following existing patterns):

| Component | File | Analog |
|-----------|------|--------|
| Queue CRUD + rotation logic | **`server/src/featuredRotation.ts`** (new) | `cropSweep.ts` — standalone module, exports one main function |
| DB table + queries | **`server/src/localDatabase.ts`** | All other table operations live here |
| Email send function | **`server/src/emailService.ts`** | Add `sendFeaturedRotationEmail()` alongside existing `sendAdoptableAlertEmail()` |
| Scheduler + wiring | **`server/src/server.ts`** | `scheduleGenericBioJob()` at line 13001 — same `setTimeout` + `setInterval` pattern |

### Closest analog: `cropSweep.ts`

```ts
// cropSweep.ts — standalone module
// - Exports one function: runCropSweep(shelterCode?)
// - Imported in server.ts: import { runCropSweep } from './cropSweep.js'
// - Called from scheduler + fire-and-forget from drag handlers
// - Self-contained logic, no Express routes
```

The rotation module would follow the same shape:
```ts
// featuredRotation.ts — standalone module
// - Export: runFeaturedRotation(): Promise<RotationResult>
// - Import in server.ts, call from scheduleWeeklyFeaturedRotation()
// - Uses localDatabase helpers for queue CRUD
// - Calls emailService for the rotation email
```

The scheduler function itself (`scheduleWeeklyFeaturedRotation()`) should live in server.ts, following the pattern of `scheduleGenericBioJob()` (line 13001) and `scheduleDailyAdoptableCheck()` (line 12677).

---

## 5. PRE-EXISTING REFERENCES

**Clean.** Zero hits for `featured_rotation`, `rotation_queue`, `featured.*queue`, or `queue.*featured` across all `.ts`, `.js`, `.html`, and `.json` files in the entire shelter-apps tree (excluding node_modules and backups).

The table name `featured_rotation_queue` is unused and safe to create.

---

## 6. DB BACKUP MECHANISM

### Canonical wrapper: `/home/shelter/scripts/do-backup.sh`

**What it does:**
1. Takes a source file path (required) and optional custom name
2. Copies it to `/home/shelter/backups/` with timestamp suffix
3. Sets ownership to `shelter:shelter`, mode 644
4. Prints the destination path to stdout

**Where backups go:** `/home/shelter/backups/`

**Who can run it:**
Rover has a **sudoers entry** for this script:
```
(shelter) NOPASSWD: /home/shelter/scripts/do-backup.sh
```

**Exact invocation (as rover):**
```bash
sudo -u shelter /home/shelter/scripts/do-backup.sh /home/shelter/shelter-apps/data/shelter.db pre-featured-rotation
```

This produces: `/home/shelter/backups/pre-featured-rotation-YYYYMMDD-HHMMSS.db`

**No John terminal access needed.** Rover can run this via the sudoers entry before any schema migration.
