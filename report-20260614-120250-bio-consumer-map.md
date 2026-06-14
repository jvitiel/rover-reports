# Bio Text Consumer Map + Custom-Search Searcher Trace

**Date:** 2026-06-14 12:02 ET  
**Type:** Read-only consumer map for consolidation de-risking  
**Status:** No changes made  

---

## PART 1 — LONG vs SHORT BIO CONSUMERS

### 1a. Complete consumer table

Every read of bio text across the codebase:

#### Server-side bio resolution (Fallback Sites)

| # | File:Line | Endpoint | Long | Short | Both ES | Fallback Site | Notes |
|---|-----------|----------|------|-------|---------|---------------|-------|
| 1 | server.ts:927-937 | `GET /api/animals` (list) | ✅ `bioEnLong` | ✅ `bioEnShort` | ✅ | **Site 1** (approved → SM → empty) | Feeds matcher-web, coordinator-pwa |
| 2 | server.ts:998-1014 | `GET /api/animals/:id` (single) | ✅ `displayBio` (long only) | ✅ via bio obj | ✅ | **Site 2** (approved → SM → empty) | Feeds detail views |
| 3 | server.ts:2586-2606 | Featured-slot enrichment (internal fn) | ✅ `bioEnLong` | ✅ `bioEnShort` | ✅ | **Site 3** (approved → SM → stock placeholder) | Feeds `GET /api/featured-slots`, WordPress |
| 4 | server.ts:4668-4671 | Custom-search response builder | ✅ `bioEnLong` | ✅ `bioEnShort` | ✅ | **None** — reads `animal_bios` directly, null if not approved | Attached to custom-search matches |

#### Server-side bio direct reads (no fallback)

| # | File:Line | Endpoint | Long | Short | Both ES | Fallback Site | Notes |
|---|-----------|----------|------|-------|---------|---------------|-------|
| 5 | server.ts:2455-2482 | `GET /api/bios/approved` | ✅ | ✅ | ✅ | **None** — reads `animal_bios` directly | WordPress integration: all approved bios |
| 6 | server.ts:2495-2523 | `GET /api/bios/:animalId` | ✅ | ✅ | ✅ | **None** — reads `animal_bios` directly | WordPress: single bio |
| 7 | server.ts:1202-1212 | Dashboard `bioStatus` calc | Neither | Neither | — | — | Checks status only, not text |
| 8 | server.ts:1235 | Dashboard `bio: fullBio` | ✅ | ✅ | ✅ | **None** — sends raw `animal_bios` to dashboard | Dashboard bio generator UI |

#### Client-side bio rendering

