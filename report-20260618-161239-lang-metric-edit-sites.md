# Pre-Implementation Diagnosis: Lang Metric + Widget Edit Sites

**Date:** 2026-06-18 16:12 ET  
**Production modified:** NO. Read-only diagnosis. [VERIFIED]

---

## Task 1: Audit INSERT / Persist Path

### CREATE TABLE (`localDatabase.ts:815-825`)

```typescript
    CREATE TABLE IF NOT EXISTS matcher_audit (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      hard_filters TEXT NOT NULL,
      narrative TEXT,
      result_shelter_codes TEXT NOT NULL,
      result_bios TEXT NOT NULL,
      rejected_codes TEXT,
      input_profiles TEXT
    )
```

Note: columns added later via ALTER TABLE are not in the CREATE TABLE. New installs get the base 8 columns; existing DBs get the additions on boot. [VERIFIED]

### Migration pattern (`localDatabase.ts:829`)

```typescript
  // Phase 18b: add preamble_text column for dynamic preamble audit
  try { db.exec(`ALTER TABLE matcher_audit ADD COLUMN preamble_text TEXT`); } catch {}
```

**Pattern:** `try { ALTER TABLE ADD COLUMN } catch {}` — idempotent, runs on every boot. SQLite throws if column already exists; the catch swallows it. Used throughout the codebase (16+ instances across `behavior_notes`, `animal_bios`, `matcher_audit`). [VERIFIED]

**To add `lang`:** Add a new line after line 829:
```typescript
  try { db.exec(`ALTER TABLE matcher_audit ADD COLUMN lang TEXT`); } catch {}
```

### Interface (`localDatabase.ts:4988-5007`)

```typescript
export interface MatcherAuditEntry {
  id: string;
  createdAt: string;
  hardFilters: { sex: string[]; ageGroup: string[] };
  narrative: string | null;
  resultShelterCodes: string[];
  resultBios: string[];
  rejectedCodes: string[];
  inputProfiles: string[];
  status: string;
  errorClass: string | null;
  errorMessage: string | null;
  candidateCount: number | null;
  responseTimeMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  lowConfidence: boolean;
  preambleShown: boolean;
  preambleText: string | null;
}
```

**To add `lang`:** Add `lang: string;` after `preambleText`. [VERIFIED]

### INSERT statement (`localDatabase.ts:5014-5038`)

```typescript
    INSERT INTO matcher_audit (id, created_at, hard_filters, narrative, result_shelter_codes, result_bios,
      rejected_codes, input_profiles,
      status, error_class, error_message, candidate_count, response_time_ms, input_tokens, output_tokens,
      low_confidence, preamble_shown, preamble_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,                                          // 1
    createdAt,                                   // 2
    JSON.stringify(entry.hardFilters),            // 3
    entry.narrative,                             // 4
    JSON.stringify(entry.resultShelterCodes),     // 5
    JSON.stringify(entry.resultBios),             // 6
    JSON.stringify(entry.rejectedCodes),          // 7
    JSON.stringify(entry.inputProfiles),          // 8
    entry.status,                                // 9
    entry.errorClass,                            // 10
    entry.errorMessage,                          // 11
    entry.candidateCount,                        // 12
    entry.responseTimeMs,                        // 13
    entry.inputTokens,                           // 14
    entry.outputTokens,                          // 15
    entry.lowConfidence ? 1 : 0,                 // 16
    entry.preambleShown ? 1 : 0,                 // 17
    entry.preambleText                           // 18
  );
```

**Uses positional `?` bindings.** Column list and values MUST stay aligned. To add `lang`:

1. Add `, lang` to the column list after `preamble_text`.
2. Change `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` to 19 `?`s.
3. Add `entry.lang` as the 19th `.run()` argument after `entry.preambleText`.

[VERIFIED]

---

## Task 2: The `lang` Value

### Derivation (`server.ts:4326-4328`)

```typescript
    // --- Language parameter (defaults to English) ---
    const langRaw = typeof req.query.lang === 'string' ? req.query.lang.toLowerCase().trim() : '';
    const lang: 'en' | 'es' = langRaw === 'es' ? 'es' : 'en';
```

Derived from `req.query.lang` (URL query param). Single-valued, exactly `'en'` or `'es'`. [VERIFIED]

### Audit object lifecycle

**Created** at `server.ts:4287-4323` — the `const audit: { ... } = { ... }` block.

**Fields set** throughout the handler:
- `server.ts:4386` — `audit.hardFilters = { sex: sexLower, ageGroup: ageLower };`
- `server.ts:4469` — `audit.candidateCount = withRecords.length;` (approximate location)
- `server.ts:4790-4796` — `audit.lowConfidence`, `audit.preambleShown`, `audit.preambleText`
- Various error paths set `audit.status`, `audit.errorClass`, `audit.errorMessage`

**Inserted** at `server.ts:4870`:
```typescript
      const auditId = insertMatcherAudit(audit);
```

This is inside a `finally` block, so the audit is always written (success or failure). [VERIFIED]

**`lang` is in scope at the audit object site.** The `lang` const is declared at line 4328, the audit object at line 4287. Both are in the same `try` block scope of the request handler. To write it:

1. Add `lang: string;` to the audit type at `server.ts:4304` (or nearby).
2. Add `lang: 'en',` to the default initializer at `server.ts:4322` (or nearby).
3. Add `audit.lang = lang;` after line 4328 (where lang is derived).

[VERIFIED]

---

## Task 3: Widget Render Code

### File and function

**File:** `/home/shelter/shelter-apps/dashboard/index.html`  
**Function:** `renderSearcherStats()` at **line 15400**.

