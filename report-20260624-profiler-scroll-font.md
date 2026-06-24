# Profiler Scroll + Font Headroom — Diagnosis

**Date:** 2026-06-24  
**Scope:** Read-only. Two issues from staging testing (b8f16c0).

---

## Issue 1: Profiler Opens Scrolled to Bottom

### Trace

1. **`openBehaviorForSession`** (staging-staff/app.js:2546): resolves the session/animal, then calls:
2. **`showSection('animalProfile')`** (app.js:302–305): hides all sections, shows `#animalProfileSection` via `.active` class. **No scroll reset.**
3. **`showBehaviorRecorder(animal)`** (app.js:2026): builds the profiler HTML into `#animalProfileContent`. **No scroll reset.**

```js
// showSection — app.js:302
function showSection(name) {
  Object.values(sections).forEach(s => s?.classList.remove('active'));
  if (sections[name]) sections[name].classList.add('active');
  if (name === 'home') currentView = 'home';
  // ← no scroll reset
}
```

### Root Cause: Inherited Window Scroll Position

The app uses **window scroll** (not per-section scroll containers). Sections are plain `display: block/none` (styles.css:126–131) with no `overflow-y: auto`. When the user is on the activity list, they're often scrolled down (multiple animal cards). `showSection` hides the activity section and shows the profiler section, but the **window's scrollTop stays where it was**. The profiler content is shorter than the activity list, so the inherited scroll position puts the viewport at or near the bottom.

### Scroll Container

The scroll container is **`window`** (or equivalently `document.documentElement`). The sections don't have their own scrollable areas — they flow in the page.

### Fix Location

Add `window.scrollTo(0, 0)` in `openBehaviorForSession` after `showSection('animalProfile')` (app.js:2565–2566):

```js
showSection('animalProfile');
window.scrollTo(0, 0);  // ← add here
showBehaviorRecorder({ animalId, name, photoUrl });
```

### Other Profiler Entries

The normal profiler entry via the module menu (app.js:363–365) also calls `showSection('animalProfile')` without scrolling:

```js
case 'animal-profile-recorder':
  showSection('animalProfile');
  renderBehaviorModule('animalProfileContent');
  break;
```

But this entry comes from the **home screen** (module grid), which is typically at scroll-top, so the inherited position isn't noticeable. The deep-link from activity cards is the problematic path because the activity list is scrollable.

For consistency, `window.scrollTo(0, 0)` could also go in `showSection` itself (so ALL section switches reset scroll), but the safest minimal fix is in `openBehaviorForSession` only, since other section switches may intentionally preserve scroll (e.g. returning to the activity list).

The only existing scroll resets in the app are for the long-message overlay (app.js:237, 242–243) — no section switch resets scroll.

---

## Issue 2: Font Headroom

### Current State

| Property | Value |
|----------|-------|
| Box height | 40px |
| Border | 2 × 2px = 4px |
| Padding | 2 × 4px = 8px |
| Content height | **28px** |
| Font | 0.75rem (~12px) |
| Line height | 1.15 |
| Two lines | 2 × 13.8px = **27.6px** |
| Headroom | **0.4px** |

### Maximum Font Options

All options keep the 40px box unchanged — only padding and font adjust:

| Padding (v) | Content | Font | Line-height | Two lines | Headroom | Verdict |
|-------------|---------|------|-------------|-----------|----------|---------|
| 4px | 28px | 0.75rem (12px) | 1.15 | 27.6px | 0.4px | Current |
| 4px | 28px | 0.8rem (12.8px) | 1.05 | 26.88px | 1.12px | ✅ Safe |
| 3px | 30px | 0.8rem (12.8px) | 1.15 | 29.44px | 0.56px | ✅ Safe, readable |
| 3px | 30px | 0.85rem (13.6px) | 1.1 | 29.92px | 0.08px | ⚠️ Too tight |
| 2px | 32px | 0.85rem (13.6px) | 1.15 | 31.28px | 0.72px | ✅ Safe, near original size |
| 2px | 32px | 0.9rem (14.4px) | 1.05 | 30.24px | 1.76px | ✅ Safe |

### Recommendation

**0.8rem / line-height 1.15 / padding 3px** is the sweet spot:
- Font goes from 12px → 12.8px (7% larger, visibly bigger)
- `line-height: 1.15` stays readable (not too compressed)
- 0.56px headroom is safe across browsers/rendering engines
- Padding reduction minimal (4px → 3px, barely perceptible)

If John wants to go bigger: **0.85rem / line-height 1.15 / padding 2px** gets close to the original single-line font size (13.6px vs 13.6px original) but uses nearly all available space (0.72px headroom). This trades all padding headroom for font size — still safe but tight.

The absolute max without clipping: **0.9rem (14.4px) / line-height 1.05 / padding 2px** = 30.24px in 32px content (1.76px headroom), but `line-height: 1.05` makes the two rows visually cramped.
