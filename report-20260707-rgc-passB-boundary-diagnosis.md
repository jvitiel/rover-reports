# RGC Pass B — Boundary Diagnosis (Read-Only)

File: `/home/shelter/shelter-apps/dashboard/index.html` (16,619 lines)

## 1. TAB BUTTON

**Line 5278:**
```html
<button class="tab-btn" onclick="handleRgcTabClick()" id="tab-rgc" style="display: none">📬 RG Cares</button>
```

**Classification: RGC-ONLY** — `style="display: none"`, calls `handleRgcTabClick()` (RGC-only function). No other tab references `handleRgcTabClick`. [VERIFIED — grep shows only 2 refs: line 5278 (call) + line 15707 (definition)]

**Co-removal:** Remove this `<button>` line. The adjacent tab buttons (line 5277 wellbeing, line 5279 volunteers) are independent — no shared markup. [VERIFIED]

## 2. TAB CONTENT PANEL

**Lines 5979–6105:**
```
5979:  <div class="tab-content" id="content-rgc">
...
6105:  </div><!-- End RGC Tab -->
```

The `<!-- End RGC Tab -->` comment at line 6105 marks the exact close. [VERIFIED — awk div-depth counter confirms closure at line 6105]

**Classification: RGC-ONLY** — Contains only RGC stats bar, RGC request list/table, RGC thread view, RGC admin section. No shared elements. [VERIFIED — all element IDs within are `rgc*` prefixed]

**Boundary safety:** Line 6107 is `<!-- Intake Tab Content -->` + `<div class="tab-content" id="content-intake">`. Clean sibling boundary. [VERIFIED]

## 3. JS HANDLERS

### Main `<script>` block (lines 6605–15509) — RGC section: lines 11225–11683

**RGC-ONLY functions (all in lines 11225–11683):**

| Function | Line | Called from | RGC-ONLY? |
|----------|------|------------|-----------|
| `loadRGCData()` | 11231 | switchTab (9215), refreshCurrentTab (9241), closeRGCThread (11467) | RGC-ONLY — callers are RGC branches |
| `filterRGCRequests()` | 11260 | content-rgc HTML onclick (6000-6003) | RGC-ONLY |
| `renderRGCTable()` | 11284 | loadRGCData (11248), filterRGCRequests (11281) | RGC-ONLY |
| `openRGCThread()` | 11365 | table row onclick (11308), setRGCStatus (11516), sendRGCResponse (11557) | RGC-ONLY |
| `updateRGCStatusButtons()` | 11404 | openRGCThread (11390) | RGC-ONLY |
| `renderRGCMessages()` | 11427 | openRGCThread (11393) | RGC-ONLY |
| `closeRGCThread()` | 11462 | content-rgc HTML onclick (6034) | RGC-ONLY |
| `assignRGCRequest()` | 11470 | content-rgc HTML onchange (6050) | RGC-ONLY |
| `setRGCStatus()` | 11490 | content-rgc HTML onclick (6054-6057) | RGC-ONLY |
| `sendRGCResponse()` | 11522 | content-rgc HTML onclick (6080) | RGC-ONLY |
| `loadRGCContacts()` | 11567 | loadRGCData (11249), addRGCContact (11637), toggleRGCContact (11654) | RGC-ONLY |
| `renderRGCContacts()` | 11581 | loadRGCContacts (11574) | RGC-ONLY |
| `addRGCContact()` | 11606 | content-rgc HTML onclick (6098) | RGC-ONLY |
| `toggleRGCContact()` | 11643 | content-rgc rendered HTML onclick | RGC-ONLY |
| `resetRGCPin()` | 11660 | content-rgc rendered HTML onclick | RGC-ONLY |

[VERIFIED — every call site is either within the RGC JS block or within the RGC HTML panel (5979–6105)]

**RGC-ONLY variables (lines 11227–11229):**
- `let rgcData = [];` (line 11227)
- `let rgcCurrentFilter = 'all';` (line 11228)
- `let rgcCurrentRequestId = null;` (line 11229)

[VERIFIED — referenced only within RGC functions]

### Second `<script>` block (lines 15699–16617) — RGC PIN section: lines 15700–15747

**RGC-ONLY functions:**

