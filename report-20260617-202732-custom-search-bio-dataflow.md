# Custom-Search App — Bio Data Flow & Break Check — 2026-06-17

## TASK 1 — App Location & Backend

**Frontend:** `/home/shelter/shelter-apps/custom-search/` (app.js, index.html, styles.css, videos/) [VERIFIED]

**Caddy routing:** `custom-search.4lgshelterapp.duckdns.org` → non-API paths rewritten to `/custom-search{uri}` and proxied to `localhost:3000`; API paths proxied directly to `localhost:3000`. [VERIFIED — /etc/caddy/Caddyfile]

**Backend endpoint:** `POST /api/matcher/custom-search` (server.ts:4282) [VERIFIED]

**Secondary endpoint used by popup:** `GET /api/photos/:shelter_code` (gallery thumbnails for the detail popup) [VERIFIED — app.js loadPopupGallery function]

---

## TASK 2 — Text/Bio Data Flow

The custom-search displays these text fields per animal:

### 2A. Result card bio (`match.bio`) — AI-generated at request time

**Source:** Generated live by Claude Sonnet 4.6 via Anthropic API at each search request. NOT read from any database table.

**server.ts:4694–4706** — The API call:
```ts
const apiBody = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  temperature: 0.7,
  system: systemMessage,
  messages: [{ role: 'user', content: userMessage }],
});
```

**What feeds the AI prompt (server.ts:4441–4472):**
The `shortlistEntries` are built from:
- `animal.shelterCode`, `animal.name`, `animal.species`, `animal.breed`, `animal.age`, `animal.sex`, `animal.color`, `animal.fivStatus`, `animal.felvStatus` — all from SM API via `fetchAnimals()` (shelterManagerService.ts)
- **Caregiver transcripts** from `getBehaviorRecords(animal.shelterCode)` — reads `behavior_notes` table (localDatabase.ts:959):

```ts
// server.ts:4460-4470
const records = getBehaviorRecords(animal.shelterCode);
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

**CRITICAL GATE:** Only animals with `getBehaviorNotesCount(a.shelterCode) > 0` are candidates (server.ts:4423):
```ts
let withRecords = filtered.filter(a => getBehaviorNotesCount(a.shelterCode) > 0);
```
This reads `behavior_notes` table (localDatabase.ts:1224):
```ts
export function getBehaviorNotesCount(animalId: string): number {
  const database = getDatabase();
  const stmt = database.prepare(`SELECT COUNT(*) as count FROM behavior_notes WHERE shelter_code = ?`);
  const result = stmt.get(animalId) as { count: number };
  return result.count;
}
```

Animals WITHOUT caregiver behavior_notes records are excluded entirely — they never reach the AI prompt, regardless of whether they have SM descriptions, generic bios, or bio drafts. [VERIFIED]

### 2B. Popup bio (`match.bio_en_long` / `match.bio_es_long`) — from animal_bios table

**server.ts:4780–4787** — After the AI response, the endpoint enriches each match with pre-existing approved bios:
```ts
// Generic bio from animal_bios (separate from AI-personalized bio)
const animalBio = getAnimalBio(m.shelter_code);
const bioEnLong = (animalBio && animalBio.statusLong === 'approved' && animalBio.bioEnLong)
  ? animalBio.bioEnLong : null;
const bioEnShort = (animalBio && animalBio.statusShort === 'approved' && animalBio.bioEnShort)
  ? animalBio.bioEnShort : null;
const bioEsLong = (animalBio && animalBio.statusLong === 'approved' && animalBio.bioEsLong)
  ? animalBio.bioEsLong : null;
const bioEsShort = (animalBio && animalBio.statusShort === 'approved' && animalBio.bioEsShort)
  ? animalBio.bioEsShort : null;
```

These are returned alongside the AI bio. The frontend popup uses them (app.js:452–454):
```js
const bioText = currentLang === 'es'
  ? (match.bio_es_long || match.bio_en_long || match.bio || i18n('popup.default_bio'))
  : (match.bio_en_long || match.bio || i18n('popup.default_bio'));
