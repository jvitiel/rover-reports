# Searcher Public-Video Leak Fix — 2026-07-08

## Change

**server/src/server.ts:6228–6230** — SEARCHER custom-search video selection query.

Before:
```sql
SELECT file_url FROM animal_media
WHERE shelter_code = ? AND media_type = 'video' AND hidden = 0
ORDER BY captured_at DESC LIMIT 1
```

After:
```sql
SELECT file_url FROM animal_media
WHERE shelter_code = ? AND media_type = 'video' AND hidden = 0 AND strip_position = 2
LIMIT 1
```

`ORDER BY captured_at DESC` removed (unnecessary — slot 2 has at most one video per animal). [VERIFIED — changed line reads exactly as above]

## Build & Restart

- `tsc` build: **clean, exit code 0**. [VERIFIED]
- `systemctl restart shelter-app`: **active**. [VERIFIED]

## Verification

### Dante (S20241099) — previously returned library video

Query with new constraint returns his **public slot-2 video**:
```
file_url: .../videos/b02d4487-7b21-48fc-8684-c435ec492ed2.mp4
strip_position: 2
```
The library grok_imagine clip (7b85b8bb, strip_position=0) is no longer selected. [VERIFIED]

### A2023228 — library-only-video animal (no public video)

Query with new constraint returns **no rows** (empty result). video_url will be null → front-end falls back to public photo.

Public photo fallback confirmed:
```
file_url: .../asmservice?account=gw3095&method=media_image&mediaid=5265&...
strip_position: 1
```
Animal has 6 public-strip photos. Will display correctly without video. [VERIFIED]

### Spot-check: previously-bypassed animals

A2026061 and S2025966 (both had correct slot-2 videos being bypassed by newer library videos):

| shelter_code | Now returns | strip_position |
|---|---|---|
| A2026061 | .../videos/5901c0d4-...mp4 | 2 ✅ |
| S2025966 | .../videos/73710f5d-...mp4 | 2 ✅ |

Both now correctly return their public slot-2 video. [VERIFIED]

## Commit

```
cf0cfc9 Fix SEARCHER public-video leak: constrain custom-search video selection
        to strip_position=2 (public slot) so library videos never surface publicly
```

File: `server/src/server.ts` only. No other files touched. [VERIFIED]

## Impact Summary

- **10 animals** previously exposed to library-video leak are now fixed.
- **6** of those now correctly show their public slot-2 video (were showing library video).
- **4** now return null video (no public video exists) → fall back to public photo.
- **74 animals** with correct slot-2 videos are unaffected (query still returns the same row).
- Photo path (`enrichWithLocalPhotos`) was already public-strip-safe — not touched.