| Function | Line | Called from | RGC-ONLY? |
|----------|------|------------|-----------|
| `initPinLock()` | 15703 | line 15776 (inline call) | RGC-ONLY |
| `handleRgcTabClick()` | 15707 | tab button onclick (5278) | RGC-ONLY |
| `showPinModal()` | 15711 | handleRgcTabClick (15708), settings-gear onclick (15579) | RGC-ONLY |
| `hidePinModal()` | 15718 | submitPin (15726), pinModal click-outside (15743-15746) | RGC-ONLY |
| `submitPin()` | 15722 | pinInput Enter handler (15737) | RGC-ONLY |

[VERIFIED — grep confirms all call sites are RGC-only (tab button, settings gear, PIN modal)]

**RGC-ONLY variable:**
- `const RGC_PIN = '10970';` (line 15701)

[VERIFIED — referenced only by submitPin]

**RGC-ONLY event listeners (lines 15735–15747):**
- `pinInput` keypress Enter → `submitPin()` (line 15735-15739)
- `pinModal` click-outside → `hidePinModal()` (line 15742-15746)

[VERIFIED — both reference only RGC elements/functions]

## 4. THE `<script>` BOUNDARY (critical — this broke the last attempt)

### Two `<script>` blocks:

| Block | Lines | Contents |
|-------|-------|----------|
| Main | 6605–15509 | All tab logic (Media, Profiles, Adoptions, Stories, Events, Activities, Feeding, Wellbeing, **RGC**, Intake, Volunteers, etc.) |
| Second | 15699–16617 | PIN lock (RGC), adoption modal listeners, `initPinLock()` call, `adoptionsCache` + all Adoptions functions, `profilesCache` + all Profiles functions, Crop Editor |

### ⚠️ CRITICAL: The second `<script>` block (15699–16617) contains BOTH RGC and shared code

**Structure of the second `<script>` block:**

```
15699: <script>
15700-15701:   RGC_PIN const                              ← RGC-ONLY
15703-15733:   RGC PIN functions (5 functions)             ← RGC-ONLY
15735-15747:   RGC PIN event listeners (pinInput, pinModal)← RGC-ONLY
15749-15771:   Adoption modal event listeners              ← SHARED (adoptionNotesModal, adoptionAdoptedModal, Escape handler)
15776:         initPinLock();                              ← RGC-ONLY (orphan call)
15778-15779:   videoPrompt wire-up                         ← SHARED
15781-16615:   Adoptions Tab + Profiles Tab + Crop Editor  ← SHARED
16617: </script>
```

**The exact danger zone:** Lines 15700–15747 (RGC PIN code + RGC event listeners) and line 15776 (`initPinLock()` call) are RGC-ONLY. Everything else in this `<script>` block (lines 15749–16615) is SHARED.

**What broke last time:** The previous removal attempt (commit 48d0c9d) removed a region from this second `<script>` block that included the shared `adoptionsCache`/`profilesCache` declarations, causing TDZ errors ("Cannot access 'adoptionsCache' before initialization"). The `initPinLock()` orphan call also threw "not defined" after its function was removed.

**Safe removal boundaries within the second `<script>` block:**
1. Remove lines 15700–15747 (RGC_PIN, 5 functions, 2 event listeners)
2. Remove line 15776 (`initPinLock();`)
3. **KEEP** the `<script>` tag (line 15699) and `</script>` tag (line 16617)
4. **KEEP** everything from line 15749 onward (adoption modal listeners, videoPrompt wire-up, adoptionsCache, profilesCache, all Adoptions/Profiles/Crop functions)

### Main `<script>` block (6605–15509) — safe boundary

The RGC section (lines 11225–11683) is a self-contained block between `// ============ RG Cares Tab ============` and `// ============ Intake Tab ============`. No shared declarations are inside it. The preceding code ends at line 11223 (end of Events/Stories section), and the following code starts at line 11685 (Intake Tab). Removing lines 11225–11683 is safe — no shared variables or functions cross the boundary. [VERIFIED — grep confirms all `rgc*` variables/functions are only referenced within the RGC block or RGC HTML panel]

## 5. CSS

### RGC-ONLY CSS (lines 3892–4335)

```
3892:    /* ============ RG Cares Tab Styles ============ */
...
4335:    .deadline-text.ok { color: var(--gray-600); }
```

All classes prefixed `rgc-` (`.rgc-stats-bar`, `.rgc-stat`, `.rgc-filter-btn`, `.rgc-table`, `.rgc-status-badge`, `.rgc-category-badge`, `.rgc-back-btn`, `.rgc-thread-*`, `.rgc-message-*`, `.rgc-attachment-link`, `.rgc-contact-*`, `.rgc-add-btn`, `.rgc-send-btn`, `.deadline-text.*`).

