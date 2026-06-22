# Versioned crop_url (?v=) Feasibility Check

**Date:** 2026-06-22 21:33 UTC  
**Mode:** Read-only

---

## 1. Static Serving with Query String

```
$ curl -sI '.../data/animal-media/crops/S2026345-8739.jpg?v=123456'
HTTP/2 200
content-type: image/jpeg
content-length: 70324
```

Same file (70324 bytes), same 200. Express `express.static` ignores the query string and serves the file by path. **Works.**

## 2. Matcher Read — Passthrough

**localDatabase.ts:5191:**
```javascript
photoMap.set(row.shelter_code, row.crop_url || row.file_url);
```

`row.crop_url` is the raw DB string. If it contains `?v=1719092894`, that suffix is passed through to the matcher card's photo URL untouched. No parsing, no stripping. **Passthrough confirmed.**

## 3. Dashboard Read — Passthrough

**server.ts:3829 (formatPhotoForApi):**
```javascript
cropUrl: row.crop_url || null,
```

Raw DB string, no transformation.

**dashboard/index.html:7288 (slot-1 thumb src):**
```javascript
const thumbSrc = i === 0 && !isVideo
  ? (photo.cropUrl || photo.thumbnailUrl || photoUrl)
  : (photo.thumbnailUrl || photoUrl);
```

`photo.cropUrl` is the API value from `formatPhotoForApi`. If it carries `?v=...`, it flows into the img `src` unchanged. **Passthrough confirmed.**

## 4. Validation / Sanitization / Sweep Concern

### Sweep stale-detection (cropSweep.ts:80-84)

```javascript
// 2. source_media_id present AND crop_url doesn't contain it (photo changed)
row.source_media_id &&
row.source_media_id.trim() !== '' &&
!row.crop_url.includes(row.source_media_id)
```

This `includes()` check could theoretically be confused if `?v=` altered the string. **But it never runs on locked rows.** The crop-candidate query (cropSweep.ts:62) has:

```sql
AND am.crop_locked = 0
```

Manual crops set `crop_locked = 1`, so they're excluded from the query. The `includes()` check never sees a manually-cropped row's `crop_url`. **No concern.**

Even if it did: the `source_media_id` (e.g. "8739") is a substring of the URL before the `?`, so `includes()` would still find it. The suffix wouldn't cause a false "photo changed" detection.

### No other validation/sanitization found

- No regex validation on `crop_url` in any read or write path.
- No URL reconstruction or path-stripping anywhere.
- The `UPDATE` in the manual-crop endpoint (server.ts:4025) stores whatever string it receives from the worker output (`wr.crop_url`). If we append `?v=<epoch>` before storing, it persists as-is.

## Summary

A versioned `crop_url` (e.g. `...S2026345-8739.jpg?v=1719092894`) will:
- Serve correctly via Express static (200, ignores query string) ✅
- Pass through the matcher read untouched ✅
- Pass through the dashboard read untouched ✅
- Never reach the sweep's stale-detection (locked rows are skipped) ✅
- Not be stripped or rejected by any validation ✅