| # | File:Line | App / Surface | Long | Short | Reads via | Notes |
|---|-----------|--------------|------|-------|-----------|-------|
| 9 | dashboard/index.html:7459 | Dashboard bio generator textarea (long EN) | ✅ | — | bio obj from dashboard endpoint (#8) | Edit/approve UI |
| 10 | dashboard/index.html:7484 | Dashboard bio generator textarea (short EN) | — | ✅ | bio obj from dashboard endpoint (#8) | Edit/approve UI |
| 11 | dashboard/index.html:7464-7490 | Dashboard bio generator textarea (ES long + short) | ✅ ES | ✅ ES | bio obj | Edit/approve UI |
| 12 | custom-search/app.js:442 | Custom-search result card | — | — | `match.bio` (AI-generated per-adopter) | NOT from animal_bios |
| 13 | custom-search/app.js:516-519 | Custom-search popup detail | ✅ | — | `match.bio_en_long` → `match.bio` fallback | Uses long in popup, AI bio on card |
| 14 | matcher-web/app.js:897-932 | Matcher card (small metrics card) | — | — | Structured fields only | **No bio text on card** |
| 15 | matcher-web/app.js:968-971 | Matcher modal detail | ✅ | — | `animal.bio_en_long` → `animal.description` fallback | Uses long only |
| 16 | coordinator-pwa/app.js:324 | Coordinator modal | — | — | `animal.description` (= displayBio from #1) | Uses `description` field (which IS the long bio if approved, per Site 1) |
| 17 | staff-pwa/app.js:3854 | Staff PWA modal | — | — | `animal.description` | Same as coordinator |
| 18 | staging-staff/app.js:3854 | Staging staff modal | — | — | `animal.description` | Same as coordinator |

[ALL VERIFIED]

#### Apps that do NOT consume bio text at all:

| App | Confirmed |
|-----|-----------|
| volunteer-pwa | ✅ No bio/description references [VERIFIED] |
| dogwalker-pwa | ✅ No bio/description references [VERIFIED] |
| caregiver-pwa | ✅ No bio/description references [VERIFIED] |
| staff-pwa (except modal) | ✅ `/api/staff/animal/:id` returns no bio fields [VERIFIED] |

### 1b. Featured Six + Matcher card specifics

**Featured Six (WordPress homepage):**
- Endpoint: `GET /api/featured-slots` (server.ts:2645) → calls enrichment fn at ~2580
- Returns: `bio_en_short`, `bio_en_long`, `bio_es_short`, `bio_es_long` per slot
- Fallback: **Site 3** — approved → SM → stock placeholder ("To meet [name], please visit Four Legs Good Animal Rescue.")
- WordPress card uses **short** bio; detail click shows **long** bio [INFERRED from field naming convention; actual WP template not in this codebase]

**Matcher card (matcher-web):**
- The small metrics card at matcher-web/app.js:897–932 renders ONLY structured fields:
  - Sex, Age, Color, Good-with (cats/dogs/kids), Energy, Special Needs
  - **No bio text whatsoever** on the card
- Bio text appears only in the detail modal (line 968–971): uses `bio_en_long` → `description` → default
- Data source: `GET /api/animals` (Site 1)

[VERIFIED — pasted card render code shows only structured `detail-row` elements]

### 1c. Which consumers use which fallback site

| Fallback Site | Consumers affected | Chain |
|---------------|-------------------|-------|
| **Site 1** (server.ts:927–937) | Matcher-web modal (#15), coordinator-pwa (#16), staff-pwa (#17), staging-staff (#18) | approved → SM → empty |
| **Site 2** (server.ts:998–1000) | Single-animal detail views via `/api/animals/:id` (#2) | approved → SM → empty |
| **Site 3** (server.ts:2586–2606) | WordPress featured slots (#3), custom-search response (#4 partially — it attaches these but also has AI bio) | approved → SM → stock placeholder |
| **None (direct)** | Dashboard bio generator (#8,9,10,11), WordPress bio endpoints (#5,6), custom-search card AI bio (#12), custom-search response bio fields (#4) | Read `animal_bios` raw — no fallback |

**Track A unification of the fallback chain would directly affect Sites 1, 2, and 3 — and all their consumers.** The "None (direct)" consumers would NOT be affected by fallback unification. [VERIFIED]

---

## PART 2 — THE ON-THE-FLY SEARCHER (custom-search)

### 2d. Handler location and prompt

**Handler:** `POST /api/matcher/custom-search` at server.ts:4170–4720+

The handler:
1. Validates inputs (sex, ageGroup, narrative)
2. Runs content filter
3. Fetches adoptable cats via `fetchAnimals()`
4. Hard-filters by sex + age
5. **Filters to ONLY cats with behavior records** (`getBehaviorNotesCount() > 0`)
6. Builds shortlist with caregiver transcripts
7. Sends to Claude Sonnet for per-adopter bio generation
8. Attaches approved `animal_bios` fields to the response

### 2e. Source text for each animal

The searcher uses **caregiver transcripts (behavior_notes)** as its primary content, NOT animal_bios and NOT SM ANIMALCOMMENTS.

Source-fetch lines (server.ts:4349–4363):

```typescript
// server.ts:4349-4363 — inside the shortlist builder loop
const records = getBehaviorRecords(animal.shelterCode);
// getBehaviorRecords returns oldest-first (ASC); we want most-recent-first for display
const recentRecords = [...records].reverse().slice(0, 3);
if (recentRecords.length > 0) {
  lines.push('');
  lines.push('Caregiver transcripts (most recent first):');
  for (const rec of recentRecords) {
    const caregiver = rec.caregiver || 'Unknown';
    const date = (rec.recordedAt || '').slice(0, 10);
    lines.push(`--- ${caregiver}, ${date} ---`);
    lines.push(rec.rawTranscript || '(no transcript)');
  }
}
```

It calls `getBehaviorRecords()` (localDatabase.ts:868) which queries the `behavior_notes` table directly — NOT `getBehaviorNotes()` (the merged view), and NOT `animal_bios` or `animal.description` (SM ANIMALCOMMENTS).

The shortlist per animal sent to the AI includes:
- Structured fields: shelter_code, name, species, breed, age, sex, color, FIV, FeLV
- Caregiver transcripts: last 3 raw transcripts from `behavior_notes`
- **Does NOT include:** SM ANIMALCOMMENTS, approved bios, any bio text

[VERIFIED — the `shortlistEntries` builder at lines 4336–4363 only adds structured fields and `getBehaviorRecords()` transcripts]

**However:** the response-builder at lines 4668–4671 ALSO attaches the approved `animal_bios` fields:

```typescript
// server.ts:4668-4671
const animalBio = getAnimalBio(m.shelter_code);
const bioEnLong = (animalBio && animalBio.statusLong === 'approved' && animalBio.bioEnLong)
  ? animalBio.bioEnLong : null;
const bioEnShort = (animalBio && animalBio.statusShort === 'approved' && animalBio.bioEnShort)
  ? animalBio.bioEnShort : null;
```

These are sent alongside the AI-generated `bio` field so the client can show the pre-approved bio in the detail popup (custom-search/app.js:516–519 uses `bio_en_long` as first choice, falling back to the AI `bio`). But they are NOT used as input to the AI prompt. [VERIFIED]

### 2f. What happens with NO caregiver profile?

**Animals without behavior_notes are EXCLUDED entirely.** They never reach the AI.

The hard gate is at server.ts:4300:

```typescript
let withRecords = filtered.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
```

If fewer than 3 candidates survive, a fallback drops the age filter but KEEPS the behavior-records requirement (line 4309):

```typescript
const fallbackWithRecords = sameSexAllAges.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
```

If ZERO cats of the requested sex have behavior records, the endpoint returns an empty matches array with a "No cats match" message (lines 4312–4318):

```typescript
if (fallbackWithRecords.length === 0) {
  audit.candidateCount = 0;
  audit.status = 'failure_no_candidates';
  res.json({ matches: [], message: errStrings.noMatches });
  return;
}
```

**The searcher has the SAME no-content gap as generate/regenerate had before f89b01d** — it hard-requires caregiver profiles and has no SM-comment fallback. An animal with rich SM ANIMALCOMMENTS but no behavior_notes will never appear in search results. [VERIFIED]

### 2g. Shared code the searcher touches

| Shared function | Used by searcher? | What Track A changes |
|----------------|-------------------|---------------------|
| `getBehaviorNotes()` | ❌ NO — uses `getBehaviorNotesCount()` + `getBehaviorRecords()` | Track A doesn't touch these |
| `getBehaviorNotesCount()` | ✅ YES — candidacy gate (line 4300) | Track A doesn't touch this |
| `getBehaviorRecords()` | ✅ YES — transcript builder (line 4349) | Track A doesn't touch this |
| `getAnimalBio()` | ✅ YES — response enrichment only (line 4668) | Track A doesn't touch this |
| `fetchAnimals()` | ✅ YES — animal list source (line 4289) | Track A doesn't touch this |
| Fallback chain (Sites 1/2/3) | ❌ NO | Searcher builds its own response, doesn't use the fallback chain |
| `generateAnimalBio()` / `regenerateSingleBio()` | ❌ NO | Searcher uses Sonnet directly with its own prompt |
| `hasRealStaffContent()` (future) | ❌ NO — not centralized yet | Would need explicit wiring |
| Species classifier (`matchesSpeciesFilter`) | ❌ NO — searcher is cats-only | N/A |

**The searcher is an island.** It does not call any of the bio fallback functions, the bio generator, or the species classifier. It has its own independent Sonnet prompt pipeline fed directly from `behavior_notes`. Track A changes to the fallback chain or species classifier will NOT reach the searcher automatically. [VERIFIED]

---

## PART 3 — IMPACT FLAGS

### 3h. Consumers whose output would change under unified fallback

The unified chain target: **approved real bio → staff SM comment → age-appropriate generic**

Current chains for comparison:
- Site 1: approved → SM → empty
- Site 2: approved → SM → empty
- Site 3: approved → SM → stock placeholder

| Consumer | Current output (no-bio case) | New output | Change type |
|----------|---------------------------|------------|-------------|
| **Matcher-web modal** (#15, via Site 1) | SM description or empty string | SM comment or age-appropriate generic | ✅ **Intentional improvement** — generics replace blanks |
| **Coordinator-pwa modal** (#16, via Site 1) | SM description or empty → "No description available." | SM comment or generic | ✅ **Intentional improvement** |
| **Staff-pwa modal** (#17, via Site 1) | SM description or empty → "No description available." | SM comment or generic | ✅ **Intentional improvement** |
| **Staging-staff modal** (#18, via Site 1) | Same as staff-pwa | Same improvement | ✅ **Intentional improvement** |
| **Single animal API** (#2, via Site 2) | SM description or empty | SM comment or generic | ✅ **Intentional improvement** |
| **Featured slots / WordPress** (#3, via Site 3) | SM description or stock placeholder | SM comment or generic (replaces stock text) | ✅ **Intentional improvement** — richer placeholder for animals on homepage |
| **Dashboard bio generator** (#8-11) | Raw `animal_bios` content | **NO CHANGE** — reads bios directly | ⬜ Not affected |
| **WordPress bio endpoints** (#5-6) | Raw approved bios | **NO CHANGE** — reads bios directly | ⬜ Not affected |
| **Custom-search card** (#12) | AI-generated per-adopter bio | **NO CHANGE** — AI generates fresh | ⬜ Not affected |
| **Custom-search popup** (#13) | `bio_en_long` (approved) → AI bio → default | **NO CHANGE** — reads `animal_bios` directly, not via fallback chain | ⬜ Not affected |

**Additional change from generic-vs-real distinction:**
If the unified chain distinguishes generic from real in the "approved" check (only real approved bios count as "approved"), then animals currently showing an auto-approved generic bio via Sites 1/2 would instead show the generic text via the NEW generic fallback tier. The TEXT would be the same generic content, but the PATH would be different. **No visible output change, but the code path changes.** [INFERRED]

**No unexpected changes identified.** All output changes are intentional improvements — replacing empty strings or stock placeholder text with age-appropriate generics. [VERIFIED]

### 3i. Searcher wiring

**The searcher would need EXPLICIT wiring to gain SM-comment/generic fallback.** [VERIFIED]

Currently:
- The searcher's candidacy gate (`getBehaviorNotesCount() > 0`) excludes ALL animals without caregiver profiles
- It does not check SM ANIMALCOMMENTS or `animal_bios`
- It does not call any fallback function

To include animals with SM comments but no caregiver data, the searcher would need:
1. The candidacy gate broadened: `getBehaviorNotesCount(sc) > 0 || hasRealStaffContent(animal)` (or equivalent)
2. The shortlist builder modified to use SM ANIMALCOMMENTS as transcript when no behavior_notes exist
3. No change needed for the response builder — it already reads `animal_bios` for the bio fields

The future `hasRealStaffContent()` predicate would be the natural integration point, but the searcher does NOT inherit it automatically — it must be explicitly wired. [VERIFIED]

---

## Summary Table

| Surface | Long | Short | AI bio | Fallback site | Affected by Track A? |
|---------|------|-------|--------|---------------|---------------------|
| Dashboard bio generator | ✅ | ✅ | — | None (direct) | ❌ |
| WordPress featured-slots | ✅ | ✅ | — | Site 3 | ✅ (generic replaces stock) |
| WordPress bio endpoints | ✅ | ✅ | — | None (direct) | ❌ |
| Matcher-web card | — | — | — | — | ❌ (no bio on card) |
| Matcher-web modal | ✅ | — | — | Site 1 | ✅ (generic replaces empty) |
| Custom-search card | — | — | ✅ | — | ❌ (AI bio) |
| Custom-search popup | ✅ | — | ✅ fallback | None (direct read) | ❌ |
| Coordinator modal | ✅* | — | — | Site 1 | ✅ (generic replaces empty) |
| Staff/staging modal | ✅* | — | — | Site 1 | ✅ (generic replaces empty) |
| Volunteer / dogwalker | — | — | — | — | ❌ (no bio) |
| Custom-search candidacy | — | — | — | — | ❌ (island — needs explicit wiring) |

*via `description` field which carries the long bio when approved

---

*Report generated by Rover. Read-only map — no changes made.*