**Classification: RGC-ONLY** [VERIFIED — grep for every `.rgc-` class shows usage only within the RGC HTML panel (5979–6105) or RGC JS renderRGCTable/renderRGCMessages (11284–11460)]

**Boundary:** Line 4337 starts `/* ============ Intake Tab Styles ============ */`. Clean section boundary. [VERIFIED]

### RGC-ONLY CSS: PIN Lock section (lines 4570–4667)

```
4570:    /* ============ PIN Lock Styles ============ */
4571:    #tab-rgc.tab-hidden { display: none; }
4573:    .settings-gear { ... }
4591:    .settings-gear:hover { ... }
4593:    .pin-modal-overlay { ... }
...
4667:    .pin-error.visible { display: block; }
```

**⚠️ CRITICAL: `.pin-modal-overlay` and `.pin-modal` CSS is SHARED**

The `.pin-modal-*` classes are used by **5 modals**:

| Modal | ID | Class | RGC-only? |
|-------|-----|-------|-----------|
| PIN lock modal | `pinModal` | `pin-modal-overlay` + `pin-modal` | RGC-ONLY |
| Adoption Notes | `adoptionNotesModal` | `pin-modal-overlay` + `pin-modal` | SHARED |
| Adoption Adopted | `adoptionAdoptedModal` | `pin-modal-overlay` + `pin-modal` | SHARED |
| Health Assessment | `healthAssessmentModal` | `pin-modal-overlay` + `pin-modal` | SHARED |
| Seizure Record | `seizureRecordModal` | `pin-modal-overlay` + `pin-modal` | SHARED |

[VERIFIED — grep `pin-modal` in HTML shows all 5 modals at lines 15582, 15595, 15607, 15619, 15657]

**Safe removal from this CSS block:**
- `#tab-rgc.tab-hidden { display: none; }` (line 4571) — **RGC-ONLY, safe to remove** [VERIFIED]
- `.settings-gear` + `.settings-gear:hover` (lines 4573–4591) — **RGC-ONLY, safe to remove** [VERIFIED — grep shows only the settings gear button at line 15579, which is RGC-only]
- `.pin-error` + `.pin-error.visible` (lines 4661–4667) — **RGC-ONLY, safe to remove** — only used by `id="pinError"` in the PIN modal [VERIFIED — grep `pin-error` shows only line 4661, 4667 (CSS) and 15585 (HTML pinError span), 15715 (JS pinError reference)]

**MUST KEEP:**
- `.pin-modal-overlay` (lines 4593–4602) — SHARED
- `.pin-modal-overlay.active` (line 4602) — SHARED
- `.pin-modal` (lines 4604–4612) — SHARED
- `.pin-modal h3` (lines 4612–4617) — SHARED
- `.pin-modal input` (lines 4617–4627) — SHARED
- `.pin-modal input:focus` (lines 4627–4631) — SHARED
- `.pin-modal-buttons` (lines 4631–4636) — SHARED
- `.pin-modal-buttons button` (lines 4636–4645) — SHARED
- `.pin-modal-buttons .cancel-btn` (lines 4645–4649) — SHARED
- `.pin-modal-buttons .cancel-btn:hover` (lines 4649–4652) — SHARED
- `.pin-modal-buttons .submit-btn` (lines 4652–4657) — SHARED
- `.pin-modal-buttons .submit-btn:hover` (lines 4657–4661) — SHARED

[VERIFIED — all `.pin-modal-*` classes used by at least 4 shared modals]

## 6. switchTab / tab-registration

Two `'rgc'` branches to remove:

**Line 9214–9215 in `switchTab()`:**
```javascript
      } else if (tabName === 'rgc') {
        loadRGCData();
```
Remove these 2 lines. The surrounding `if/else if` chain continues with `} else if (tabName === 'intake')` — removing the rgc branch leaves the chain intact. [VERIFIED]

**Lines 9240–9241 in `refreshCurrentTab()`:**
```javascript
      } else if (currentTab === 'rgc') {
        loadRGCData();
```
Remove these 2 lines. Same `if/else if` chain structure. [VERIFIED]

**No tab registry array exists** — tab switching is purely DOM-based (`tab-${tabName}` button + `content-${tabName}` panel). Removing the tab button + content panel + these two branches is sufficient. [VERIFIED]

