# Remove Reset-to-Auto Button from Crop Editor

**Date:** 2026-06-22 21:52 UTC  
**Commit:** `a5ee154`  
**File:** `dashboard/index.html` (-8 lines)

---

## Removed Elements

### 1. Button markup (was line 6495)
```html
<button class="crop-btn crop-btn-reset" id="cropResetBtn" onclick="resetCropToAuto()" disabled title="Requires server endpoint (follow-up)">Reset to Auto</button>
```

### 2. CSS class (was line 5203)
```css
.crop-btn-reset { background: #f5f5f5; color: #666; font-size: 13px; }
```

### 3. JS handler stub (was lines 15738-15743)
```javascript
function resetCropToAuto() {
  // Reset-to-Auto requires a server endpoint to clear crop_locked
  // and re-run auto-crop. That endpoint does not exist yet.
  // This button is disabled until the follow-up endpoint is added.
  alert('Reset to Auto requires a server endpoint (coming in follow-up).');
}
```

## After

Footer now contains only Save and Cancel:
```html
<div class="crop-editor-footer">
  <div class="crop-btn-group">
    <button class="crop-btn crop-btn-cancel" onclick="closeCropEditor()">Cancel</button>
    <button class="crop-btn crop-btn-save" id="cropSaveBtn" onclick="saveCrop()">Save Crop</button>
  </div>
</div>
```

## Dangling Reference Check

```
$ grep -n 'cropReset\|resetCropToAuto\|Reset to Auto\|crop-btn-reset' dashboard/index.html
(exit 1 — zero hits) ✅
```

## Verification

- Dashboard loads: HTTP 200 ✅
- Save button present (`cropSaveBtn`, `saveCrop()`) ✅
- Cancel button present (`closeCropEditor()`) ✅
- No reference to removed button/handler (zero grep hits) ✅
- Crop editor modal, box overlay, coordinate mapping, open/save handlers untouched ✅
- Lightbox/make-video/matcher untouched ✅
