# Adoptions UI Phase 3: Notes + Adopted Popups

## 1. Notes Popup

### Cell Render
- Non-empty notes: clickable 📝 icon (`cursor:pointer`, `title="Edit notes"`)
- Empty notes: clickable ➕ icon at `opacity:0.3` (`title="Add notes"`)
- Cell has `onclick="openAdoptionNotesModal(${a.id})"` [VERIFIED]

### Modal
Reuses `pin-modal-overlay` + `pin-modal` pattern (same CSS classes as pinModal, healthAssessmentModal):

```html
<div class="pin-modal-overlay" id="adoptionNotesModal">
  <div class="pin-modal" style="width: 90%; max-width: 480px;">
    <h3 id="adoptionNotesTitle">📝 Notes</h3>
    <textarea id="adoptionNotesText" rows="6" ...></textarea>
    <div class="pin-modal-buttons">
      <button class="cancel-btn" onclick="closeAdoptionNotesModal()">Cancel</button>
      <button class="submit-btn" onclick="saveAdoptionNotes()">Save</button>
    </div>
  </div>
</div>
```

Title dynamically set to `📝 Notes — {applicantName}`. Textarea prefilled with current `cached.notes`. [VERIFIED]

### Save Flow
```js
gatedFetch(`/api/adoption-applications/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notes: text }),  // snake_case key
})
```
On success: `cached.notes = text`, close modal, re-render table. On failure: alert, modal stays open. [VERIFIED]

### Close Mechanics
- Cancel button → `closeAdoptionNotesModal()`
- Click outside overlay → same
- Escape key → same (via document `keydown` listener checking `.active` class)
[VERIFIED — all three paths]

---

## 2. Approved → Adopted Popup (Required Name)

### Intercept in adoptionStatusChange
When `newStatus === 'approved'`:
1. Record `_adoptionAdoptedPriorStatus = cached.status` (the PRIOR status before click)
2. Set `_adoptionAdoptedEditOnly = false` (this is an approval flow)
3. Prefill input with current `cached.adopted` (if any)
4. **Save button starts DISABLED** — `disabled = !input.value.trim()` [VERIFIED]
5. Open modal, focus input
6. **Return without PATCHing** — no status change yet [VERIFIED]

Non-approved statuses (pending/in_progress/declined) bypass the popup — direct PATCH as Phase 2. [VERIFIED]

### Save Button Enable/Disable
```js
document.getElementById('adoptionAdoptedInput').addEventListener('input', function() {
  if (!_adoptionAdoptedEditOnly) {
    document.getElementById('adoptionAdoptedSaveBtn').disabled = !this.value.trim();
  }
});
```
Empty/whitespace-only → Save disabled. Non-empty → Save enabled. Only applies to approval flow (`!_adoptionAdoptedEditOnly`). [VERIFIED]

### Save Flow (Approval)
```js
gatedFetch(`/api/adoption-applications/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'approved', adopted: name }),  // both in one PATCH
})
```
On success: `cached.status = 'approved'` + `cached.adopted = name`, close modal, re-render. On failure: alert, re-render (reverts radio to cached state). [VERIFIED]

### Cancel / Close-Without-Saving (Approval Revert)
`closeAdoptionAdoptedModal()`:
- If `!_adoptionAdoptedEditOnly && _adoptionAdoptedPriorStatus`: calls `renderAdoptionsTable()` which re-renders radios from cache (cache still has prior status — never updated). Radio visually reverts to prior status.
- **No PATCH call made.** Status stays at prior value. [VERIFIED]
- Triggered by: Cancel button, click outside overlay, Escape key. [VERIFIED]

---

## 3. Independent Adopted Edit (No Status Change)

### Cell Render
- Non-empty adopted: clickable text with `cursor:pointer`, `title="Edit adopted name"`
- Empty adopted: clickable `—` at `opacity:0.3`, `title="Set adopted name"`
- Cell has `onclick="openAdoptionAdoptedEditModal(${a.id})"` [VERIFIED]

### openAdoptionAdoptedEditModal
- Sets `_adoptionAdoptedEditOnly = true`
- Save button **always enabled** (can clear the name)
- Same modal as approval flow — but `saveAdoptionAdopted()` sends only `{ adopted: name }`, no `status` field [VERIFIED]

### Save Flow (Independent)
```js
body = { adopted: name };  // no status key
// _adoptionAdoptedEditOnly is true, so status is NOT included
```
On success: `cached.adopted = name` (status untouched), close, re-render. [VERIFIED]

---

## Modal Pattern Reuse

Both modals use the existing `pin-modal-overlay` + `pin-modal` classes:
- Same overlay (`position:fixed`, `rgba(0,0,0,0.5)`, `z-index:1000`, `display:flex` when `.active`)
- Same show/hide via `.classList.add/remove('active')`
- Same button classes (`cancel-btn`, `submit-btn`)
- Click-outside close via `addEventListener('click', function(e) { if (e.target === this) ... })`
- Escape key via shared `document.addEventListener('keydown', ...)` checking `.active`
[VERIFIED — no new modal system invented]

## All Saves Use gatedFetch + Snake Case + Cache Update

| Action | Body Keys | Cache Update |
|--------|-----------|-------------|
| Notes save | `{ notes: text }` | `cached.notes = text` |
| Approval save | `{ status: 'approved', adopted: name }` | `cached.status + cached.adopted` |
| Independent adopted edit | `{ adopted: name }` | `cached.adopted = name` |
| Non-approved status (unchanged) | `{ status: newStatus }` | `cached.status` |

All via `gatedFetch('/api/adoption-applications/${id}', { method:'PATCH', ... })`. [VERIFIED]

## Unchanged

- Checkbox wiring (adoptionToggle) — 5 references, untouched [VERIFIED]
- Non-approved radio behavior — direct PATCH, untouched [VERIFIED]
- Sort/search (sortAdoptionsBy, filterAdoptions, renderAdoptionsTable) — untouched [VERIFIED]
- GET handler, PATCH handler — server.ts not in diff [VERIFIED]
- gatedFetch function — 1 definition, untouched [VERIFIED]
- No new CSS added — reuses existing pin-modal-overlay/pin-modal classes [VERIFIED]

## Static File

Dashboard is static HTML — no build step. Browser refresh picks up changes after service restart. [VERIFIED]

## git diff --stat

```
 dashboard/index.html | 195 +++++++++++++++++++++++++++++++++++++++++++++++++--
 1 file changed, 188 insertions(+), 7 deletions(-)
```

1 file only. [VERIFIED]

## Commit

```
[master 427fe8a] Adoptions UI Phase 3: notes popup; approved requires adopted name
  (revert status on cancel); independent adopted edit (gated PATCH)
 1 file changed, 188 insertions(+), 7 deletions(-)
```
