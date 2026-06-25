# Crop Editor: Rotate Button Missing — Diagnosis

**Date:** 2026-06-25  
**Scope:** Read-only. No writes, no code changes.

---

## Summary

The rotate button markup is structurally correct, properly nested, and styled correctly. No CSS rule hides it. The most likely explanation is that the **entire footer (Cancel, Rotate, and Save)** is obscured or visually lost — not that the Rotate button specifically is hidden. The root cause is the `img.onload` race condition, which produces a broken visual state (0×0 crop box with a viewport-filling dark overlay) that makes the editor appear non-functional. Fixing the onload race fixes everything.

---

## 1. Button Markup + Container (dashboard:6533–6539)

```html
      <div class="crop-editor-footer">                                              <!-- 6533 -->
        <div class="crop-btn-group">                                                 <!-- 6534 -->
          <button class="crop-btn crop-btn-cancel" onclick="closeCropEditor()">Cancel</button>                  <!-- 6535 -->
          <button class="crop-btn crop-btn-rotate" onclick="rotateCropImage()" title="Rotate 90° clockwise">↻ Rotate</button>  <!-- 6536 -->
          <button class="crop-btn crop-btn-save" id="cropSaveBtn" onclick="saveCrop()">Save Crop</button>        <!-- 6537 -->
        </div>                                                                        <!-- 6538 -->
      </div>                                                                          <!-- 6539 -->
```

**Nesting is correct.** The Rotate button is a sibling of Cancel and Save, all three inside `crop-btn-group`, inside `crop-editor-footer`, inside `crop-editor-modal`. No stray closing tags, no misplaced elements, no comments enclosing it. The button is not after the footer, not outside the modal, not nested inside another element.

Full modal structure (dashboard:6516–6542):
```
crop-editor-overlay#cropEditor
  └── crop-editor-modal
      ├── crop-editor-header (h3 "Edit Crop" + close button)
      ├── crop-editor-body (flex:1, overflow:auto)
      │   └── crop-editor-img-wrap#cropImgWrap (position:relative)
      │       ├── img#cropEditorImg (crossorigin="anonymous")
      │       └── crop-box#cropBox (position:absolute, box-shadow:9999px)
      └── crop-editor-footer
          └── crop-btn-group (display:flex, gap:8px)
              ├── Cancel button
              ├── ↻ Rotate button ← HERE
              └── Save Crop button
```

---

## 2. CSS Analysis

### .crop-btn-rotate (dashboard:5214–5215)
```css
.crop-btn-rotate { background: #e3f2fd; border-color: #90caf9; color: #1565c0; }
.crop-btn-rotate:hover { background: #bbdefb; }
```
✅ No `display:none`, no `visibility:hidden`, no `opacity:0`, no `width:0`, no `height:0`, no `position:absolute` that would take it out of flow. Blue background, visible text color. Inherits `.crop-btn` padding/border/font.

### .crop-btn (dashboard:5208–5211)
```css
.crop-btn {
  padding: 8px 16px; border-radius: 6px; font-size: 14px;
  border: 1px solid #ccc; cursor: pointer; font-weight: 500;
}
```
Standard button styling. All three buttons share this base class.

### .crop-btn-group (dashboard:5217)
```css
.crop-btn-group { display: flex; gap: 8px; }
```
Flex row with 8px gap. No `overflow:hidden`, no `max-width`, no `flex-wrap:nowrap` (though `nowrap` is the default). Three buttons will lay out left-to-right. No fixed width that would clip.

### .crop-editor-footer (dashboard:5204–5207)
```css
.crop-editor-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-top: 1px solid #eee; gap: 8px;
}
```
Flex container with space-between (single child = left-aligned). No `overflow:hidden`, no `max-height`, no `display:none`. Full-width within the modal.

### .crop-editor-modal (dashboard:5168–5172)
```css
.crop-editor-modal {
  background: #fff; border-radius: 12px; width: 90vw; max-width: 800px;
  max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
```
**Key property: `overflow: hidden`.** The modal clips anything that extends beyond its bounds. But in a flex column layout with `max-height: 90vh`, the children are laid out in order:
1. Header: auto height (~44px)
2. Body: `flex: 1` (takes remaining space)
3. Footer: auto height (~50px)

The body has `flex: 1` (= `flex-grow:1; flex-shrink:1; flex-basis:0`). It shrinks to accommodate header + footer, and grows to fill remaining space. The footer gets its auto height. Even on a small viewport (375px phone, 90vh = 337px), the footer (~50px) + header (~44px) = 94px leaves 243px for the body — the footer is NOT clipped.

### No media queries affecting crop buttons
```
grep -n '@media.*crop\|crop.*@media' → 0 matches
```

### No display:none or visibility:hidden on crop elements
```
grep -n 'crop.*display.*none\|crop.*visibility.*hidden' → 0 matches (only .crop-editor-overlay default display:none, toggled by .open)
```

