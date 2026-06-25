# SM Auto-Gen Final Design — Fetch-on-Expand + Server-Side Trigger + Self-Update

**Date:** 2026-06-25  
**Type:** Read-only design mapping  
**Status:** Complete build plan — three pieces, no new endpoint, no DB change

---

## 1. Fetch-on-Expand

### Current: toggleCard is CSS-only

```js
// dashboard/index.html:7980-8001
function toggleCard(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  card.classList.toggle('expanded');
  card.classList.remove('library-only');
  const icon = card.querySelector('.expand-icon');
  icon.textContent = card.classList.contains('expanded') ? '−' : '+';
  // ... library reset on collapse ...
}
```

### Change: on expand, call loadBioForAnimal with forceRefresh

```js
// In toggleCard, after toggling .expanded:
if (card.classList.contains('expanded')) {
  loadBioForAnimal(animalId, true);  // forceRefresh → per-animal fetch
}
```

### loadBioForAnimal with forceRefresh=true

```js
// dashboard/index.html:7778-7797
async function loadBioForAnimal(animalId, forceRefresh = false) {
  if (!forceRefresh && bioCache.has(animalId)) {
    renderBioContent(animalId, bioCache.get(animalId));
    return;
  }
  try {
    const shelterCode = getShelterCodeForBio(animalId);
    const response = await fetch(`${API_BASE}/bio/${shelterCode}`);
    const result = await response.json();
    if (result.success && (result.data || result.draft)) {
      bioCache.set(animalId, { data: result.data, draft: result.draft || null });
      renderBioContent(animalId, bioCache.get(animalId));
    }
  } catch (error) { ... }
}
```

With `forceRefresh=true`, this bypasses bioCache, fetches `GET /api/bio/:shelterCode` (server.ts:2276), updates bioCache, and re-renders. **If a from_sm draft already exists in the DB, it shows immediately on expand.** No generation needed — just display.

---

## 2. Generate-on-Expand Trigger + Guardrail

### The predicate — server-side, in `GET /api/bio/:animalId`

The `GET /api/bio/:animalId` endpoint (server.ts:2276) currently just reads and returns data. We add: after reading bio + draft, evaluate the generate-on-expand predicate. If true, fire `generateBioDraftForAnimal` in the background.

**The four clauses:**

```ts
// All available in server.ts scope:
const animal = await getAnimalById(animalId, true);
const bio = getAnimalBio(animalId);
const draft = getAnimalBioDraft(animalId);

// Clause 1: Meaningful SM comment exists
const hasSMComment = !!animal && hasMeaningfulSMComment(animal.description);
// hasMeaningfulSMComment (server.ts:13173): rejects '', 'not specified', 'unknown', 'n/a', 'none specified'

// Clause 2: No caregiver profile (profile-save trigger owns those)
const hasProfile = getBehaviorNotesCount(animalId) > 0;
// getBehaviorNotesCount (localDatabase.ts:1331)

// Clause 3: No real (non-generic) draft exists — THE GUARDRAIL
const hasRealDraft = !!draft && (
  draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm' ||
  draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'
);
// draft.sourceLong / draft.sourceShort — the origin-vocabulary fields on animal_bio_drafts

// Clause 4: Current bio is generic or absent
const isGenericOrAbsent = !bio || isGenericSource(bio.lastSource);
// isGenericSource (server.ts:2665): lastSource === 'generic' || lastSource === 'generic_adult'

const shouldAutoGen = hasSMComment && !hasProfile && !hasRealDraft && isGenericOrAbsent;
```

### The guardrail in detail — "no real draft" ≠ "unapproved"

| Animal state | hasRealDraft | shouldAutoGen | Behavior |
|---|---|---|---|
| Generic bio, SM comment, no draft at all | false | ✅ true | Fire generation |
| Generic bio, SM comment, draft with sourceLong=null (generic draft) | false | ✅ true | Fire generation |
| Generic bio, SM comment, draft with sourceLong='from_sm' UNAPPROVED | **true** | ❌ false | **Display only** |
| From_sm bio, approved | true | false | Display only |
| From_profile draft exists | true | false | Display only |
| No SM comment | — | false (clause 1) | Display only |
| Has profile | — | false (clause 2) | Display only |

**The draft.sourceLong/sourceShort fields (from `animal_bio_drafts.source_long`/`source_short`)** are the discriminator between "no AI draft yet" and "AI draft exists but is unapproved." They are the permanent off-switch — once `generateBioDraftForAnimal` writes a `from_sm` draft (via `saveAnimalBioDraft` with `source: 'sm_generate'`, mapped to origin `'from_sm'` by `mapSourceToOrigin`), `hasRealDraft` becomes true and `shouldAutoGen` is false forever after. Approval status (`promotedLong`/`promotedShort`, `statusLong`/`statusShort`) is **never checked** — an unapproved AI draft is still a real draft.

---

## 3. Client vs Server — Server-Side Trigger (Recommended)

