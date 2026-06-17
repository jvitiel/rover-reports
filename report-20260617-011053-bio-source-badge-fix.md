# Bio Source Badge Fix — Implementation Report

**Date:** 2026-06-17 01:10 UTC  
**Commit:** `fe56aae`  
**Scope:** dashboard/index.html ONLY. No server changes, no rebuild, no restart.

---

## The Change

**File:** `dashboard/index.html` lines 7567-7568  
**Diff:** 1 file changed, 2 insertions(+), 2 deletions(-)

```diff
-      const srcLabelLong = sourceLabel(bio ? bio.sourceLong : null);
-      const srcLabelShort = sourceLabel(bio ? bio.sourceShort : null);
+      const srcLabelLong = sourceLabel(useDraftLong && draft ? draft.sourceLong : (bio ? bio.sourceLong : null));
+      const srcLabelShort = sourceLabel(useDraftShort && draft ? draft.sourceShort : (bio ? bio.sourceShort : null));
```

These are the ONLY changes. `git diff --stat` confirms: [VERIFIED]

```
dashboard/index.html | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)
```

No other function was touched. No server files modified. [VERIFIED]

---

## Scope Confirmation

`useDraftLong`, `useDraftShort`, and `draft` are all defined earlier in `renderBioContent` and in scope at lines 7567-7568:

- `draft` — line 7520: `const draft = cached ? cached.draft : null;` [VERIFIED]
- `useDraftLong` — line 7534: `const useDraftLong = draft && !draft.promotedLong;` [VERIFIED]
- `useDraftShort` — line 7535: `const useDraftShort = draft && !draft.promotedShort;` [VERIFIED]

All three are `const` declarations in the same function scope, defined 30+ lines before the changed lines. [VERIFIED]

---

## Code-Read Walkthrough

### Achilles (A2025088) — Short badge: was hidden, now shows

**Data state:**
- `bio.sourceShort = null` (animal_bios has NULL — partial sm_copy row) [VERIFIED]
- `draft.sourceShort = 'from_profile'` (animal_bio_drafts) [VERIFIED]
- `useDraftShort = true` (draft exists, promotedShort=false) [VERIFIED]

**Before fix:**
```javascript
srcLabelShort = sourceLabel(bio ? bio.sourceShort : null)
             = sourceLabel(null)     // bio.sourceShort is NULL
             = null                  // → badge HIDDEN
```

**After fix:**
```javascript
srcLabelShort = sourceLabel(useDraftShort && draft ? draft.sourceShort : ...)
             = sourceLabel(true && draft ? draft.sourceShort : ...)
             = sourceLabel('from_profile')
             = 'Derived from Profile'  // → badge SHOWN ✅
```

[VERIFIED]

### Charlie (R2023007) — Short badge: was wrong source, now correct

**Data state:**
- `bio.sourceShort = 'adult_generic'` (animal_bios — old generic short content) [VERIFIED]
- `draft.sourceShort = 'from_profile'` (animal_bio_drafts — new profile draft) [VERIFIED]
- `useDraftShort = true` (draft exists, promotedShort=false) [VERIFIED]

**Before fix:**
```javascript
srcLabelShort = sourceLabel(bio ? bio.sourceShort : null)
             = sourceLabel('adult_generic')
             = 'Generic - Adult'      // → badge shows WRONG source
```

**After fix:**
```javascript
srcLabelShort = sourceLabel(useDraftShort && draft ? draft.sourceShort : ...)
             = sourceLabel('from_profile')
             = 'Derived from Profile'  // → badge shows CORRECT source ✅
```

[VERIFIED]

### Approved bio without draft — unchanged behavior

For an animal with no draft (e.g. R2025053, approved, draft=null):
- `useDraftLong = false` (draft is null)
- Falls through to `bio ? bio.sourceLong : null` — same as before

[VERIFIED — no regression for non-draft animals]

---

## What Was NOT Changed

The following were verified untouched: [VERIFIED]

- `sourceLabel` function (lines 7556-7565) — label mapping unchanged
- `useDraftLong` / `useDraftShort` computation (lines 7534-7535) — unchanged
- Content display logic (lines 7537-7543) — unchanged
- Approve/promote logic (`approveBio`, `promoteDraftSize`) — unchanged
- Status badge (`displayStatusLong`, `displayStatusShort`) — unchanged
- Server files — no changes

---

## Commit

```
fe56aae — bio badge fix: source badges read draft source when showing a draft
          (fixes missing short badge on Achilles/Dante + wrong-source badge on
          other pending animals)
```

dashboard/index.html only, 2 insertions / 2 deletions. [VERIFIED]
