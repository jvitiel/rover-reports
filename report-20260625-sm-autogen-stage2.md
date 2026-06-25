# SM Auto-Gen Stage 2 — Bounded Client Poll for Self-Update

**Date:** 2026-06-25  
**Commit:** 50c9a9b  
**Files changed:** dashboard/index.html

---

## Changes

### pollForDraft helper + hook in loadBioForAnimal

**In `loadBioForAnimal` (dashboard/index.html:7778)**, after the forceRefresh fetch renders the result:

```js
// If server fired SM auto-gen in background, poll until the draft lands
if (result.generating) {
  pollForDraft(animalId, 4);
}
```

**`pollForDraft` (dashboard/index.html:7804):**

```js
function pollForDraft(animalId, attempts) {
  if (attempts <= 0) return;                              // STOP: attempt cap
  const card = document.getElementById(`card-${animalId}`);
  if (!card || !card.classList.contains('expanded')) return; // STOP: collapsed
  setTimeout(async () => {
    const c = document.getElementById(`card-${animalId}`);
    if (!c || !c.classList.contains('expanded')) return;   // STOP: collapsed during wait
    try {
      const shelterCode = getShelterCodeForBio(animalId);
      const resp = await fetch(`${API_BASE}/bio/${shelterCode}`);
      const r = await resp.json();
      if (r.success) {
        const real = r.draft && (
          r.draft.sourceLong === 'from_sm' || r.draft.sourceLong === 'from_profile' ||
          r.draft.sourceShort === 'from_sm' || r.draft.sourceShort === 'from_profile'
        );
        if (real) {
          bioCache.set(animalId, { data: r.data, draft: r.draft });
          renderBioContent(animalId, bioCache.get(animalId));
          return;                                          // STOP: real draft → render
        }
        if (!r.generating) return;                         // STOP: server done
      }
      pollForDraft(animalId, attempts - 1);                // next attempt
    } catch { /* STOP: error */ }
  }, 5000);
}
```

---

## Bounded Stop Conditions

| Condition | Code | When |
|---|---|---|
| Real draft found | `r.draft.sourceLong === 'from_sm'` (or from_profile) → render + return | AI draft written to DB |
| Panel collapsed | `!card.classList.contains('expanded')` (checked twice: before + after setTimeout) | User collapses card |
| Server done | `!r.generating` → return | Generation completed or failed |
| Attempt cap | `attempts <= 0` → return | After 4 polls (20s max) |
| Fetch error | `catch {}` — implicit stop | Network error |

**Maximum fetches:** 4 re-fetches over 20 seconds. In practice, generation takes ~5-10s, so the draft typically appears on poll 1 or 2.

---

## No Client-Side Generation

The poll only calls `GET /api/bio/:shelterCode` (read-only). It never POSTs to a generate endpoint. The server's Stage 1 logic prevents the GET from re-triggering generation:

1. **During generation:** `bioGenerationInFlight.has(animalId)` is true → server skips the fire block
2. **After generation:** `draft.sourceLong = 'from_sm'` → `hasRealDraft = true` → predicate is false → no generation

No duplicate `[sm-auto-gen]` log entries can occur from poll re-fetches.

---

## Verification

### Existing draft → no poll ✅

**A2023267** (unapproved from_sm draft): `GET /api/bio/A2023267` → `generating: false` → `pollForDraft` NOT called. No extra fetches.

### No eligible animal for live fire test ⚠️

No animal currently has generic bio + meaningful SM comment + no profile + no real draft. Verified structurally:

- `pollForDraft` is only called when `result.generating === true` (line 7795-7796)
- The 4-attempt cap (line 7806), collapse checks (lines 7808, 7811), real-draft stop (line 7824), and generating-false stop (line 7826) are all present
- No path to infinite polling: every branch either returns or decrements attempts
- No fetch-after-collapse: expanded check runs both before and after the 5s timeout

### Structural verification of bounded behavior ✅

- `pollForDraft(animalId, 4)` → max 4 recursive calls with `attempts - 1` each → terminates at `attempts <= 0`
- Each branch in the setTimeout callback either returns (stop) or calls `pollForDraft(animalId, attempts - 1)` (continue with decrement)
- No branch calls `pollForDraft` without decrementing attempts
- The real-draft check (`r.draft.sourceLong === 'from_sm'`) matches the draft fields written by `saveAnimalBioDraft` via `mapSourceToOrigin('sm_generate')` → `'from_sm'`

### Dashboard loads ✅

`curl -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/dashboard/` → 200

---

## End-to-End Flow (Stages 1 + 2 Combined)

1. John expands an animal card → `toggleCard` → `loadBioForAnimal(id, true)` (Stage 1)
2. `GET /api/bio/:shelterCode` → server evaluates predicate → fires `generateBioDraftForAnimal` in background → responds with `generating: true` + current generic data
3. Panel renders generic bio immediately
4. `pollForDraft(animalId, 4)` starts (Stage 2)
5. Poll 1 (5s later): re-fetches → draft not ready yet, `generating: true` → continues
6. Poll 2 (10s later): re-fetches → draft landed (`sourceLong: 'from_sm'`) → updates bioCache → re-renders panel with AI bio + source badges → **STOPS**
7. Panel now shows the AI bio (from_sm) with Pending Draft status, ready for review — no second click needed

---

## Commit

```
50c9a9b - SM auto-gen Stage 2: bounded client poll for self-update after expand
1 file changed: dashboard/index.html
```
