# Read-Path Fallback Check: crop_url NULL → file_url

**Date:** 2026-06-22 21:03 UTC  
**Mode:** Read-only

---

## 1. Matcher Read — enrichWithLocalPhotos

**localDatabase.ts:5191:**
```javascript
photoMap.set(row.shelter_code, row.crop_url || row.file_url);
```

Context (localDatabase.ts:5177-5191): the query `SELECT shelter_code, file_url, crop_url, strip_position FROM animal_media WHERE ...` returns both columns. The JS `||` operator evaluates: if `crop_url` is null/undefined/empty string, it returns `file_url`.

**When crop_url IS NULL:** returns `file_url` (the original). **Yes, falls back.**

**Any bare crop_url read without fallback in matcher path?** Searched `grep -n 'crop_url\|cropUrl' localDatabase.ts` — only these 4 lines (5177 query, 5184 type, 5187 comment, 5191 usage). All are part of this single read with the `||` fallback. **No bare read.**

## 2. Dashboard Slot-1 Render

**dashboard/index.html:7195-7196:**
```javascript
const thumbSrc = i === 0 && !isVideo
  ? (photo.cropUrl || photo.thumbnailUrl || photoUrl)
  : (photo.thumbnailUrl || photoUrl);
```

Where `photoUrl` is defined at line 7193: `const photoUrl = photo.photoUrl || photo.fileUrl;`

**When cropUrl is null/undefined:** the `||` chain falls through to `photo.thumbnailUrl`, then to `photoUrl` (which is `photo.photoUrl || photo.fileUrl`). **Yes, falls back.**

**Any bare cropUrl read without fallback?** Searched `grep -n 'cropUrl' dashboard/index.html` — only lines 7196 (this expression) and the `thumbSrc` usage at 7202. Both are part of the same fallback chain. **No bare read.**

## 3. New-Animal Window Check

For a slot-1 photo row where `crop_url IS NULL` (new animal, sweep hasn't run yet):

- **Matcher:** renders `file_url` (the original SM or local URL). **Yes** — original renders, not blank.
- **Dashboard:** renders `thumbnailUrl` if available, else `photoUrl` (the original). **Yes** — original renders, not blank.

## Able-to-Fail

A failure would be either read using `crop_url`/`cropUrl` WITHOUT a `file_url`/`photoUrl` fallback (would render blank/broken for NULL-crop slot-1 rows).

- **Matcher read (localDatabase.ts:5191):** `crop_url || row.file_url` — fallback present. **No failure condition.**
- **Dashboard read (dashboard/index.html:7196):** `photo.cropUrl || photo.thumbnailUrl || photoUrl` — fallback present. **No failure condition.**