```

**Popup bio fallback chain:**
- ES: `bio_es_long` → `bio_en_long` → AI-generated `bio` → default string
- EN: `bio_en_long` → AI-generated `bio` → default string

**`getAnimalBio`** reads from `animal_bios` table (localDatabase.ts:1476–1484):
```ts
export function getAnimalBio(shelterCode: string): AnimalBio | null {
  const database = getDatabase();
  const stmt = database.prepare(`SELECT * FROM animal_bios WHERE shelter_code = ?`);
  const row = stmt.get(shelterCode) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToAnimalBio(row);
}
```

Only approved bios from `animal_bios` are surfaced (the `statusLong === 'approved'` guard). `animal_bio_drafts` is NOT read. [VERIFIED]

### 2C. Other text fields

| Field | Source | Evidence |
|-------|--------|----------|
| `name` | SM API via `fetchAnimals()` | server.ts:4792 |
| `sex` | SM API | server.ts:4793 |
| `age` | SM API | server.ts:4794 |
| `breed` | SM API | server.ts:4795 |

### 2D. Summary of data sources

| Source | Used by custom-search? | How |
|--------|----------------------|-----|
| `behavior_notes` table | **YES** — gate + AI prompt seed | Candidacy filter + caregiver transcripts |
| `animal_bios` table | **YES** — popup bio (approved only) | `getAnimalBio()`, `statusLong === 'approved'` guard |
| `animal_bio_drafts` table | **NO** | Not referenced |
| SM API (live) | **YES** — animal attributes | Via `fetchAnimals()` (15-min cache) |
| SM `ANIMALCOMMENTS`/description | **NO** — not in custom-search prompt | Only `behavior_notes` transcripts feed the AI |
| Profile/caregiver tables beyond `behavior_notes` | **NO** | No other local tables queried for text |
| Runtime AI generation | **YES** — personalized bio per search | Claude Sonnet 4.6 call |
| `animal_metadata` | **YES** — adoption_pending, bonded_pair flags | server.ts:4771–4778 |
| `animal_media` | **YES** — video URLs | server.ts:4786–4790 |

---

## TASK 3 — Break Check

The custom-search endpoint depends on these specific functions/tables. For each, I checked whether recent commits (May-June 2026) changed them:

### 3A. `getBehaviorNotesCount()` (localDatabase.ts:1224)
**No changes.** Function signature and query unchanged. The `behavior_notes` table had a `source` column added (commit 55b5527) but no schema break — new column is additive, existing SELECT COUNT(*) unaffected. [VERIFIED]

### 3B. `getBehaviorRecords()` (localDatabase.ts:959)
**No changes to function.** Same `SELECT * FROM behavior_notes WHERE shelter_code = ?` query. The additional `source` column comes back in the result but is unused by custom-search (it only reads `caregiver`, `recordedAt`, `rawTranscript`). [VERIFIED]

### 3C. `getAnimalBio()` (localDatabase.ts:1476)
**No changes to function.** Same `SELECT * FROM animal_bios WHERE shelter_code = ?`. New columns added to `animal_bios` (`source_long`, `source_short` via commit 11eae61) are additive — they appear in the result but the custom-search code only reads `statusLong`, `bioEnLong`, `bioEnShort`, `bioEsLong`, `bioEsShort`. [VERIFIED]

### 3D. `animal_bios` table
Schema changes were additive only:
- `source_long`, `source_short` columns added (11eae61)
- `last_source` column added (25acf84)
No columns renamed, removed, or type-changed. Existing reads unaffected. [VERIFIED]

### 3E. `fetchAnimals()` / SM API
**No changes** to shelterManagerService.ts in recent commits. [VERIFIED via `git log --since="2026-05-01" -- server/src/shelterManagerService.ts` returning empty]

### 3F. `animal_metadata` table
New columns `adoption_pending` and `bonded_pair` added (commits bada172, acacb1d). The custom-search endpoint was updated to read these (server.ts:4771–4778) — this was an intentional enrichment, not a break. [VERIFIED]

### 3G. Bio pipeline write-path changes
The major bio rework (dual-state model, drafts, generic jobs) changed WRITE paths:
- New bios now go to `animal_bio_drafts` first, then get promoted to `animal_bios`
- `sm_generate` and `sm_copy` now write to `animal_bio_drafts` (commit 6b351b5)
- `runGenericBioJob` writes generics to `animal_bio_drafts` (commit e586a89)

**Impact on custom-search:** The custom-search reads from `animal_bios` with `statusLong === 'approved'` guard. New bios that haven't been promoted from `animal_bio_drafts` to `animal_bios` will NOT appear in the popup. This is **by design** (drafts need approval before public display), NOT a break. Previously-approved bios in `animal_bios` remain there and continue to be read correctly. [VERIFIED]

### BREAK CHECK VERDICT

**No breaks found.** All functions and tables the custom-search depends on have stable interfaces. Schema changes were additive (new columns). Write-path changes affect where new bios are stored initially (drafts) but don't break the read path (which reads `animal_bios` for approved content). [VERIFIED]

---

## TASK 4 — Enrichment Opportunity

### 4A. Generic youth bios
**Surfaced today: CONDITIONAL.** Youth generics are written to `animal_bio_drafts` first. If promoted (approved) to `animal_bios`, they surface in the popup via `getAnimalBio()` → `bio_en_long`/`bio_es_long`. If still pending in `animal_bio_drafts`, they do NOT surface. [VERIFIED]

However, the youth bio is a popup-only fallback — even when surfaced, it can't make an animal a custom-search CANDIDATE because the candidacy gate requires `behavior_notes` records (server.ts:4423). An animal with only a youth generic bio but no caregiver notes is invisible to custom-search. [VERIFIED]

**Integration point to surface drafts:** server.ts:4780 — after `getAnimalBio()`, add a fallback to `getAnimalBioDraft()` (localDatabase.ts:1691) for animals without an approved bio. Would surface pending youth generics in the popup.

**Integration point to broaden candidacy:** server.ts:4423 — relax the `getBehaviorNotesCount > 0` gate to also include animals with approved bios or SM descriptions. This is the fundamental architectural constraint — custom-search was designed as a caregiver-profile-driven matching tool.

### 4B. Generic adult/intake generics
**Surfaced today: CONDITIONAL** — same as youth generics. Written to `animal_bio_drafts`; surfaced in popup only if promoted to `animal_bios`. Same candidacy gate limitation. [VERIFIED]

**Integration points:** Same as 4A above.

### 4C. SM-comment-seeded AI bios (sm_generate)
**Surfaced today: CONDITIONAL** — same pattern. `sm_generate` bios are written to `animal_bio_drafts` (commit 6b351b5). If promoted, they surface via `getAnimalBio()`. If pending, they don't.

**Note:** The SM description (`ANIMALCOMMENTS`) is NOT used as AI prompt input for custom-search. The custom-search AI prompt uses only `behavior_notes` transcripts. Even if an animal has a rich SM description, if it has zero behavior_notes records, custom-search will never show it. [VERIFIED — server.ts:4460-4470 builds transcript exclusively from `getBehaviorRecords()`]

**Integration points:** Same as 4A/4B for popup display. For the AI prompt, the SM description could be added as a fallback transcript source at server.ts:4456–4472 (the shortlist entry builder), alongside or instead of the `behavior_notes` gate at server.ts:4423.

### Enrichment summary table

| Bio source | In popup today? | In AI prompt today? | Candidacy gate bypass? |
|------------|----------------|--------------------|-----------------------|
| Generic youth | Only if promoted to `animal_bios` | No | No — needs `behavior_notes` |
| Generic adult/intake | Only if promoted to `animal_bios` | No | No — needs `behavior_notes` |
| SM-seeded AI bio | Only if promoted to `animal_bios` | No | No — needs `behavior_notes` |
| Caregiver transcripts | N/A (not a bio) | **Yes** — sole prompt source | **Yes** — this IS the gate |
| SM description | No (not read) | No | No |

**The fundamental architectural constraint is the `behavior_notes` candidacy gate at server.ts:4423.** All three newer bio sources (youth generics, adult generics, SM-seeded) are irrelevant to candidacy — an animal must have caregiver behavior_notes to appear in custom-search results at all. The bios only affect the popup display for animals that already passed this gate.

---

## Conclusions

1. **No breaks from the bio rework.** All custom-search dependencies are stable. Schema changes were additive. Write-path changes (drafts-first model) don't affect the approved-bio read path. [VERIFIED]

2. **The custom-search is a caregiver-profile-only tool.** It exclusively uses `behavior_notes` records as both the candidacy gate (must have ≥1 record to be a candidate) and the AI prompt source (last 3 transcripts). SM descriptions, generic bios, and SM-seeded bios have no role in candidacy or the AI prompt. [VERIFIED]

3. **Popup bio enrichment is limited.** Approved bios from `animal_bios` surface in the detail popup but only as a secondary display alongside the AI-generated personalized bio. Drafts in `animal_bio_drafts` do not surface. [VERIFIED]

4. **Broadening custom-search to include animals without caregiver notes** would require relaxing the gate at server.ts:4423 and providing an alternative transcript source (SM description, approved bio text, or other) for the AI prompt at server.ts:4456–4472. This is a design decision, not a bug fix.
