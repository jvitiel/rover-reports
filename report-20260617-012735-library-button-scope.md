# Library Button Scope Bug — Diagnosis

**Date:** 2026-06-17 01:27 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. The Library Button

```html
<!-- dashboard/index.html:7148-7149 -->
<button class="btn-strip-action btn-library" 
        id="lib-btn-${animal.animalId}" 
        onclick="toggleLibrarySection('${animal.animalId}'); event.stopPropagation();" 
        disabled>
  📁 Library (<span id="lib-count-${animal.animalId}">0</span>)
</button>
```

The button calls `toggleLibrarySection(animalId)` with `event.stopPropagation()` (so click doesn't bubble to the card header's expand handler). [VERIFIED — dashboard/index.html:7148]

---

## 2. What the Handler Does

```javascript
// dashboard/index.html:7263-7314
function toggleLibrarySection(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  const libraryContent = document.getElementById(`library-content-${animalId}`);
  const isCurrentlyOpen = libraryContent && libraryContent.style.display === 'flex';

  if (isCurrentlyOpen) {
    // CLOSE: hide library-content, restore button label
    libraryContent.style.display = 'none';
    // Collapse entire card if expanded
    if (card && card.classList.contains('expanded')) {
      toggleCard(animalId);          // ← removes .expanded → hides .animal-details
    }
  } else {
    // OPEN: expand card if needed, then show library
    if (card && !card.classList.contains('expanded')) {
      toggleCard(animalId);          // ← THE BUG: adds .expanded → shows EVERYTHING
      setTimeout(() => {
        // show library-content, scroll to it
      }, 300);
    } else {
      // Card already expanded — just show library-content
    }
  }
}
```

[VERIFIED — dashboard/index.html:7263-7314]

### The Bug (Answer: **(d)** — one shared expanded state)

The OPEN path calls `toggleCard(animalId)` (line 7289) when the card is collapsed. `toggleCard` does this:

```javascript
// dashboard/index.html:7841-7846
function toggleCard(animalId) {
  const card = document.getElementById(`card-${animalId}`);
  card.classList.toggle('expanded');
  const icon = card.querySelector('.expand-icon');
  icon.textContent = card.classList.contains('expanded') ? '−' : '+';
  // ...
}
```

Which triggers the CSS rule:

```css
/* dashboard/index.html:908 */
.animal-card.expanded .animal-details { display: block; }
```

[VERIFIED — dashboard/index.html:908]

The `.animal-details` container holds ALL panels:

```html
<div class="animal-details">
  <!-- Inserted at afterbegin by JS: -->
  <div class="photo-library-section">...</div>      ← Library
  <!-- From template: -->
  ${renderBioSection(...)}                           ← Bio Generator panel
  ${renderMergedView(...)}                           ← Profile/Merged panel  
  ${records...}                                      ← Behavior records
  ${renderSmDataSection(...)}                        ← SM Data panel
</div>
```

[VERIFIED — dashboard/index.html:7167-7174, library inserted at 8120]

When `.expanded` is added, `.animal-details` switches from `display: none` to `display: block`, making **all** child sections visible simultaneously. The library button has no mechanism to selectively show only the library — it's an all-or-nothing toggle. [VERIFIED]

---

## 3. The Other Panels' Normal Open Path

The bio generator and profile panels don't have their own "show/hide" independent of card expansion. They become visible when the card expands (clicking the card header, or clicking Library):

- **Bio Generator:** Has a collapse/expand toggle (`toggleBioSection`, line 7479-7497) that collapses/expands its *content* within the panel, but the panel itself (`.bio-section-wrapper`) is always visible when the card is expanded.
- **Profile/Merged View:** No independent toggle — always visible when card is expanded.
- **SM Data Section:** Has a collapse/expand toggle (`toggleSmSection`) for its content, but the section itself is always visible.
- **Records:** Always visible when card is expanded.

All panels share the same visibility gate: `.animal-card.expanded .animal-details { display: block }`. There is no per-panel show/hide mechanism at the `.animal-details` child level. [VERIFIED]

---

## 4. The Minimal Fix

**Approach: CSS modifier class `library-only`**

When the Library button opens from a collapsed card, add a `library-only` class to the card alongside `expanded`. A CSS rule hides all non-library children of `.animal-details` when this class is present. Remove the class when:
- Library is closed (collapsing the card)
- The card is expanded normally via the card header (user wants everything)

### CSS Addition (1 rule)

```css
/* Hide non-library panels when card is expanded via Library button only */
.animal-card.library-only .animal-details > :not(.photo-library-section) {
  display: none !important;
}
```

### JS Changes

**In `toggleLibrarySection` OPEN path (line ~7289):**

```javascript
// Before:
toggleCard(animalId);

// After:
toggleCard(animalId);
card.classList.add('library-only');
```

**In `toggleLibrarySection` CLOSE path (line ~7283):**

```javascript
// Add after existing close logic:
card.classList.remove('library-only');
```

**In `toggleCard` (line ~7841):** When the card is toggled via the normal card header click, ensure `library-only` is removed so all panels show:

```javascript
// Add inside toggleCard, after classList.toggle:
card.classList.remove('library-only');
```

### Why This Works

1. **Library button from collapsed card:** `toggleCard` adds `expanded` → `card.classList.add('library-only')` → CSS hides non-library panels → only library visible. ✅
2. **Library button when card already expanded:** No `toggleCard` call, no `library-only` added → library-content toggled, other panels stay visible (they were already showing from normal expansion). ✅
3. **Library close:** `library-only` removed → if card collapses via `toggleCard`, all panels re-show on next normal expansion. ✅
4. **Normal card expand (click header):** `toggleCard` removes `library-only` → all panels visible as before. ✅
5. **Normal card collapse (click header):** `toggleCard` removes `library-only` + removes `expanded` → everything hidden. ✅

No regression to existing behavior. Library already open when card is expanded normally stays visible (it's inside `.animal-details`). The `library-only` class is only set when the Library button is the SOLE reason the card expanded. [VERIFIED by code trace]

### Exact Lines

| Change | Location | Type |
|---|---|---|
| CSS rule | New, after line 908 | 3 lines |
| `card.classList.add('library-only')` | After `toggleCard(animalId)` at line 7289 | 1 line |
| `card.classList.remove('library-only')` | In CLOSE path, after line 7283 | 1 line |
| `card.classList.remove('library-only')` | In `toggleCard`, after `classList.toggle` at line 7843 | 1 line |

Total: 1 CSS rule + 3 JS lines. No changes to `renderBioSection`, `renderMergedView`, `renderSmDataSection`, or any panel content. [VERIFIED]

---

## Conclusions

**(a)** The Library button calls `toggleLibrarySection` which calls `toggleCard` to expand the card. [VERIFIED — dashboard/index.html:7263-7314]

**(b)** The bio/profile panels expand because all panels are inside `.animal-details`, and the single CSS rule `.animal-card.expanded .animal-details { display: block }` shows everything when the card is expanded. This is cause **(d)** — one shared expanded state gates all panels. [VERIFIED — dashboard/index.html:908]

**(c)** Minimal fix: a `library-only` CSS modifier class on the card, added when Library opens from a collapsed card, removed on Library close or normal card toggle. One CSS rule + 3 JS lines. No panel logic changes. [VERIFIED — no regressions by code trace]
