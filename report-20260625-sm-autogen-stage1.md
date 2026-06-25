# SM Auto-Gen Stage 1 — Fetch-on-Expand + Server-Side Trigger

**Date:** 2026-06-25  
**Commit:** 9a2693f  
**Files changed:** server/src/server.ts, dashboard/index.html

---

## Changes

### Piece 1: toggleCard expand → loadBioForAnimal (dashboard/index.html:7980)

**Before:**
```js
function toggleCard(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  card.classList.toggle('expanded');
  // ... CSS toggle only, no data fetch ...
}
```

**After:**
```js
function toggleCard(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  card.classList.toggle('expanded');
  card.classList.remove('library-only');
  const icon = card.querySelector('.expand-icon');
  icon.textContent = card.classList.contains('expanded') ? '−' : '+';
  
  // On expand: fetch live bio/draft data (may trigger server-side SM auto-gen)
  if (card.classList.contains('expanded')) {
    loadBioForAnimal(animalId, true);
  }
  
  // If collapsing, reset library button ...
}
```

Expand calls `loadBioForAnimal(animalId, true)` → forceRefresh bypasses bioCache → fetches `GET /api/bio/:shelterCode` → updates cache → re-renders panel with live data. Collapse does NOT call it.

### Piece 2: Server predicate + background fire (server.ts GET /api/bio/:animalId, ~2276)

**Before:**
```ts
app.get('/api/bio/:animalId', async (req, res) => {
  const bio = getAnimalBio(animalId);
  const draft = getAnimalBioDraft(animalId);
  // ... return data ...
  res.json({ success: true, data: bio || null, draft: draft || null });
});
```

**After:**
```ts
app.get('/api/bio/:animalId', async (req, res) => {
  const bio = getAnimalBio(animalId);
  const draft = getAnimalBioDraft(animalId);
  
  // SM auto-gen predicate
  const hasRealDraft = !!draft && (
    draft.sourceLong === 'from_profile' || draft.sourceLong === 'from_sm' ||
    draft.sourceShort === 'from_profile' || draft.sourceShort === 'from_sm'
  );
  const isGenericOrAbsent = !bio || isGenericSource(bio.lastSource);
  let generating = false;

  if (!hasRealDraft && isGenericOrAbsent) {
    const animal = await getAnimalById(animalId, true);
    const hasSMComment = !!animal && hasMeaningfulSMComment(animal.description);
    const hasProfile = getBehaviorNotesCount(animalId) > 0;

    if (hasSMComment && !hasProfile && !bioGenerationInFlight.has(animalId)) {
      generating = true;
      bioGenerationInFlight.add(animalId);
      generateBioDraftForAnimal(animalId)
        .then(d => { if (d) console.log(`[sm-auto-gen] expand-triggered draft for ${animalId} (source: ${d.lastSource})`); })
        .catch(e => console.error(`[sm-auto-gen] expand generation failed for ${animalId}:`, e))
        .finally(() => bioGenerationInFlight.delete(animalId));
    }
  }

  res.json({ success: true, data: bio || null, draft: draft || null, generating });
});
```

**Guardrail:** The predicate checks `draft.sourceLong`/`sourceShort` for `from_profile`/`from_sm` — draft origin fields, NOT approval/promoted/status. An unapproved-but-existing AI draft has `hasRealDraft = true` → `shouldAutoGen = false` → display only.

---

## Build

tsc clean. Service restarted and active.

---

## Verification

### (a) GUARDRAIL — existing from_sm draft, unapproved ✅

**A2023267:** Has from_sm draft (unapproved: `promoted_long=0`, `promoted_short=0`), SM comment present, no profile.

- `GET /api/bio/A2023267` → `generating: false`
- `draft.sourceLong: from_sm` → `hasRealDraft = true` → predicate false
- No `[sm-auto-gen]` log entry
- **Unapproved AI draft displays, no regeneration fired**

### (b) FIRES ONCE — generic + SM + no draft ⚠️ No eligible animal exists

No animal currently has a generic bio + meaningful SM comment + no profile + no real draft. This is expected — the bio pipeline handles animals promptly. All generic-bio animals (kittens) have empty SM descriptions. The predicate logic was verified structurally:
- Cheap checks (`hasRealDraft`, `isGenericOrAbsent`) gate the expensive `getAnimalById` call
- The fire condition correctly evaluates all 4 clauses
- The `bioGenerationInFlight` guard prevents double-fire
- The `generating` flag in the response signals the client

When an SM comment is first entered for a generic-only animal, the next expand will trigger generation. The draft's `source_long = 'from_sm'` written by `saveAnimalBioDraft` (via `mapSourceToOrigin('sm_generate')`) flips `hasRealDraft` to true permanently.

### (c) PROFILE animal ✅

**A2023124:** Has profile (`behavior_notes` count > 0).
- `GET /api/bio/A2023124` → `generating: false`
- Profile clause blocks: `hasProfile = true` → predicate false

### (d) NO SM COMMENT ✅

**S2026413:** Generic bio, no profile, no draft, but SM description is empty (`""`).
- `GET /api/bio/S2026413` → `generating: false`
- SM comment clause blocks: `hasMeaningfulSMComment("") = false` → predicate false

### (e) IN-FLIGHT dedup ✅ (structural)

The code at server.ts:2298 checks `!bioGenerationInFlight.has(animalId)` before firing, and adds to the Set immediately. This is the same pattern as the profile-save trigger (server.ts:6213). Without a live eligible animal, verified structurally — the Set prevents concurrent generation for the same animal.

### (f) EXPAND-ONLY ✅

`loadBioForAnimal(animalId, true)` is inside `if (card.classList.contains('expanded'))` — fires only on expand, not on collapse.

---

## Stage 2 (not yet implemented)

The client delayed re-fetch (poll for self-update) is not included. Currently, after generation fires in the background, the user would need to re-expand or refresh to see the AI draft. Stage 2 adds a bounded poll that auto-refreshes the panel when the draft lands.

---

## Commit

```
9a2693f - SM auto-gen Stage 1: fetch-on-expand + server-side generation trigger
2 files changed: server/src/server.ts, dashboard/index.html
```
