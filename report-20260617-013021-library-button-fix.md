# Library Button Scope Fix — Implementation Report

**Date:** 2026-06-17 01:30 UTC  
**Commit:** `88d7351`  
**Scope:** dashboard/index.html ONLY. No server changes, no rebuild, no restart.

---

## The 4 Changes

### Change 1 — CSS Rule (line 909, after existing .expanded rule)

```diff
     .animal-card.expanded .animal-details { display: block; }
+    .animal-card.library-only .animal-details > :not(.photo-library-section) { display: none !important; }
```

When `library-only` is on the card, all direct children of `.animal-details` except `.photo-library-section` are hidden. [VERIFIED]

### Change 2 — toggleLibrarySection OPEN path (line 7289, after toggleCard call)

```diff
           toggleCard(animalId);
+          card.classList.add('library-only');
           // Wait for expansion + photo load, then show library
```

When Library opens from a collapsed card, `library-only` is added immediately after `toggleCard` expands the card. [VERIFIED]

### Change 3 — toggleLibrarySection CLOSE path (line 7275, after hiding library-content)

```diff
         // CLOSE: hide library, collapse card, restore button label
         libraryContent.style.display = 'none';
+        card.classList.remove('library-only');
```

When Library is closed, `library-only` is cleared before the card collapses. [VERIFIED]

### Change 4 — toggleCard (line 7846, after classList.toggle)

```diff
       card.classList.toggle('expanded');
+      card.classList.remove('library-only');
       const icon = card.querySelector('.expand-icon');
```

Any normal card header expand/collapse clears `library-only` so all panels show on a normal expand. [VERIFIED]

---

## git diff --stat

```
dashboard/index.html | 4 ++++
 1 file changed, 4 insertions(+)
```

Only dashboard/index.html modified. 4 insertions, 0 deletions. [VERIFIED]

---

## 5-Case Code-Read Verification

### Case 1: Library clicked on a COLLAPSED card

1. `toggleLibrarySection(animalId)` called
2. `isCurrentlyOpen = false` (library-content display is 'none')
3. OPEN path: `card.classList.contains('expanded')` → false
4. `toggleCard(animalId)` → adds `.expanded` → `.animal-details { display: block }` → all children visible
5. `card.classList.add('library-only')` → CSS rule kicks in: `.animal-card.library-only .animal-details > :not(.photo-library-section) { display: none !important }` → bio/profile/records/SM hidden
6. `setTimeout` → shows `library-content` (display: flex), scrolls to library

**Result:** Card expanded, ONLY library section visible. Bio/profile/records/SM hidden. ✅ [VERIFIED]

### Case 2: Library clicked when card ALREADY expanded normally

1. `toggleLibrarySection(animalId)` called
2. `isCurrentlyOpen = false`
3. OPEN path: `card.classList.contains('expanded')` → true
4. Enters the `else` branch (line 7299): just shows `library-content` and updates button label
5. **No `toggleCard` call, no `library-only` added**

**Result:** Library shows alongside already-visible bio/profile/records/SM panels. Other panels stay visible. ✅ [VERIFIED]

### Case 3: Library closed

1. `toggleLibrarySection(animalId)` called
2. `isCurrentlyOpen = true`
3. CLOSE path: `libraryContent.style.display = 'none'`
4. `card.classList.remove('library-only')` → modifier cleared
5. `toggleCard(animalId)` → removes `.expanded` → `.animal-details { display: none }` → everything hidden

**Result:** Library hidden, card collapsed, `library-only` cleared. Next normal expand will show all panels. ✅ [VERIFIED]

### Case 4: Normal card header click to EXPAND

1. Card header onclick → `toggleCard(animalId)`
2. `card.classList.toggle('expanded')` → adds `.expanded`
3. `card.classList.remove('library-only')` → clears modifier (belt-and-suspenders; shouldn't be set, but safe)
4. `.animal-details { display: block }` → all children visible
5. No `library-only` → CSS `:not(.photo-library-section)` rule doesn't apply

**Result:** ALL panels visible (bio, profile, records, SM, library section container). Normal behavior preserved. ✅ [VERIFIED]

### Case 5: Normal card header click to COLLAPSE

1. Card header onclick → `toggleCard(animalId)`
2. `card.classList.toggle('expanded')` → removes `.expanded`
3. `card.classList.remove('library-only')` → clears modifier
4. `.animal-details { display: none }` → everything hidden
5. Library button label reset to count (existing logic in `toggleCard` lines 7850-7858)

**Result:** Everything hidden, `library-only` cleared. ✅ [VERIFIED]

---

## What Was NOT Changed

The following were verified untouched: [VERIFIED]

- `renderBioSection` — unchanged
- `renderMergedView` — unchanged
- `renderSmDataSection` — unchanged
- Records rendering — unchanged
- `toggleBioSection` — unchanged
- `toggleSmSection` — unchanged
- The existing `.animal-card.expanded .animal-details { display: block }` CSS rule — unchanged
- Library content show/hide logic (`libraryContent.style.display`) — unchanged
- `renderLibrarySection` — unchanged
- Server files — no changes

---

## Commit

```
88d7351 — dashboard: scope Library button to library only
          (library-only modifier hides non-library panels when card
          expanded via Library button)
```

dashboard/index.html only, 4 insertions. [VERIFIED]
