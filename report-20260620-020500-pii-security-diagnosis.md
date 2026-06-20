# PII & Security Diagnosis — Custom-Search

**Date:** 2026-06-20 02:05 ET  
**Type:** READ-ONLY DIAGNOSIS  
**Source:** Code inspection + DB queries (no destructive testing)

---

## Answers

**(A) Are filter DB queries parameterized?** YES — all SQLite queries in the custom-search path use prepared statements with `?` bound parameters. No string concatenation of user input into SQL. Injection is not possible. [VERIFIED]

**(B) Is adopter narrative PII stored/logged in the clear?** YES — the raw narrative text is stored **in the clear** in the `matcher_audit.narrative` column (localDatabase.ts:5060, position 4). It is also sent **in the clear** via Telegram alert on non-success queries (server.ts:5464: `Query: "${audit.narrative || '(empty)'}""`). It is NOT logged to console with its content — console.log only records `narrative=yes/no` (server.ts:4569,5272). [VERIFIED]

**(C) Honeypot on custom-search?** NO — the honeypot (`website_url` field) exists only on `/api/contact` (server.ts:12942-12949). The custom-search endpoint `/api/matcher/custom-search` has no honeypot, no CAPTCHA, and no bot detection beyond the global rate limiter (2000 req/15min). [VERIFIED]

---

## PART A — SQL / Query Injection

### All DB Call Sites in Custom-Search Path

**1. `fetchAnimals()` — Pool query (shelterManagerService.ts:95)**

No SQLite at all. Fetches from Shelter Manager API via HTTP and caches in memory. User filter values (species/sex/ageGroup) never touch a DB query for the pool fetch. [VERIFIED]

**2. `getBehaviorRecords()` — Behavior data (localDatabase.ts:984)**

```typescript
const stmt = database.prepare(`
  SELECT * FROM (
    SELECT * FROM behavior_notes 
    WHERE shelter_code = ? 
    ORDER BY recorded_at DESC 
    LIMIT 5
  ) ORDER BY recorded_at ASC
`);
const rows = stmt.all(animalId) as Record<string, unknown>[];
```

Parameterized with `?`. The `animalId` here is a `shelterCode` from the SM-sourced animal record, not from user input. [VERIFIED]

**3. `animal_metadata` batch lookup — Flags (server.ts:5389-5391)**

```typescript
const rows = database.prepare(
  `SELECT shelter_code, adoption_pending, bonded_pair FROM animal_metadata 
   WHERE shelter_code IN (${matchedCodes.map(() => '?').join(',')})`
).all(...matchedCodes)
```

Parameterized — the `IN (?)` list is built from `.map(() => '?')`, NOT from string values. Each `?` is bound to a value from `matchedCodes`, which comes from Sonnet's Phase-2 JSON response (shelter codes it selected). Not from user input. [VERIFIED]

**4. Video lookup (server.ts:5402-5406)**

```typescript
const videoRow = database.prepare(`
  SELECT file_url FROM animal_media
  WHERE shelter_code = ? AND media_type = 'video' AND hidden = 0
  ORDER BY captured_at DESC LIMIT 1
`).get(m.shelter_code)
```

Parameterized with `?`. The `m.shelter_code` is from Sonnet's response. [VERIFIED]

**5. `insertMatcherAudit()` — Audit write (localDatabase.ts:5049-5073)**

```typescript
database.prepare(`
  INSERT INTO matcher_audit (id, created_at, hard_filters, narrative, ...)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(id, createdAt, JSON.stringify(entry.hardFilters), entry.narrative, ...)