**VERDICT: No CSS rule hides the Rotate button.** It should render exactly like Cancel and Save — visible, clickable, in the footer bar.

---

## 3. Rendered-But-Hidden vs Not-Rendered

The button is **in the served HTML** (curl confirms, 3 matches for `crop-btn-rotate`). It has no CSS that removes it from rendering. No JavaScript removes it from the DOM. It IS in the DOM and SHOULD be rendered.

**The button is rendered but potentially visually obscured** by the broken state of the editor.

---

## 4. No Structural Markup Break

The Stage 2 insertion placed the Rotate button between Cancel and Save inside `crop-btn-group`. The nesting is:

```
crop-btn-group (flex container)
  ├── Cancel (flex item)
  ├── Rotate (flex item)  ← inserted here
  └── Save (flex item)
```

No extra/missing divs. No broken tags. The group goes from 2 buttons to 3 buttons — flex layout handles this naturally (gap:8px between each). No structural break.

---

## 5. Are Cancel/Save Visible?

**This is the key disambiguation the diagnosis cannot resolve without John's browser.** Two scenarios:

### Scenario A: Whole footer invisible (Cancel + Rotate + Save all hidden)
This would mean the footer is clipped or obscured. The `overflow: hidden` on the modal wouldn't clip it (flex layout allocates space for the footer). BUT the crop-box's 9999px box-shadow could visually darken the entire modal if the body's `overflow:auto` doesn't properly clip it.

However, CSS spec says `overflow:auto` clips descendant box-shadow. And the footer is a sibling (not child) of the body — it paints AFTER the body in DOM order, on top of any leaked shadow. So the footer should be visible even if the shadow leaks.

### Scenario B: Only Rotate missing (Cancel + Save visible)
No CSS explanation for this. The button is identically styled (inherits `.crop-btn`). Unless the ↻ character (U+21BB) causes a rendering issue in John's font, but the text " Rotate" would still render and the button would take up space.

**Most likely: Scenario A.** John opened the editor, saw a broken state (dark overlay, sideways image, no crop box), and reported "no rotate button" because that's the feature he was looking for. Cancel/Save may also be hard to see if the overall modal is in a visually broken state. The footer IS there, but in the confusion of a non-functional editor, John may not have looked specifically at the footer buttons.

---

## 6. The Dark Overlay Effect (Why the Editor Looks Broken)

When `initCropBox` doesn't run (onload race), the crop box (`#cropBox`) has:
- `position: absolute` with no `left`/`top`/`width`/`height` → 0×0 at origin of wrap
- `box-shadow: 0 0 0 9999px rgba(0,0,0,0.45)` → dark overlay from a point source

A 0×0 element with a 9999px box-shadow creates a **solid dark rectangle** (no "hole" for the crop area) that fills the body. The body's `overflow: auto` clips this to the body bounds. The effect:

- The entire body area appears darkened at 45% opacity
- The image is visible but dim through the overlay
- The crop box handles (white circles) cluster at the top-left corner
- There's no visible crop region to interact with

This looks like a broken editor, and in that state John may conclude "nothing works" — no crop box, image sideways, and not notice the footer buttons below the dark area.

---

## 7. Root Cause + Combined Fix Direction (Stage 2b)

### Root cause
The `img.onload` race condition (diagnosed in prior report) causes `initCropBox()` to not run. This produces a broken visual state (dark overlay, no crop box) that makes the editor appear completely non-functional. The rotate button IS in the footer but is either:
- Not noticed in the broken state, OR
- Hard to see if the dark overlay bleeds past the body (browser rendering edge case)

### Combined fix for Stage 2b (both issues):

**Fix 1: img.onload race** — set handler BEFORE src, add `img.complete` fallback, wrap in `requestAnimationFrame`:
```js
function openCropEditor(mediaId, animalId, originalUrl, event) {
  // ... state setup ...
  const img = document.getElementById('cropEditorImg');
  img.onload = function() {
    requestAnimationFrame(function() { initCropBox(); });
  };
  overlay.classList.add('open');
  img.src = originalUrl;
  if (img.complete && img.naturalWidth > 0) {
    requestAnimationFrame(function() { initCropBox(); });
  }
}
```

**Fix 2: Defensive crop-box visibility** — hide the crop box until `initCropBox` runs, preventing the dark overlay from appearing in the broken state:
```css
/* Start hidden; initCropBox shows it */
#cropBox { display: none; }
```
Then in `initCropBox`:
```js
box.style.display = 'block';
```
And in `closeCropEditor` (reset for next open):
```js
document.getElementById('cropBox').style.display = 'none';
```

This prevents the 9999px shadow from creating a dark overlay when `initCropBox` hasn't run, ensuring the editor always looks clean on open. Fix 1 ensures `initCropBox` actually runs (showing the crop box). Fix 2 is defense-in-depth.

**No button-specific fix needed** — the button markup and CSS are correct. Once the editor renders properly (initCropBox runs, dark overlay is properly positioned), the footer will be clearly visible with all three buttons.