## 7. ORPHAN-CALL CHECK

If all RGC JS is removed, these call sites become dangling references and **MUST be co-removed**:

| Call site | Line | Context | Action |
|-----------|------|---------|--------|
| `initPinLock()` | 15776 | Inline call in second `<script>` | Remove this line |
| `handleRgcTabClick()` | 5278 | `onclick` on tab button | Remove the entire button (Region 1) |
| `showPinModal()` | 15579 | `onclick` on settings-gear button | Remove the gear button HTML |
| `loadRGCData()` | 9215 | `switchTab('rgc')` branch | Remove the branch (Region 6) |
| `loadRGCData()` | 9241 | `refreshCurrentTab` rgc branch | Remove the branch (Region 6) |
| All RGC `onclick` handlers | 6000-6098 | Within content-rgc panel | Removed with panel (Region 2) |

[VERIFIED — grep confirms no other call sites exist for any RGC function outside of these locations]

**The `switchTab('rgc')` call at line 15727** (inside `submitPin()`) is also RGC-only — it lives within the PIN lock code being removed. Not an orphan. [VERIFIED]

## REMOVAL MAP SUMMARY

| # | Region | Lines | Classification | Notes |
|---|--------|-------|----------------|-------|
| 1 | Tab button | 5278 | RGC-ONLY | Single `<button>` line |
| 2 | Content panel | 5979–6105 | RGC-ONLY | 127 lines, clean `<!-- End RGC Tab -->` boundary |
| 3 | CSS: RGC Tab Styles | 3892–4335 | RGC-ONLY | 444 lines, all `.rgc-*` classes |
| 4 | CSS: `#tab-rgc.tab-hidden` | 4571 | RGC-ONLY | 1 line |
| 5 | CSS: `.settings-gear` | 4573–4591 | RGC-ONLY | 19 lines |
| 6 | CSS: `.pin-error` + `.pin-error.visible` | 4661–4667 | RGC-ONLY | 7 lines |
| 7 | CSS: `.pin-modal-*` | 4593–4660 | **SHARED — DO NOT REMOVE** | Used by 4 non-RGC modals |
| 8 | Main `<script>` RGC block | 11225–11683 | RGC-ONLY | 459 lines, 15 functions + 3 variables |
| 9 | Second `<script>` RGC PIN code | 15700–15747 | RGC-ONLY | 48 lines, 5 functions + 1 const + 2 event listeners |
| 10 | Second `<script>` `initPinLock()` call | 15776 | RGC-ONLY | 1 line, orphan call |
| 11 | switchTab `'rgc'` branch | 9214–9215 | RGC-ONLY | 2 lines |
| 12 | refreshCurrentTab `'rgc'` branch | 9240–9241 | RGC-ONLY | 2 lines |
| 13 | Settings gear HTML | 15578–15579 | RGC-ONLY | 2 lines (comment + button) |
| 14 | PIN modal HTML | 15581–15593 | RGC-ONLY | 12 lines (`id="pinModal"`) |

**Total RGC-ONLY lines to remove:** ~1,103 lines across 14 regions
**SHARED regions to KEEP:** `.pin-modal-*` CSS (lines 4593–4660), adoption modal listeners (15749–15771), adoptionsCache/profilesCache/Crop Editor (15781–16615), the `<script>`/`</script>` tags of the second block

## `<script>` BOUNDARY HANDLING (critical)

**Main `<script>` (6605–15509):** Remove lines 11225–11683 as a clean block. The `<script>` tag stays. No TDZ risk — no shared declarations near the RGC boundary. [VERIFIED]

**Second `<script>` (15699–16617):** Surgical removal of 3 non-contiguous regions:
1. Lines 15700–15747 (RGC PIN code + event listeners)
2. Line 15776 (`initPinLock();` orphan call)
3. The `<script>` tag and all shared code below 15749 MUST be preserved

The shared code starting at line 15749 includes:
- Adoption modal event listeners (click-outside, Escape key)
- `adoptionsCache`, `adoptionsSortCol`, `adoptionsSortAsc`, `ADOPTIONS_SPECIES_LABEL`, `ADOPTIONS_STATUS_ORDER`
- All Adoptions functions (`loadAdoptionsData`, `renderAdoptionsTable`, etc.)
- `profilesCache` and all Profiles functions
- Crop Editor code

These are the exact declarations that caused the TDZ error in the failed first attempt. They MUST remain. [VERIFIED]
