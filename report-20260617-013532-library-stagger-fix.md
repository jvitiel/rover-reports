# Library Open Stagger Fix — Implementation Report

**Date:** 2026-06-17 01:35 UTC  
**Commit:** `0e84a53`  
**Scope:** dashboard/index.html ONLY. No server changes, no rebuild, no restart.

---

## The Change

**Before (lines 7290-7304):**

```javascript
toggleCard(animalId);
card.classList.add('library-only');
// Wait for expansion + photo load, then show library
setTimeout(() => {
  const content = document.getElementById(`library-content-${animalId}`);
  const btn = document.getElementById(`lib-btn-${animalId}`);
  if (content) {
    content.style.display = 'flex';
    const section = document.getElementById(`library-${animalId}`);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (btn) {
    btn.innerHTML = '📁 Close Library';
  }
}, 300);
```

**After (lines 7290-7299):**

```javascript
toggleCard(animalId);
card.classList.add('library-only');
const content = document.getElementById(`library-content-${animalId}`);
const btn = document.getElementById(`lib-btn-${animalId}`);
if (content) content.style.display = 'flex';
if (btn) btn.innerHTML = '📁 Close Library';
setTimeout(() => {
  const section = document.getElementById(`library-${animalId}`);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}, 50);
```

[VERIFIED]

---

## What Runs Immediately vs Delayed

| Action | Before | After |
|---|---|---|
| `toggleCard(animalId)` | Immediate | Immediate (unchanged) |
| `card.classList.add('library-only')` | Immediate | Immediate (unchanged) |
| `content.style.display = 'flex'` | Delayed 300ms | **Immediate** |
| `btn.innerHTML = '📁 Close Library'` | Delayed 300ms | **Immediate** |
| `scrollIntoView({ behavior: 'smooth' })` | Delayed 300ms | **Delayed 50ms** |

Library content and button label now render in the same frame as card expansion — no empty sliver. Only `scrollIntoView` waits 50ms for layout reflow. [VERIFIED]

---

## Unchanged Code

- `card.classList.add('library-only')` — still runs immediately after `toggleCard` [VERIFIED]
- CLOSE path (line ~7273-7284) — untouched [VERIFIED]
- `toggleCard` function (line ~7844) — untouched [VERIFIED]
- Already-expanded branch (line ~7300-7308, the `else` block) — untouched [VERIFIED]
- Library rendering (`renderLibrarySection`) — untouched [VERIFIED]
- All panel logic — untouched [VERIFIED]

---

## git diff --stat

```
dashboard/index.html | 19 +++++++------------
 1 file changed, 7 insertions(+), 12 deletions(-)
```

Only dashboard/index.html modified. Net reduction of 5 lines (cleaner code). [VERIFIED]

---

## Commit

```
0e84a53 — dashboard: remove library-open stagger (show content immediately, 
          delay only scrollIntoView 50ms)
```

[VERIFIED]