### Why server-side

The `GET /api/bio/:animalId` endpoint runs in `server.ts` where ALL predicate inputs are available:

| Input | Server access | Client access |
|---|---|---|
| SM comment (animal.description) | ✅ `getAnimalById(animalId)` — fetches from SM | ❌ Not in bio response; in `animal.smData.description` from bulk load (stale) |
| Profile count | ✅ `getBehaviorNotesCount(animalId)` (localDatabase.ts:1331) | ⚠️ `animal.hasCaregiverData` in bulk load (stale, boolean only) |
| Draft source fields | ✅ `getAnimalBioDraft(animalId)` — live DB read | ⚠️ In the bio fetch response, but only if we add them |
| Bio lastSource | ✅ `getAnimalBio(animalId)` — live DB read | ⚠️ In the bio fetch response's `data.lastSource` |
| `generateBioDraftForAnimal` | ✅ Same file (server.ts:2126) | ❌ Would need a separate POST call |
| `bioGenerationInFlight` Set | ✅ Module-level (server.ts:2122) | ❌ N/A |

The client could evaluate a partial predicate but would need a second POST call to trigger generation. The server has everything — authoritative, real-time data + the generation function + the dedup Set.

### Implementation in `GET /api/bio/:animalId` (server.ts:2276)

After reading bio + draft and before sending the response:

```ts
// Evaluate generate-on-expand predicate
// Async — runs in background, does NOT delay the response
if (shouldAutoGen && !bioGenerationInFlight.has(animalId)) {
  bioGenerationInFlight.add(animalId);
  generateBioDraftForAnimal(animalId)
    .then(draft => {
      if (draft) console.log(`[sm-auto-gen] expand-triggered draft for ${animalId} (source: ${draft.lastSource})`);
    })
    .catch(err => console.error(`[sm-auto-gen] expand-triggered generation failed for ${animalId}:`, err))
    .finally(() => bioGenerationInFlight.delete(animalId));
}

// Response sent immediately with current (generic) data — NOT blocked by generation
res.json({ success: true, data: bio || null, draft: draft || null, generating: shouldAutoGen });
```

Note the `generating: true` flag in the response — the client uses this to know it should schedule a delayed re-fetch.

### Cost of adding getAnimalById to the bio endpoint

Currently `GET /api/bio/:animalId` only reads from the local SQLite DB (fast). Adding the predicate requires `getAnimalById(animalId, true)` which calls the SM API (cached, but heavier). This is acceptable because:
- It fires only on expand (one animal at a time, user-initiated)
- The SM API response is cached (`fetchAnimals` cache) — `getAnimalById` reads from cache when available
- It's the same call the existing regenerate endpoint already makes (server.ts:2214)

Alternatively, the predicate could skip `getAnimalById` and use `hasMeaningfulSMComment` with a value from a lighter source — but the SM cache makes this moot.

---

## 4. Panel Self-Update (No Second Expand)

### The response carries a `generating` flag

When the server fires generation, the response includes `generating: true`. The client uses this to schedule a delayed re-fetch.

### Client: bounded re-fetch after expand

In `loadBioForAnimal`, after receiving a response with `generating: true`:

```js
// After rendering the current (generic) data:
if (result.generating) {
  // Schedule a single delayed re-fetch to pick up the new draft
  // Only if the card is still expanded
  const pollForDraft = (attempts) => {
    if (attempts <= 0) return;  // Give up after N tries
    const card = document.getElementById(`card-${animalId}`);
    if (!card || !card.classList.contains('expanded')) return;  // Panel collapsed — stop
    
    setTimeout(async () => {
      try {
        const shelterCode = getShelterCodeForBio(animalId);
        const resp = await fetch(`${API_BASE}/bio/${shelterCode}`);
        const r = await resp.json();
        if (r.success && r.draft && (
          r.draft.sourceLong === 'from_sm' || r.draft.sourceLong === 'from_profile' ||
          r.draft.sourceShort === 'from_sm' || r.draft.sourceShort === 'from_profile'
        )) {
          // Real draft landed — update cache + re-render, STOP polling
          bioCache.set(animalId, { data: r.data, draft: r.draft });
          renderBioContent(animalId, bioCache.get(animalId));
          return;
        }
        if (!r.generating) return;  // Server no longer generating — stop
        pollForDraft(attempts - 1);  // Try again
      } catch { /* ignore, stop polling */ }
    }, 5000);  // 5 seconds between attempts
  };
  pollForDraft(4);  // Max 4 attempts = 20 seconds total
}
```

### Bounded guarantees:
- **Max 4 re-fetches** (20 seconds total) — stops regardless
- **Stops on collapse** — if John collapses the panel, no more fetches
- **Stops on real draft** — once `draft.sourceLong/sourceShort` is `from_sm` or `from_profile`, rendering happens and polling stops
- **Stops on `generating: false`** — if the server is no longer generating (draft written or generation failed), stop
- **Never fires generation again** — the re-fetch hits `GET /api/bio/:shelterCode`, which evaluates the predicate again; since `bioGenerationInFlight` has the code (generation in progress), it won't fire again; once the draft is written, the predicate is false

