# Staging Badge Font + Scroll Fix — Implementation Report

**Date:** 2026-06-24  
**Commit:** `deb7ca1` — `staging-staff/app.js` + `staging-staff/styles.css` (4 insertions, 3 deletions)

---

## FIX 1 — Bigger Font

### Before (staging-staff/styles.css, .behavior-btn)
```css
font-size: 0.75rem;      /* ~12px */
line-height: 1.15;
padding-top: 4px;
padding-bottom: 4px;
```
Content height: 40 - 4 - 8 = 28px. Two lines: 27.6px (0.4px headroom).

### After
```css
font-size: 0.85rem;      /* ~13.6px — matches original single-line size */
line-height: 1.15;
padding-top: 2px;
padding-bottom: 2px;
```
Content height: 40 - 4 - 4 = 32px. Two lines: 2 × 15.64px = 31.28px (0.72px headroom).

### Box unchanged
- Height: 40px (`.card-btn-small { height: 40px }` — not overridden) ✅
- Width: `flex: 1` (unchanged) ✅
- Position: 4th element in `.card-actions-row` (unchanged) ✅
- Only internal vertical padding reduced (8px → 4px total) to give text more room

---

## FIX 2 — Profiler Opens at Top

### Before (staging-staff/app.js:2563–2568)
```js
  activeModule = 'animal-profile-recorder';
  showSection('animalProfile');
  showBehaviorRecorder({ animalId, name, photoUrl });
}
```

### After (staging-staff/app.js:2563–2569)
```js
  activeModule = 'animal-profile-recorder';
  showSection('animalProfile');
  showBehaviorRecorder({ animalId, name, photoUrl });
  window.scrollTo(0, 0);
}
```

`window.scrollTo(0, 0)` added ONLY in `openBehaviorForSession` — the badge deep-link path. `showSection` itself was NOT modified (no global scroll reset).

---

## Verification

### Font larger + box unchanged ✅
Font bumped from 0.75rem (12px) to 0.85rem (13.6px) — matches the original single-line font size. Two rows fit the 40px box: 31.28px in 32px content area (0.72px headroom). No clipping, no overflow.

### Profiler opens at top ✅
`window.scrollTo(0, 0)` fires after the profiler section is shown and content rendered. Navigating from a scrolled-down activity list lands at the top of the profiler.

### Green badge inert ✅
`pointer-events: none` still active — stays green on tap, non-clickable.

### Red/orange navigate ✅
`openBehaviorForSession` resolves via `serverSessionId` or `serverActiveSessions` fallback, opens profiler with correct animal pre-selected.

### Normal profiler entry unaffected ✅
The home-screen module entry (app.js:363–365) does NOT go through `openBehaviorForSession`, so the `scrollTo` line doesn't fire. `showSection` is unchanged.

### Production untouched ✅
`staff.4lgshelterapp.duckdns.org` has 0 instances of the new `scrollTo` or `0.85rem` behavior-btn styling.

### All 3 render sites consistent ✅
All three badge render sites share `.behavior-btn` CSS and call `openBehaviorForSession` for clickable badges.

---

## Commit

```
deb7ca1 staging: bump badge font to 0.85rem, scroll profiler to top on badge deep-link
 2 files changed, 4 insertions(+), 3 deletions(-)
 staging-staff/app.js
 staging-staff/styles.css
```
