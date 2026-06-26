# Crop Editor Corner-Resize Inversion Bug — Diagnosis

**File:** `/home/shelter/shelter-apps/dashboard/index.html`
**Resize handler:** lines 15982–16014 (the `onMove` function inside the IIFE at ~15960)
**Reported symptom:** dragging SW or NE handle resizes opposite to cursor; NW and SE work correctly.

---

## 1. Resize Handler Code (lines 15992–16009)

```javascript
// line 15992
} else if (_cropState.resizing) {
  let newS, newL, newT;
  const h = _cropState.handle;
  // Use the LARGER absolute delta to keep square
  const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;      // ← LINE 15996
  if (h === 'se') {
    newS = startW + delta;
    newL = startLeft; newT = startTop;                        // anchor: top-left
  } else if (h === 'sw') {
    newS = startW - delta;
    newL = startLeft + delta; newT = startTop;                // anchor: top-right
  } else if (h === 'ne') {
    newS = startW + delta;
    newL = startLeft; newT = startTop - delta;                // anchor: bottom-left
  } else { // nw
    newS = startW - delta;
    newL = startLeft + delta; newT = startTop + delta;        // anchor: bottom-right
  }
  const c = clampBox(newL, newT, newS);
  box.style.left = c.l + 'px';
  box.style.top = c.t + 'px';
  box.style.width = c.s + 'px';
  box.style.height = c.s + 'px';
}
```

The box is always square (aspect-ratio locked via single `s` dimension). There is a `clampBox` (line 15964) that enforces min-size 30px and keeps the box within the image bounds. No other aspect-ratio or constraint logic.

## 2. Per-Corner Analysis

A single `delta` value is computed on line 15996:

```javascript
const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
```

This picks whichever axis has the larger absolute movement and uses its **signed** value.

### Working corners (dx and dy agree in sign when moving outward):

| Corner | Outward direction | dx sign | dy sign | delta sign | Size formula | Result |
|--------|-------------------|---------|---------|------------|-------------|--------|
| **SE** | down-right | + | + | + (either) | `startW + delta` | grows ✓ |
| **NW** | up-left | − | − | − (either) | `startW - delta` → `startW + |delta|` | grows ✓ |

For SE and NW, `dx` and `dy` share the same sign when dragging outward, so it doesn't matter which the `Math.abs` comparison selects — they're interchangeable.

### Broken corners (dx and dy have OPPOSITE signs when moving outward):

| Corner | Outward direction | dx sign | dy sign | delta picks... | Size formula | Result |
|--------|-------------------|---------|---------|---------------|-------------|--------|
| **SW** | down-left | − | + | **either** | `startW - delta` | ✓ when dx (−) selected; **✗ when dy (+) selected → shrinks** |
| **NE** | up-right | + | − | **either** | `startW + delta` | ✓ when dx (+) selected; **✗ when dy (−) selected → shrinks** |

For SW and NE, `dx` and `dy` have opposite signs when the user drags outward to enlarge. The `delta` line picks one of them, but **the size formula is only correct for one sign**. When the other axis dominates, the sign flips and the box resizes in the wrong direction.

### Example — SW corner:
- User drags down-left (growing): dx = −40, dy = +60
- `Math.abs(−40) < Math.abs(+60)` → `delta = +60`
- `newS = startW − 60` → **box shrinks** (wrong — should grow)
- `newL = startLeft + 60` → **left edge jumps right** (wrong)

If dx dominated instead (dx = −60, dy = +40): delta = −60, `newS = startW − (−60) = startW + 60` → grows ✓. So the bug only manifests when the "wrong" axis dominates, which is ~50% of drags, making it feel erratic.

### Example — NE corner:
- User drags up-right (growing): dx = +40, dy = −60
- `delta = −60`
- `newS = startW + (−60)` → **box shrinks** (wrong)

## 3. Root Cause

**Line 15996:** the shared `delta` computation assumes dx and dy always agree in sign. For the SW and NE corners they don't. When the minority axis is selected by the `Math.abs` comparison, the formula applies the wrong sign.

## 4. Minimal Fix (per corner)

The fix is to ensure each corner's delta represents "outward = positive" regardless of which axis dominates.

**SW (line 16000–16002):** dx is negative outward, dy is positive outward. The current formula `startW - delta` is correct for dx (negating a negative), but wrong for dy (negating a positive). Fix: negate dy when selected.

```javascript
} else if (h === 'sw') {
  const swDelta = Math.abs(dx) > Math.abs(dy) ? dx : -dy;   // negate dy
  newS = startW - swDelta;
  newL = startLeft + swDelta; newT = startTop;
```

**NE (line 16003–16005):** dx is positive outward, dy is negative outward. The current formula `startW + delta` is correct for dx, but wrong for dy. Fix: negate dy when selected.

```javascript
} else if (h === 'ne') {
  const neDelta = Math.abs(dx) > Math.abs(dy) ? dx : -dy;   // negate dy
  newS = startW + neDelta;
  newL = startLeft; newT = startTop - neDelta;
```

**SE and NW: no change needed.**

Alternatively, the shared `delta` line could be replaced with per-corner logic, but the above is the minimal two-line change (replace the shared `delta` usage in two branches).

## 5. Interaction with Other Features

### Aspect-ratio lock / min-size clamp
`clampBox()` (line 15964) enforces min size 30px and max to image bounds. It operates on the output `(newL, newT, newS)` and is sign-agnostic — the fix doesn't affect it.

### Rotate (commit 21583b8)
`rotateCropImage()` (line 15893) operates on the source image via canvas transform, then calls `initCropBox()` to reset the crop box to a centered 70% square. It does **not** share or modify the resize handler math. The resize IIFE (line 15960) is completely independent — the fix will not affect rotate.

### saveCrop / getCropCoords
`getCropCoords()` (line 16026) reads final box position/size from inline styles. Unaffected by resize math changes.

## 6. Visual Verification

The crop modal requires user interaction within the dashboard (clicking "Edit Crop" on a photo) and cannot be driven headlessly without a browser automation tool. Diagnosis is based on source reading. The sign analysis is deterministic — the bug is unambiguous from the code.

---

**Summary:** Two-character fix — add `-` before `dy` in the delta selection for the SW and NE branches (lines 16001 and 16004). Everything else (clamp, rotate, save) is untouched.
