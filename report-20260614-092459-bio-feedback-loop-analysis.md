# Bio Generator: AI↔SM Feedback Loop Analysis

**Date:** 2026-06-14 09:24 ET  
**Type:** Read-only feasibility / design-input diagnosis  
**Status:** No code changes — analysis only  

---

## PART A — DOES AN OUTBOUND BIO→SM PUSH EXIST TODAY?

### Answer: NO — no outbound bio push exists. [VERIFIED]

The only SM write path in the codebase is `shelterManagerPush.ts`, which pushes **photos only** via `csv_import` with the `ANIMALIMAGE` field. Evidence:

| File | Line | What it pushes |
|------|------|---------------|
| `server/src/shelterManagerPush.ts` | 60 | `buildCsvPayload()` builds CSV with header `ANIMALCODE,ANIMALNAME,ANIMALIMAGE` |
| `server/src/shelterManagerPush.ts` | 117 | `method: 'csv_import'` — the only SM write call in the entire codebase |
| `sm_push_audit` table | `push_field` column | Only value in table: `ANIMALIMAGE` [VERIFIED via `SELECT DISTINCT push_field FROM sm_push_audit`] |

No code anywhere writes `ANIMALCOMMENTS` or any bio text to SM. Specifically:

- **Grep for any CSV with ANIMALCOMMENTS:** zero hits outside comments/type definitions [VERIFIED]
- **Approve endpoints** (`POST /api/bio/:bioId/approve/long`, line 2368; `POST /api/bio/:bioId/approve/short`, line 2401): update local `animal_bios` status + clear WordPress cache if animal is featured. No SM write. [VERIFIED]
- **No on-approval hook** triggers an SM push. [VERIFIED]
- **No cron/scheduler** pushes bio text to SM. The only bio-related scheduler is the generic bio job (9:30am ET daily, line 11290) which writes to the local `animal_bios` table, never to SM. [VERIFIED]

### External-facing bio serving (read-only, not a write):

The approved bio text IS served to external consumers (PWAs, WordPress, matcher) via several API endpoints, but these are **reads from local DB**, not writes to SM:

| File:Line | Endpoint | What it serves |
|-----------|----------|---------------|
| `server.ts:927` | `GET /api/animals` | `displayBio` = approved bio ∥ SM description [VERIFIED] |
| `server.ts:934-935` | `GET /api/animals` | Flat `bioEnLong`, `bioEnShort` fields (approved ∥ SM ∥ truncated SM) [VERIFIED] |
| `server.ts:2586-2607` | Featured-slots / single-animal detail | Bio fallback chain: approved → SM → stock placeholder [VERIFIED] |

These serve bio text TO consumers. None write it BACK to ShelterManager.

---

## PART B — THE SEED SOURCE

### B3. What the generator reads as the SM seed

The SM seed is `animal.description`, which maps to SM's `ANIMALCOMMENTS` field:

```typescript
// server/src/shelterManagerService.ts, line 62
description: raw.ANIMALCOMMENTS || '',
```

Read points where this seed enters the bio generator:

| Code path | File:Line | What it reads | Condition |
|-----------|-----------|--------------|-----------|
| **Generate** (initial) | `server.ts:2124` | `animal.description?.trim()` | When `getBehaviorNotes()` returns null (no caregiver profile) |
| **Regenerate** | `server.ts:2193` | Does NOT read `animal.description` | Only reads `getBehaviorNotes()` — no SM fallback (the bug from prior report) |
| **sm_copy** ("Use as Starting Point") | `server.ts:2049` | `animal.description?.trim()` | Copies SM text verbatim into `bio_en_long` as draft |
| **bioStatus display** | `server.ts:1210` | `smAnimal.description` via `hasValue()` | Sets badge to 'sm' when ANIMALCOMMENTS is non-empty |

The generate path (line 2124) feeds `animal.description` directly as `transcripts` to GPT-4o when no caregiver profile exists. The sm_copy path (line 2049) copies it verbatim as the starting text.

### B4. Existing provenance signals

#### animal_bios table schema:
```
id TEXT PRIMARY KEY
generated_at TEXT NOT NULL
bio_en_long TEXT, bio_es_long TEXT
status_long TEXT, approved_at_long TEXT
bio_en_short TEXT, bio_es_short TEXT
status_short TEXT, approved_at_short TEXT
shelter_code TEXT
```
**No generation_source column on the bios table itself.** [VERIFIED]

