# Bio Panel Refresh Diagnosis — Does Expand Show Fresh Data?

**Date:** 2026-06-25  
**Type:** Read-only diagnosis  
**Status:** Expand does NOT fetch fresh data — shows page-load cache

---

## 1. How Bio Panels Load

### Page-load bulk population

The `/api/dashboard/behavior-notes` response includes every animal's `bio` and `draft` objects. On page load, the response handler pre-populates a client-side `bioCache` Map (`dashboard/index.html:6947-6952`):

```js
// dashboard/index.html:6947-6952
for (const animal of animals) {
  if (animal.bio) {
    bioCache.set(animal.animalId, { data: animal.bio, draft: animal.draft || null });
  }
}
```

After rendering animal cards, `loadBioForAnimal()` is called for each visible animal (`dashboard/index.html:7057`):

```js
// dashboard/index.html:7057
filtered.forEach(animal => {
  loadBioForAnimal(animal.animalId);
  loadPhotosForAnimal(animal.animalId);
});
```

### loadBioForAnimal — cache-first, NOT fetch-first

```js
// dashboard/index.html:7778-7797
async function loadBioForAnimal(animalId, forceRefresh = false) {
  // Cache-first: use batched data from behavior-notes response if available
  // Post-mutation callers pass forceRefresh=true to bypass stale cache
  if (!forceRefresh && bioCache.has(animalId)) {
    renderBioContent(animalId, bioCache.get(animalId));
    return;
  }
  // Fallback: per-animal fetch (for post-mutation refreshes or missing data)
  try {
    const shelterCode = getShelterCodeForBio(animalId);
    const response = await fetch(`${API_BASE}/bio/${shelterCode}`);
    const result = await response.json();
    if (result.success && (result.data || result.draft)) {
      bioCache.set(animalId, { data: result.data, draft: result.draft || null });
      renderBioContent(animalId, bioCache.get(animalId));
    }
  } catch (error) {
    console.error(`Failed to load bio for ${animalId}:`, error);
  }
}
```

**Key:** `forceRefresh` defaults to `false`. On normal page-load rendering, `bioCache.has(animalId)` is true (populated from the bulk response), so it short-circuits to `renderBioContent` with cached data. The per-animal fetch path only fires when `forceRefresh=true` (called by post-mutation handlers like regenerate, save, approve) or when the animal has no entry in bioCache.

### toggleCard — pure CSS toggle, NO data fetch

```js
// dashboard/index.html:7980-8001
function toggleCard(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  card.classList.toggle('expanded');
  card.classList.remove('library-only');
  const icon = card.querySelector('.expand-icon');
  icon.textContent = card.classList.contains('expanded') ? '−' : '+';
  // ... library button reset on collapse ...
}
```

`toggleCard` only toggles the `expanded` CSS class. It does NOT call `loadBioForAnimal`, does NOT fetch data, does NOT check if the cached data is stale. The bio panel content was already rendered (from bioCache) when the animal card was first displayed.

---

## 2. The bioCache Behavior

| Operation | bioCache behavior |
|---|---|
| Page load (bulk) | Populated from `/api/dashboard/behavior-notes` response for ALL animals (`dashboard/index.html:6950`) |
| Card rendering | `loadBioForAnimal(id)` → cache hit → `renderBioContent` from cache (line 7781-7783) |
| Card expand (toggle) | `toggleCard(id)` → CSS only, no data fetch (line 7980) |
| Regenerate | `regenerateBio()` → POST → response updates bioCache → re-render (line 7837-7838) |
| Save/Approve | Handler → POST → response updates bioCache → re-render (lines 7896, 7931, 7943) |
| Delete | Handler → DELETE → `bioCache.delete()` → re-render as empty (line 7962-7963) |

**The pattern:** bioCache is populated ONCE at page load for all animals. Mutations (regenerate, save, approve, delete) update the cache from the mutation response. But there is NO mechanism that detects "new data appeared on the server since page load" and refreshes the cache proactively.

---

## 3. Per-Animal Bio Fetch Endpoint

**Yes, it exists:** `GET /api/bio/:animalId` (`server.ts:2276-2292`)

```ts
// server.ts:2276-2292
app.get('/api/bio/:animalId', async (req: Request, res: Response) => {
  const animalId = req.params.animalId as string;
  const bio = getAnimalBio(animalId);
  const draft = getAnimalBioDraft(animalId);
  if (!bio && !draft) {
    res.json({ success: true, data: null, draft: null });
    return;
  }
  res.json({ success: true, data: bio || null, draft: draft || null });
});
```