### Where this hooks

In `loadBioForAnimal` (dashboard/index.html:7778), in the `forceRefresh` fetch path, after `renderBioContent`:

```js
// After line 7792:
if (result.generating) {
  pollForDraft(4);
}
```

The `pollForDraft` function can be defined inside `loadBioForAnimal` or as a helper nearby.

---

## 5. End-to-End No-Double-Fire Guarantee

### Sequence walkthrough

1. **First expand** → `toggleCard` → `loadBioForAnimal(id, true)` → `GET /api/bio/:shelterCode`
2. **Server evaluates predicate:** SM comment ✅, no profile ✅, no real draft ✅, generic bio ✅ → `shouldAutoGen = true`
3. **Server checks `bioGenerationInFlight`:** `!bioGenerationInFlight.has(code)` → true → adds to Set, fires `generateBioDraftForAnimal` in background
4. **Server responds immediately:** `{ data: genericBio, draft: null, generating: true }`
5. **Client renders generic** + schedules delayed re-fetch (attempt 1 in 5s)

6. **5 seconds later (re-fetch)** → `GET /api/bio/:shelterCode` → server predicate: no real draft yet (still generating) BUT `bioGenerationInFlight.has(code)` is true → **does NOT fire a second generation** → returns `{ generating: true }`
7. **Client:** draft not yet present → schedules attempt 2

8. **~8 seconds after expand:** `generateBioDraftForAnimal` completes → draft written with `source_long='from_sm'`, `source_short='from_sm'` → `bioGenerationInFlight.delete(code)`

9. **10 seconds later (re-fetch attempt 2)** → `GET /api/bio/:shelterCode` → server reads draft with `from_sm` → predicate: `hasRealDraft = true` → `shouldAutoGen = false` → **no generation fired** → returns `{ data: genericBio, draft: fromSmDraft, generating: false }`
10. **Client:** real draft detected (`draft.sourceLong === 'from_sm'`) → updates bioCache → re-renders panel with AI bio + source badges + Pending Draft status → **stops polling**

11. **Any future expand:** `GET /api/bio/:shelterCode` → draft exists → predicate false → no generation → returns current data → panel displays AI bio immediately

### Guards summary

| Guard | Covers | Mechanism |
|---|---|---|
| `bioGenerationInFlight` Set | Concurrent/rapid requests before draft is written | In-memory Set, checked before firing |
| `hasRealDraft` (draft.sourceLong/sourceShort) | Permanent off-switch after draft is written | DB state — `from_sm`/`from_profile` in source columns |
| Client poll bound (4 attempts) | Runaway polling | Counter, decremented each attempt |
| Client collapse check | Polling after panel closed | `card.classList.contains('expanded')` guard |
| Approval status NEVER checked | Unapproved draft = still a real draft | `hasRealDraft` checks source origin, not approval |

### Restart safety

If the server restarts mid-generation:
- `bioGenerationInFlight` is cleared (in-memory)
- If no draft was written: next expand re-evaluates predicate → true → fires generation once more (one duplicate GPT call, ~$0.01)
- Once the draft is written: predicate is false forever
- **No infinite loop possible:** the draft is the persistent off-switch

---

## 6. Scope

### Piece 1: toggleCard expand → loadBioForAnimal (dashboard/index.html)
- Add `loadBioForAnimal(animalId, true)` call on expand in `toggleCard` (~line 7980)
- ~3 lines
- Dashboard-only change

### Piece 2: Server-side predicate + background-fire in GET /api/bio/:animalId (server.ts)
- Add predicate evaluation + background generation + `generating` flag in response (~line 2276-2292)
- Needs `getAnimalById` call (SM cache, light) + predicate logic + background fire pattern
- ~20 lines
- Reuses existing `GET /api/bio/:animalId` endpoint — **no new endpoint**
- Reuses existing `generateBioDraftForAnimal` + `bioGenerationInFlight` — **no new infrastructure**

### Piece 3: Client delayed re-fetch for self-update (dashboard/index.html)
- In `loadBioForAnimal`, after rendering with `result.generating`, schedule bounded poll
- ~25 lines (pollForDraft helper + invocation)
- Dashboard-only change

### No changes needed:
- **No new endpoint** — reuses `GET /api/bio/:animalId`
- **No DB schema change** — uses existing `source_long`/`source_short` on `animal_bio_drafts`
- **No new backend function** — reuses `generateBioDraftForAnimal`, `bioGenerationInFlight`, `hasMeaningfulSMComment`, `getBehaviorNotesCount`, `isGenericSource`
- **No daily job modification** — this replaces the daily-job approach entirely (expand-triggered, demand-driven)

### Total: ~48 lines across 2 files (dashboard/index.html + server.ts)

---

*End of design mapping.*