#### animal_bios_history table schema:
```
id INTEGER PRIMARY KEY
shelter_code TEXT NOT NULL
bio_en_long TEXT, bio_en_short TEXT, bio_es_long TEXT, bio_es_short TEXT
status_long TEXT, status_short TEXT
approved_at_long TEXT, approved_at_short TEXT
generated_by TEXT
source TEXT NOT NULL
generated_at TEXT DEFAULT datetime('now')
notes TEXT
```

#### Distinct `source` values in animal_bios_history:
```
approve_long      — status change on long bio
approve_short     — status change on short bio
backfill          — historical backfill
delete            — bio deletion
full_generate     — GPT generation from caregiver profile
generic           — template-based generic bio for young animals
manual_edit_long  — human edit of long bio
regenerate_long   — GPT regeneration of long bio
regenerate_short  — GPT regeneration of short bio
sm_copy           — "Use as Starting Point" copy from SM
sm_generate       — GPT generation from SM comment (f89b01d fallback)
translate_es_long — Spanish translation
```
[VERIFIED via `SELECT DISTINCT source FROM animal_bios_history`]

#### Distinct `generated_by` values:
```
gpt-4o       — AI-generated content
human        — manual edits
sm_copy      — SM text copy
system       — status changes, generic bios
translation  — Spanish translations
unknown      — legacy/backfill
```
[VERIFIED via `SELECT DISTINCT generated_by FROM animal_bios_history`]

#### Can we distinguish "original shelter-written SM text" from "AI bio we pushed back"?

**Today: No, because there IS no push-back.** But the history table already records enough to determine the provenance of every bio that was generated:

- `source = 'full_generate'` + `generated_by = 'gpt-4o'` → AI-generated from caregiver data
- `source = 'sm_generate'` + `generated_by = 'gpt-4o'` → AI-generated from SM comment
- `source = 'generic'` + `generated_by = 'system'` → template-based
- `source = 'sm_copy'` + `generated_by = 'sm_copy'` → verbatim SM copy (not AI)

**However:** none of these signals live on the bio row itself — they're only in the history table. And crucially, **nothing marks the SM side** (ANIMALCOMMENTS in ShelterManager). If a bio were pushed to SM, the SM field would just contain text with no metadata about its origin.

---

## PART C — WHAT A PROVENANCE GATE WOULD NEED

### C5. What exists vs what's missing

#### Option 1: Stored hash/copy of last-pushed bio text

Compare incoming SM ANIMALCOMMENTS against the last bio text we pushed.

| Component | Exists today? | Notes |
|-----------|--------------|-------|
| The approved bio text in `animal_bios.bio_en_long` | ✅ YES | Available for comparison |
| A "last pushed to SM" copy/hash | ❌ NO | No column tracks what was actually pushed to SM |
| `sm_push_audit` equivalent for bios | ❌ NO | `sm_push_audit` only covers photos (`push_field = 'ANIMALIMAGE'` exclusively) |

**Verdict:** Would require a new column or audit row. However, a simple text comparison (`animal.description === existingBio.bioEnLong` where status is approved) could work WITHOUT new schema — if the push writes the exact approved text, the seed-read could compare incoming SM text against the current approved bio. Fragile if SM normalizes whitespace or HTML. [INFERRED]

#### Option 2: Per-animal "AI bio pushed to SM" flag + timestamp

| Component | Exists today? | Notes |
|-----------|--------------|-------|
| Flag column on `animal_bios` (e.g. `sm_pushed_at`) | ❌ NO | Schema has no such column |
| History `source` value for push (e.g. `'sm_push'`) | ❌ NO | No push has ever occurred |

**Verdict:** Net-new column on `animal_bios` + a new history `source` value. Clean and explicit. The seed-read would check: "does this animal have `sm_pushed_at IS NOT NULL`? If so, refuse SM seed." [INFERRED]

#### Option 3: Consult `generation_source` on the bio row

| Component | Exists today? | Notes |
|-----------|--------------|-------|
| `source` column on `animal_bios` itself | ❌ NO | Only in `animal_bios_history` |
| Latest `source` from history | ✅ YES | Queryable: `SELECT source FROM animal_bios_history WHERE shelter_code = ? ORDER BY generated_at DESC LIMIT 1` |

**Verdict:** Partially exists. The history table records every mutation. But the seed-read would need to JOIN or sub-query the history table to determine if the bio originated from AI — that's queryable today but adds complexity. A denormalized `last_source` column on `animal_bios` would simplify. [INFERRED]

#### Recommended approach (analysis only, not implementing):

