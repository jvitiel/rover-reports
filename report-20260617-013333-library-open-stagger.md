# Library Open Stagger — Diagnosis

**Date:** 2026-06-17 01:33 UTC  
**Scope:** Read-only diagnosis. No changes made.

---

## 1. The setTimeout

```javascript
// dashboard/index.html:7292-7304 (OPEN-from-collapsed path)
toggleCard(animalId);                          // ← IMMEDIATE: card expands
card.classList.add('library-only');             // ← IMMEDIATE: non-library panels hidden
// Wait for expansion + photo load, then show library
setTimeout(() => {                             // ← 300ms DELAY
  const content = document.getElementById(`library-content-${animalId}`);
  const btn = document.getElementById(`lib-btn-${animalId}`);
  if (content) {
    content.style.display = 'flex';            // ← DELAYED: library content shown
    const section = document.getElementById(`library-${animalId}`);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });  // ← DELAYED: scroll
  }
  if (btn) {
    btn.innerHTML = '📁 Close Library';        // ← DELAYED: button label update
  }
}, 300);
```

[VERIFIED — dashboard/index.html:7292-7304]

---

## 2. The Two-Stage Open

| Stage | Timing | What Happens | Visual Result |
|---|---|---|---|
| Stage 1 | Immediate (0ms) | `toggleCard` adds `.expanded` → `.animal-details { display: block }`. `library-only` added → non-library children hidden. | Card expands showing an empty sliver (`.animal-details` is visible but all its children are hidden — library-content is still `display: none`, other panels hidden by `library-only`) |
| Stage 2 | After 300ms | `library-content.style.display = 'flex'` → library photos appear. `scrollIntoView` fires. Button label changes. | Library content fills in, card scrolls into view |

The 300ms gap between stages is the `setTimeout`. There is **no CSS transition** on `.animal-card`, `.animal-details`, or `.expanded` — the card expand is an instant `display: none → display: block` switch. [VERIFIED — `.animal-card` CSS at line 110 has no transition; `.animal-details` has no transition; the only transition on `.animal-header` is `background 0.15s` for hover, unrelated]

The stagger is purely the `setTimeout(…, 300)`. [VERIFIED]

---

## 3. Fix Options

### (a) Reduce the timeout (e.g. 50ms)

- **Effect:** Shortens the visible gap but doesn't eliminate it.
- **Downside:** Still a flash of empty space, just faster. Doesn't address the root cause.
- **Verdict:** Band-aid. Not recommended.

### (b) Show library-content immediately, delay only the scroll

```javascript
toggleCard(animalId);
card.classList.add('library-only');
// Show library content immediately
const libContent = document.getElementById(`library-content-${animalId}`);
if (libContent) libContent.style.display = 'flex';
if (libBtn) libBtn.innerHTML = '📁 Close Library';
// Delay only the scroll to let layout settle
setTimeout(() => {
  const section = document.getElementById(`library-${animalId}`);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}, 50);
```

- **Effect:** Library content appears in the same frame as card expansion. No empty sliver. Scroll fires after a short layout-settle delay.
- **Downside:** None significant. `scrollIntoView({ behavior: 'smooth' })` already handles its own animation — a 50ms delay is just to let the browser complete the layout reflow before computing the scroll target position.
- **Does the 300ms serve a real purpose?** The original comment says "Wait for expansion + photo load." But (1) the card expansion is instant (no CSS transition to wait for), and (2) library photos are `<img>` tags already in the DOM (rendered by `renderLibrarySection` during `loadData`) — they don't need 300ms to "load" since the HTML is already injected at `afterbegin` in `.animal-details` (line 8120). The `display: flex` just un-hides them. The 300ms was likely a safety margin from before `library-only` existed, when the card expansion might have needed time for content to render. With `library-only` hiding non-library panels, there's less DOM to lay out. [INFERRED]
- **Verdict:** ✅ **Recommended.** Clean, no stagger, scroll still works.

### (c) Remove the timeout entirely

```javascript
toggleCard(animalId);
card.classList.add('library-only');
const libContent = document.getElementById(`library-content-${animalId}`);
if (libContent) libContent.style.display = 'flex';
if (libBtn) libBtn.innerHTML = '📁 Close Library';
const section = document.getElementById(`library-${animalId}`);
if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
```

- **Effect:** Everything synchronous. No delay at all.
- **Downside:** `scrollIntoView` fires before the browser has completed the layout reflow from the `display: block` / `display: flex` changes. The scroll target's position may not be computed correctly, causing the scroll to land in the wrong spot or not fire at all. This is a real risk — browsers batch layout changes and `scrollIntoView` in the same synchronous block may use stale layout geometry. [INFERRED — standard browser layout timing behavior]
- **Verdict:** Risky. The small delay in (b) avoids this.

### Recommendation

**Option (b):** Show library-content immediately (same frame as card expansion), delay only the `scrollIntoView` by ~50ms for layout settlement. This eliminates the visible stagger while keeping reliable scroll behavior.

The 300ms delay served no real purpose — there's no CSS transition to wait for, and the library HTML is already in the DOM. [VERIFIED that no transition exists; INFERRED that 300ms was an overly cautious safety margin]

---

## Conclusions

**(a) Cause:** The 300ms `setTimeout` at line 7292. Card expansion and `library-only` class are applied immediately, but library-content display and scroll wait 300ms. No CSS transition involved. [VERIFIED]

**(b) Does the delay serve a real purpose?** No. The card expansion is instant (`display: none → display: block`, no transition). The library HTML is already in the DOM. The 300ms was a safety margin, not a synchronization with any animation. [VERIFIED no transition; INFERRED on purpose]

**(c) Minimal fix:** Move `libContent.style.display = 'flex'` and button label update out of the `setTimeout` to run immediately. Keep only `scrollIntoView` inside a reduced `setTimeout(…, 50)` for layout reflow safety. 0 new lines — just restructure the existing code block. [VERIFIED — no other changes needed]
