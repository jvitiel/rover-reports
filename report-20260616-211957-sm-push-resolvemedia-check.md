# SM Push — resolveMediaById Regression Check

**Date:** 2026-06-16 21:19 UTC  
**Scope:** Read-only verification — no code changes

---

## 1. SM Push Image Source [VERIFIED]

`shelterManagerPush.ts` does **NOT** call `resolveMediaById` at any point. The SM push queries `animal_media` directly:

```typescript
// shelterManagerPush.ts — getEligibleRows() (batch push)
SELECT am.id, am.shelter_code, am.file_url, am.content_hash
FROM animal_media am
WHERE am.strip_position > 0 ...

// shelterManagerPush.ts — pushSinglePhotoById()
SELECT id, shelter_code, file_url, content_hash
FROM animal_media WHERE id = ?
```

Both queries read `am.file_url` directly from the table — the original full-resolution URL. Neither query selects `thumbnail_url`.

## 2. Exact Line Where Image Source Is Selected [VERIFIED]

`shelterManagerPush.ts:62` — the `buildCsvPayload` function receives `fileUrl` (the original):

```typescript
function buildCsvPayload(animalCode: string, animalName: string, fileUrl: string): string {
  const header = 'ANIMALCODE,ANIMALNAME,ANIMALIMAGE';
  const row = [animalCode, animalName, fileUrl].map(csvEscapeField).join(',');
  return header + '\n' + row + '\n';
}
```

Called at `shelterManagerPush.ts:104`:
```typescript
const csv = buildCsvPayload(row.shelter_code, animalName, row.file_url);
```

`row.file_url` comes from the direct SQL query above — always the original full-resolution URL. **The SM push never touches `thumbnail_url` or `resolveMediaById`.** [VERIFIED]

## 3. Regression Assessment [VERIFIED]

**No regression.** The SM push has its own direct SQL queries and never calls `resolveMediaById`. The Phase 1 change to `resolveMediaById` has zero effect on SM photo pushes.

---

## 4. Complete resolveMediaById Consumer List

### All callers [VERIFIED]

| # | File:Line | Context | Uses `.url` | Uses `.thumbnailUrl` | Risk |
|---|---|---|---|---|---|
| 1 | `server.ts:2740` | `GET /api/featured-slots` — build slot response | ✓ as `media.url` | ✓ as `thumbnailUrl` fallback seed | ✅ SAFE — `.thumbnailUrl` used for display thumbnail (correct use); `.url` used for `media.url` (original) |
| 2 | `server.ts:2792` | `PUT /api/featured-slots/:index` — set slot response | ✓ as `resolved.url` in response `media.url` | ✓ as `resolved.thumbnailUrl` for display | ✅ SAFE — same pattern as #1 |
| 3 | `server.ts:3974` | `POST /api/generate-video` — source photo for video gen | ✓ as `resolved.url` passed to `generateVideo({ imageUrl: resolved.url })` | ✗ not used | ✅ SAFE — video generation uses `.url` (the full-res original) |

### Detailed analysis per caller:

**Caller 1 — GET /api/featured-slots (line 2740):**
```typescript
const resolved = resolveMediaById(slot.mediaId);
let thumbnailUrl = resolved.thumbnailUrl || resolved.url;  // ← uses .thumbnailUrl for display
// ...
media = {
  id: slot.mediaId,
  type: resolved.mediaType,
  url: resolved.url,            // ← original (SAFE)
  thumbnail_url: thumbnailUrl,  // ← thumbnail for small display (CORRECT — this is the intended use)
};
```
- `.url` → `media.url` (original full-res for lightbox) — **unchanged by fix** ✅
- `.thumbnailUrl` → `media.thumbnail_url` (for featured grid 80×80 display) — **now returns actual thumbnail when available, falls back to original** ✅ This is the DESIRED behavior.

**Caller 2 — PUT /api/featured-slots/:index (line 2792):**
```typescript
const resolved = resolveMediaById(media_id);
// Uses resolved.shelterCode, resolved.mediaType for setFeaturedSlot
let thumbnailUrl = resolved.thumbnailUrl;
// ...
media = {
  type: resolved.mediaType,
  url: resolved.url,                              // ← original (SAFE)
  thumbnail_url: thumbnailUrl || animalData.photo_url,  // ← thumbnail (CORRECT)
};
```
Same pattern — `.url` for full-res, `.thumbnailUrl` for display. ✅

**Caller 3 — POST /api/generate-video (line 3974):**
```typescript
const resolved = resolveMediaById(source_media_id);
// ...
const result = await generateVideo({
  imageUrl: resolved.url,  // ← uses .url (the original full-res) for xAI video generation
});
```
Only uses `.url`. Never touches `.thumbnailUrl`. ✅

---

## CONCLUSION

**The SM photo push is NOT affected by the Phase 1 resolveMediaById fix.** [VERIFIED]

The SM push (`shelterManagerPush.ts`) has completely independent data access — it queries `animal_media.file_url` directly via SQL. It never calls `resolveMediaById` and never reads `thumbnail_url`. Full-resolution originals are always sent to SM.

**All three `resolveMediaById` consumers are safe:**

1. **Featured grid GET** — uses `.url` for full-res display, `.thumbnailUrl` for 80×80 grid (correct — now gets actual thumbnail when available) ✅
2. **Featured grid PUT** — same pattern ✅
3. **Video generation** — uses `.url` only (full-res source for xAI) ✅

No consumer that needs full-resolution images uses `.thumbnailUrl`. The fix is correct and introduces no regressions. [VERIFIED]