### Full function (`dashboard/index.html:15400-15424`)

```javascript
    function renderSearcherStats() {
      if (!profilesCache || !profilesCache.searcherStats) return;
      const s = profilesCache.searcherStats;
      const grid = document.getElementById('searcherStatsGrid');
      grid.innerHTML = [
        row('Queries', s.queries),
        row('Male', s.male),
        row('Female', s.female),
        row('Young', s.young),
        row('Adult', s.adult),
        row('Senior', s.senior),
        '<div class="searcher-stats-divider"></div>',
        row('Low Confidence', s.preambleLowConfidence),
        row('Low Threshold', s.preambleLowThreshold),
        row('Both Triggers', s.preambleBoth),
        row('Total Preamble', s.preamblePct + '%'),
        '<div class="searcher-stats-divider"></div>',
        row('Avg Response', (s.avgResponseTimeSec || 0) + 's'),
        row('Errors', s.errorPct + '%'),
      ].join('');
      function row(label, val) {
        return `<span class="stat-label">${label}</span><span class="stat-value">${val}</span>`;
      }
    }
```

[VERIFIED — quoted verbatim from line 15400]

### Current field names consumed from `searcherStats`

| Widget label | JS field |
|---|---|
| Queries | `s.queries` |
| Male | `s.male` |
| Female | `s.female` |
| Young | `s.young` |
| Adult | `s.adult` |
| Senior | `s.senior` |
| Low Confidence | `s.preambleLowConfidence` |
| Low Threshold | `s.preambleLowThreshold` |
| Both Triggers | `s.preambleBoth` |
| Total Preamble | `s.preamblePct` |
| Avg Response | `s.avgResponseTimeSec` |
| Errors | `s.errorPct` |

**To add EN/ES:** New fields (e.g. `s.langEn`, `s.langEs`) from `getSearcherStats24h()` return object. New `row()` calls in the array. [VERIFIED]

### HTML container (`dashboard/index.html:5317-5319`)

```html
          <div class="profiles-searcher-card">
            <h3>🔍 Searcher (24h)</h3>
            <div class="searcher-stats-grid" id="searcherStatsGrid">
```

No change needed to the HTML container — content is fully JS-generated. [VERIFIED]

---

## Task 4: Denominator

### Current `COUNT(*)` includes failures

The SQL query in `getSearcherStats24h()`:

```sql
    FROM matcher_audit
    WHERE created_at > datetime('now', '-24 hours')
```

No `status` filter. `COUNT(*)` counts ALL rows including `failure_validation`, `failure_api`, `failure_parse`, etc. [VERIFIED]

**Current 24h data:** 23 total rows = 22 success + 1 failure_validation. [VERIFIED]

### How status is recorded

- `audit.status` defaults to `'success'` (`server.ts:4314`).
- Error paths set it to `'failure_validation'`, `'failure_api'`, `'failure_parse'`, `'failure_content'`, etc.
- The audit row is always written (in a `finally` block at `server.ts:4870`). [VERIFIED]

### Impact on percentages

**Current `preamblePct`:** `preamble_total / COUNT(*)` — divides by ALL queries including failures. A validation failure has `preamble_shown = 0`, so it dilutes the percentage slightly.

For example: 4 preambles out of 23 total = 17.4%. If denominator were success-only (22), it would be 18.2%. Difference is marginal with current volumes but conceptually wrong — a failed request that never reached the model shouldn't dilute preamble rate.

**For the new per-filter percentages:** same issue. "60% of queries included male" should probably mean "60% of _successful_ queries" since failed queries often have empty filters (`sex:[], ageGroup:[]`).

**Recommendation:** Add a `success_count` field to the stats query:
```sql
SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count
```
Use `success_count` as the denominator for percentages. Keep `COUNT(*)` as the displayed "Queries" total (operators want to see all traffic including failures). [INFERRED]

---

## Summary of Edit Sites

| Change | File | Line(s) | What to do |
|---|---|---|---|
| **Schema migration** | `localDatabase.ts` | after 829 | `try { ALTER TABLE matcher_audit ADD COLUMN lang TEXT } catch {}` |
| **Interface** | `localDatabase.ts` | 4988-5007 | Add `lang: string;` to `MatcherAuditEntry` |
| **INSERT column list** | `localDatabase.ts` | 5014 | Add `, lang` to column list |
| **INSERT values** | `localDatabase.ts` | 5018 | Change to 19 `?`s |
| **INSERT binding** | `localDatabase.ts` | 5038 | Add `entry.lang` after `entry.preambleText` |
| **Audit type** | `server.ts` | 4287-4304 | Add `lang: string;` to type |
| **Audit default** | `server.ts` | 4305-4322 | Add `lang: 'en',` to initializer |
| **Audit write** | `server.ts` | after 4328 | Add `audit.lang = lang;` |
| **Stats query** | `localDatabase.ts` | 1200-1225 | Add `SUM(CASE WHEN lang = 'en')`, `SUM(CASE WHEN lang = 'es')`, `success_count` |
| **Stats return type** | `localDatabase.ts` | 1191-1196 | Add `langEn`, `langEs`, `successCount` to return type |
| **Stats return object** | `localDatabase.ts` | 1236-1249 | Add `langEn`, `langEs`, `successCount` to return |
| **Widget render** | `dashboard/index.html` | 15405-15419 | Add `row('EN', s.langEn)`, `row('ES', s.langEs)` + percentage rows |

**Total: 4 files, ~12 edit sites. All additive (no removals or restructuring).** [VERIFIED]