```

Fully parameterized — 19 `?` placeholders, each bound to a specific value. [VERIFIED]

### User Input → SQL Boundary

User-supplied values (`sex`, `ageGroup`, `species`, `narrative`) **never reach any SQL query directly**:

- `sex`/`ageGroup` are used only in JavaScript `.filter()` on the in-memory animal array (server.ts:4508-4514). They are validated against allowlists before use.
- `species` selects a filter map key (server.ts:4497-4500). Validated against `VALID_SPECIES`.
- `narrative` goes to the Anthropic API as prompt text and to `insertMatcherAudit()` as a parameterized value. Never interpolated into SQL.

The only values that reach SQLite are `shelter_code` strings from Sonnet's response (not user input) and the audit record fields (all parameterized).

**Assessment: SQL injection is not possible in the custom-search path.** [VERIFIED]

---

## PART B — PII in the Narrative

### Where the narrative goes

| Destination | Contains full text? | In the clear? | Persisted? |
|------------|-------------------|---------------|-----------|
| `matcher_audit.narrative` column | ✅ YES | ✅ YES | ✅ YES (SQLite) |
| Telegram error alert | ✅ YES (on failure) | ✅ YES | ✅ YES (Telegram history) |
| Console log (journalctl) | ❌ NO (only `narrative=yes/no`) | — | — |
| Anthropic API (Phase 1+2 prompts) | ✅ YES | ✅ In transit (HTTPS) | ❓ (Anthropic retention policy) |

### The audit write (localDatabase.ts:5049-5073)

```typescript
database.prepare(`
  INSERT INTO matcher_audit (id, created_at, hard_filters, narrative, result_shelter_codes, ...)
  VALUES (?, ?, ?, ?, ?, ...)
`).run(
  id,                                          // 1
  createdAt,                                   // 2
  JSON.stringify(entry.hardFilters),            // 3
  entry.narrative,                             // 4  ← RAW TEXT, NO SANITIZATION
  ...
);
```

Line 4: `entry.narrative` is stored as-is. No hashing, no truncation, no PII scrubbing. [VERIFIED]

### Live verification

```sql
SELECT id, substr(narrative,1,80), status FROM matcher_audit ORDER BY created_at DESC LIMIT 5;
```

| id (short) | narrative | status |
|-----------|-----------|--------|
| 3620a53b | (null) | failure_validation |
| ffa67944 | (null) | failure_validation |
| 6b170a76 | a friendly cat | success |
| d1794bb1 | a friendly rabbit | success |
| 8c7aaf69 | a bonded pair of kittens | success |

Narrative text is stored verbatim in the clear. [VERIFIED]

### The Telegram alert (server.ts:5463-5464)

```typescript
const alertMsg = [
  `⚠️ Matcher error — ${audit.status}`,
  `Query: "${audit.narrative || '(empty)'}"`,   // ← RAW NARRATIVE IN ALERT
  `Filters: ${sex} / ${age}`,
  ...
].join('\n');
const child = spawn('/home/shelter/scripts/send-alert.sh', [alertMsg], { ... });
```

On ANY non-success, non-content-filter result, the **full raw narrative** is sent to John's Telegram. If an adopter types PII and the query fails for any reason (API error, parse failure, no candidates), that PII goes to Telegram. [VERIFIED]

### PII exposure scenario

If an adopter types: *"I'm at 123 Main St, call me at 555-1234, I have cancer and need a calm cat"*

1. **Stored in `matcher_audit.narrative`** — in the clear, indefinitely (no retention policy, no auto-purge). [VERIFIED]
2. **Sent to John's Telegram** — if the query errors (API timeout, no candidates, parse failure). [VERIFIED]
3. **Sent to Anthropic API** — as part of the Phase 1+2 prompts over HTTPS. Subject to Anthropic's data retention policy (currently 30-day for API). [INFERRED]
4. **NOT in console logs** — console.log only records `narrative=yes` or `narrative=no`. [VERIFIED]

### Assessment

**This is a PII exposure finding.** Adopter free-text, which can contain phone numbers, addresses, email, and health information, is retained in the clear in the audit table with no retention limit and no PII scrubbing. The Telegram alert path adds a secondary exposure vector on error cases. [VERIFIED]

**Severity:** MEDIUM. The narrative field is designed for pet preference text ("I want a calm lap cat"), but there's no input guidance telling adopters not to include personal info, and no server-side scrubbing. The exposure is passive (stored in a DB only accessible to shelter staff and the server) rather than active (not publicly exposed), but it creates a data-minimization and potential GDPR/state-privacy-law concern.

---

## PART C — Honeypot / Bot Detection

### Custom-search: NO honeypot

The honeypot field (`website_url`) exists only on the contact form endpoint:

```typescript
// server.ts:12940
app.post('/api/contact', contactFormLimiter, async (req: Request, res: Response) => {
  const { name, email, category, subject, message, website_url } = req.body || {};
  
  // Honeypot: if filled, silently succeed
  if (website_url && String(website_url).trim() !== '') {
    console.log('[Contact] Honeypot triggered, silent skip');
    res.json({ ok: true });
    return;
  }
```

The custom-search endpoint (`/api/matcher/custom-search`, server.ts:4347) has **no honeypot field**, **no CAPTCHA**, and **no bot-specific detection**. [VERIFIED]

### Bot protection on custom-search

| Layer | Present? | Details |
|-------|---------|---------|
| Honeypot field | ❌ NO | Only on `/api/contact` |
| CAPTCHA | ❌ NO | No reCAPTCHA or equivalent |
| Bot-specific header check | ❌ NO | No User-Agent filtering |
| Rate limiter | ✅ YES (global) | 2000 req/15min per IP (server.ts:695-700) |
| Content filter | ✅ YES | Blocks slurs/sexual terms (server.ts:4295-4343) |
| Input validation | ✅ YES | Species/sex/ageGroup validated against allowlists |

The global rate limiter (2000/15min) is the only bot protection. Static assets under `/custom-search/` are exempt from rate limiting (server.ts:714), but the API endpoint `/api/matcher/custom-search` is NOT exempt — it goes through the global limiter. [VERIFIED]

**Assessment:** The custom-search endpoint has no dedicated bot protection. The global rate limiter provides basic abuse prevention but is generous (2000/15min = ~2.2 req/sec sustained). Each query costs Anthropic API tokens (Phase 1 + Phase 2), so bot abuse would have a direct cost impact. A dedicated rate limiter for the matcher endpoint (e.g., 10/min per IP) would be a reasonable hardening measure. [INFERRED]

---

## Summary

| Area | Status | Detail |
|------|--------|--------|
| SQL injection | **SAFE** ✅ | All queries parameterized. User input never reaches SQL directly. |
| PII in audit table | **EXPOSURE** ⚠️ | Raw narrative stored in clear, no retention policy, no scrubbing |
| PII in Telegram alerts | **EXPOSURE** ⚠️ | Raw narrative sent on error cases |
| PII in console logs | **SAFE** ✅ | Only `narrative=yes/no` logged |
| Honeypot on custom-search | **ABSENT** ℹ️ | Only on /api/contact |
| Bot protection | **MINIMAL** ⚠️ | Global rate limiter only (2000/15min), no dedicated matcher limiter |
| Content filter | **PRESENT** ✅ | Blocks slurs/sexual terms, reasonable for adoption context |
