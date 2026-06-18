# Searcher Metrics: Lang Capture + Per-Filter Percentages — DEPLOYED

**Date:** 2026-06-18 16:21 ET  
**Commit:** `2c8b5ea` — 3 files, +59/-33. [VERIFIED]  
**Build:** Clean (tsc, zero errors). [VERIFIED]  
**Service:** `shelter-app` active after restart. [VERIFIED]  
**Status:** **DEPLOYED-AND-LIVE.**  
**Rollback:** `git revert 2c8b5ea` + rebuild + restart. The `lang` column can stay (harmless NULL for future writes without the code).

---

## Changes Made

### Change 1: Store `lang` in matcher_audit

**Migration (`localDatabase.ts:832`):**
```typescript
  // Lang metric: store query language for EN/ES breakdown
  try { db.exec(`ALTER TABLE matcher_audit ADD COLUMN lang TEXT`); } catch {}
```
Idempotent — verified by restarting service twice without errors. [VERIFIED]

**Interface (`localDatabase.ts:5006`):**
```typescript
  lang: string;
```
Added as last field of `MatcherAuditEntry`. [VERIFIED]

**INSERT (`localDatabase.ts:5017-5041`) — 19/19/19 alignment:**
```
Column list (19):  id, created_at, hard_filters, narrative, result_shelter_codes, result_bios,
                   rejected_codes, input_profiles,
                   status, error_class, error_message, candidate_count, response_time_ms, input_tokens, output_tokens,
                   low_confidence, preamble_shown, preamble_text, lang
Placeholders (19): ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
Bindings (19):     id(1), createdAt(2), hardFilters(3), narrative(4), resultShelterCodes(5), resultBios(6),
                   rejectedCodes(7), inputProfiles(8),
                   status(9), errorClass(10), errorMessage(11), candidateCount(12), responseTimeMs(13), inputTokens(14), outputTokens(15),
                   lowConfidence(16), preambleShown(17), preambleText(18), lang(19)
```
[VERIFIED — counted 19 columns, 19 `?`, 19 `.run()` arguments]

**Audit write (`server.ts:4330`):**
```typescript
    audit.lang = lang;
```
Set immediately after `lang` derivation at line 4329. Audit type includes `lang: string;`, default `'en'`. [VERIFIED]

**getMatcherAuditByDateRange** also updated to SELECT and return `lang` (line 5063, 5087). [VERIFIED]

### Change 2: Stats query

**`getSearcherStats24h()` additions (`localDatabase.ts:1203-1229`):**

```sql
SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
-- sex/age now filtered to success-only:
SUM(CASE WHEN status = 'success' AND EXISTS (
  SELECT 1 FROM json_each(hard_filters, '$.sex') WHERE value = 'male'
) THEN 1 ELSE 0 END) as male,
-- ... (same pattern for female, young, adult, senior)
SUM(CASE WHEN lang = 'en' AND status = 'success' THEN 1 ELSE 0 END) as lang_en,
SUM(CASE WHEN lang = 'es' AND status = 'success' THEN 1 ELSE 0 END) as lang_es,
```

**Return type additions:** `successCount`, `langEn`, `langEs`. [VERIFIED]

**Denominator change:** `preamblePct` now uses `successCount` instead of `total`. [VERIFIED]

**NULL-lang handling:** Historical rows have `lang = NULL`. The `CASE WHEN lang = 'en'` condition is false for NULL, so they count toward neither EN nor ES. `successCount` still counts them (it checks `status`, not `lang`). [VERIFIED]

### Change 3: Widget

**`renderSearcherStats()` (`dashboard/index.html:15400-15430`):**

```javascript
const sc = s.successCount || 0;
function pct(n) { return sc > 0 ? Math.round(n / sc * 100) : 0; }
function rowPct(label, n) {
  return `<span class="stat-label">${label}</span><span class="stat-value">${n} (${pct(n)}%)</span>`;
}
```

Applied to: Male, Female, Young, Adult, Senior, EN, ES — each shows `count (XX%)`.

EN and ES rows added between Senior and the Low Confidence divider:
```javascript
'<div class="searcher-stats-divider"></div>',
rowPct('EN', s.langEn),
rowPct('ES', s.langEs),
'<div class="searcher-stats-divider"></div>',
```

Queries still shows raw total (all traffic including failures). [VERIFIED]

---

## Verification

### PRAGMA table_info

```
18|lang|TEXT|0||0
```
Column present, position 18 (0-indexed). [VERIFIED]

### INSERT alignment — test rows

| Audit ID (prefix) | lang | status | candidate_count | low_confidence | preamble_shown | narrative |
|---|---|---|---|---|---|---|
| f71770be | **en** | success | 98 | 0 | 0 | A calm friendly cat. |
| 89bca1c6 | **es** | success | 98 | 0 | 0 | Busco un gato tranquilo. |

All columns in correct positions — no shift. `lang` correctly stores `en` and `es`. [VERIFIED]

### Stats endpoint (`/api/dashboard/profiles-summary`)

```json
{
  "queries": 25,
  "successCount": 24,
  "male": 23,
  "female": 22,
  "young": 23,
  "adult": 22,
  "senior": 23,
  "langEn": 1,
  "langEs": 1,
  "preambleLowConfidence": 4,
  "preambleLowThreshold": 0,
  "preambleBoth": 0,
  "preamblePct": 16.7,
  "errors": 1,
  "errorPct": 4,
  "avgResponseTimeSec": 19.9
}
```

- `langEn: 1` + `langEs: 1` — the two test queries. Historical rows (NULL lang) excluded. [VERIFIED]
- `successCount: 24` (25 total - 1 failure). [VERIFIED]
- Sex/age counts now over success-only (male 23 / female 22 from 24 success, not 25 total). [VERIFIED]

### Migration idempotent

Service restarted twice — no duplicate column errors, no log warnings. [VERIFIED]

### Search behavior unchanged

Response shape identical to pre-change:
```
Top-level: candidateCount, lowConfidence, matches, preamble
Per-match: adoptionPending, age, bio, bio_en_long, bio_en_short, bio_es_long, bio_es_short, bondedPair, breed, name, photo_url, sex, shelter_code, video_url
```
[VERIFIED]

### Forward-only note

EN/ES counts are forward-only. The 22 historical rows in the 24h window have `lang = NULL` and are excluded from lang counts but included in `successCount`. Once the window rolls past them (~24h), all rows will have `lang` populated. [VERIFIED]