**Option 2 (flag + timestamp)** is cleanest because:
1. It explicitly records the act of pushing, not just the content origin
2. It survives manual edits (an AI bio that was hand-edited then pushed still has the flag)
3. The gate logic is a single boolean check, not a text comparison
4. It extends naturally to `sm_push_audit` if bio pushes get the same audit trail as photo pushes

### C6. Code locations the gate must cover

#### Seed-read decision points (where the gate would BLOCK re-seeding):

| # | File:Line | Path | What happens today |
|---|-----------|------|--------------------|
| 1 | `server.ts:2124` | Generate fallback | `else if (animal.description?.trim())` — reads SM as seed when no caregiver data |
| 2 | `server.ts:2193-2196` | Regenerate (once fixed) | Would need same fallback; currently hard-errors. After fix, this becomes a second seed-read point |
| 3 | `server.ts:2049` | sm_copy ("Use as Starting Point") | `animal.description?.trim()` — copies SM text verbatim to draft |

#### Outbound push point (future — does not exist yet):

| # | File:Line | Path | What would happen |
|---|-----------|------|--------------------|
| 4 | N/A (new) | Approve hook or manual push button | Would write approved bio text to SM ANIMALCOMMENTS via `csv_import` with a new CSV header including `ANIMALCOMMENTS` |

#### Display points (informational — gate optional):

| # | File:Line | Path | Notes |
|---|-----------|------|--------------------|
| 5 | `server.ts:1204-1212` | bioStatus badge | Could optionally show 'ai-pushed' instead of 'sm' when SM text is our own output |
| 6 | `dashboard/index.html:7324-7329` | SM Bio section in dashboard | Displays `smData.description`; could show a warning badge if text matches pushed bio |

---

## PART D — CURRENT LOOP RISK

### Bottom line: NO feedback loop is possible today. [VERIFIED]

The loop requires:
1. ✅ AI generates/regenerates a bio (stored in `animal_bios`)
2. ❌ **Approved bio is pushed to SM ANIMALCOMMENTS** ← this step does not exist
3. ❓ SM text re-enters the generator as a seed

Step 2 is completely absent. There is no code — automatic, manual, scheduled, or otherwise — that writes any bio text back to ShelterManager. The `csv_import` path in `shelterManagerPush.ts` only pushes photos (`ANIMALIMAGE`). The approve endpoints only update local `animal_bios` status.

### Does the pending regenerate fix change this answer?

**No.** [VERIFIED] The regenerate fix (adding SM fallback to the regenerate endpoint) would make the regenerate path read from SM ANIMALCOMMENTS — but since nothing writes to SM ANIMALCOMMENTS, there's still no loop. The fix only changes WHERE the regenerate endpoint can source seed text from, not whether a loop exists.

### When would the loop become possible?

The loop becomes a real risk the moment an outbound "push approved bio to SM" feature is built. At that point:

1. AI generates bio from SM comment → bio approved → pushed to SM ANIMALCOMMENTS
2. SM cache refreshes → `animal.description` now contains AI-generated text
3. If the bio is later deleted or regenerated, the SM fallback at line 2124 would seed from the AI's own previous output
4. The `sm_copy` path (line 2049, "Use as Starting Point") would show AI-generated text as if it were a shelter-written SM comment

This is exactly the scenario the provenance gate is designed to prevent.

### Additional loop vector to watch:

The **generic bio job** (`renderGenericBios`, line 11199) writes template-based bios directly to `animal_bios` with `source = 'generic'` and status `approved`. If an SM push were added globally (push all approved bios), generic bios would also land in SM, and their template text ("Come visit [name] at Four Legs Good!") could re-enter as SM seeds. The gate should cover all `source` types, not just `full_generate` / `sm_generate`.

---

## Summary Table

| Question | Answer | Tag |
|----------|--------|-----|
| Does an outbound bio→SM push exist? | No — only photos are pushed | [VERIFIED] |
| Can a feedback loop occur today? | No — Step 2 (push to SM) is missing | [VERIFIED] |
| Does the regenerate fix create a loop? | No — it only adds a read path, not a write | [VERIFIED] |
| Is provenance data available for a gate? | Partial — history table has `source`/`generated_by`, but no column on the bio row or SM side | [VERIFIED] |
| What's missing for a gate? | A flag/timestamp on `animal_bios` recording "this bio was pushed to SM", and gate checks at lines 2124, 2049, and (future) 2193 | [VERIFIED] |
| How many code points need the gate? | 3 seed-read points + 1 future push point + 2 optional display points | [VERIFIED] |

---

*Report generated by Rover. Read-only diagnosis — no changes made.*