This endpoint returns the current `animal_bios` row AND `animal_bio_drafts` row for a single animal. It's exactly what `loadBioForAnimal` calls in its fallback path (line 7789: `fetch(\`${API_BASE}/bio/${shelterCode}\`)`).

**The endpoint already exists and the client code already knows how to call it.** The only issue is that `loadBioForAnimal` only calls it when `forceRefresh=true` or when the animal isn't in bioCache. Expanding a card calls neither.

---

## 4. Definitive Answer: Scroll + Expand Shows GENERIC (Stale)

**John's scenario:** Dashboard is open (loaded before the from_sm draft existed). Background auto-gen fires. A few seconds later, the from_sm draft is written to DB. John scrolls to the animal and expands its panel.

**Result: John sees the GENERIC bio (stale page-load data).**

**Code path:**
1. Page loaded → `/api/dashboard/behavior-notes` returned bio with `last_source='generic'`, no draft → `bioCache.set(animalId, { data: genericBio, draft: null })` (line 6950)
2. Card rendered → `loadBioForAnimal(animalId)` → `bioCache.has(animalId)` is true → renders from cache (line 7781-7783) → shows generic bio
3. Background auto-gen fires → draft written to DB → but **nothing notifies the client**
4. John scrolls, clicks expand → `toggleCard(animalId)` → CSS toggle only (line 7980) → panel shows the same rendered content from step 2
5. Generic bio visible. No fresh fetch. No awareness that a draft now exists.

**To see the AI bio, John must reload the entire dashboard page** (which re-fetches `/api/dashboard/behavior-notes` with the new draft included).

---

## 5. Fix Options (If Expand Doesn't Refresh)

### Option (a): Fetch-on-expand — RECOMMENDED ✅

Make `toggleCard` call `loadBioForAnimal(animalId, true)` when **expanding** (not collapsing). This triggers a per-animal fetch to `GET /api/bio/:shelterCode`, which returns the current bio + draft from DB, updates bioCache, and re-renders the panel.

**Where the fetch would go:** `dashboard/index.html:7980` — `toggleCard()`. Add to the expand branch:

```js
// In toggleCard, after toggling .expanded:
if (card.classList.contains('expanded')) {
  loadBioForAnimal(animalId, true);  // forceRefresh=true → per-animal fetch
}
```

**Per-animal endpoint to call:** `GET /api/bio/:shelterCode` already exists (server.ts:2276) and returns both `data` (animal_bios) and `draft` (animal_bio_drafts). `loadBioForAnimal` already calls it in the forceRefresh path (line 7789). **No new endpoint needed.**

**Pros:**
- Minimal change — one line in `toggleCard`
- Uses existing infrastructure (endpoint, fetch path, cache update, re-render)
- Always shows live data on expand (not just for auto-gen — also picks up any server-side changes)
- No polling, no WebSocket, no client-side completion awareness needed

**Cons:**
- One extra API call per expand (but it's a lightweight SQLite query — two `SELECT * WHERE shelter_code=?` lookups — sub-millisecond)
- Slightly different from current behavior (expand was instant CSS toggle; now includes a micro-fetch) — but the fetch is fast enough to be imperceptible

### Option (b): Server-push / polling after background generation — NOT RECOMMENDED

Would require the client to know that generation is in progress for a specific animal and poll for completion. Much more complex, requires new state tracking.

### Option (c): Accept full-reload requirement — WORST UX

The user must reload the entire dashboard to see the AI bio. Defeats the purpose of auto-generation (the bio exists but the user can't see it without a manual action).

---

## 6. Scope of Fetch-on-Expand

**Very small change:**

1. **`dashboard/index.html:7980`** — `toggleCard()`: Add `loadBioForAnimal(animalId, true)` call on expand. ~3 lines.

2. **No backend changes.** The per-animal endpoint (`GET /api/bio/:animalId`, server.ts:2276) already exists and returns the right data.

3. **No new client-side logic.** `loadBioForAnimal(id, true)` already:
   - Fetches from `GET /api/bio/:shelterCode`
   - Updates `bioCache`
   - Calls `renderBioContent` to re-render the panel with fresh data (including any new from_sm draft with source badges)

4. **No architectural change.** The panel architecture already supports per-animal fetch — it's the fallback path that post-mutation handlers (regenerate, save, approve) use. Fetch-on-expand just adds one more caller to the existing path.

**The change is a one-liner in `toggleCard` + possibly a guard to only fetch on expand (not collapse).** The existing `loadBioForAnimal(id, forceRefresh=true)` path does everything else.

---

*End of diagnosis.*
