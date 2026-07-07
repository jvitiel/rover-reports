# RGC Pass B Part 1 — Clean Region Removal

## Regions Removed (bottom-up order)

### 1. Main `<script>` RGC JS block
- **Anchor:** `// ============ RG Cares Tab ============` → line before `// ============ Intake Tab ============`
- **Original lines:** 11225–11684 (460 lines)
- **Content:** `rgcData`, `rgcCurrentFilter`, `rgcCurrentRequestId` variables + 15 functions (`loadRGCData`, `filterRGCRequests`, `renderRGCTable`, `openRGCThread`, `updateRGCStatusButtons`, `renderRGCMessages`, `closeRGCThread`, `assignRGCRequest`, `setRGCStatus`, `sendRGCResponse`, `loadRGCContacts`, `renderRGCContacts`, `addRGCContact`, `toggleRGCContact`, `resetRGCPin`)
- **Classification:** RGC-ONLY [VERIFIED — all call sites were within the RGC HTML panel (also removed) or switchTab branches (also removed)]
- **Join point:** Events section now flows directly into Intake section [VERIFIED]

### 2. switchTab + refreshCurrentTab 'rgc' branches
- **Anchors:** `} else if (tabName === 'rgc')` and `} else if (currentTab === 'rgc')`
- **Original lines:** 9214–9215 and 9240–9241 (4 lines total)
- **Content:** Two `else if` branches calling `loadRGCData()`
- **Classification:** RGC-ONLY [VERIFIED — both branches are dead code after RGC block removal]
- **Chain integrity:** Wellbeing → Intake flow preserved in both functions [VERIFIED]

### 3. HTML content panel (#content-rgc)
- **Anchor:** `<!-- RG Cares Tab Content -->` + `<div class="tab-content" id="content-rgc">` → `</div><!-- End RGC Tab -->`
- **Original lines:** 5978–6106 (129 lines)
- **Content:** RGC stats bar, request list/table, thread view, admin/contacts section
- **Classification:** RGC-ONLY [VERIFIED — all element IDs `rgc*` prefixed, all onclick handlers call RGC-only functions]
- **Close boundary:** `</div><!-- End RGC Tab -->` confirmed by awk div-depth counter [VERIFIED]
- **Join point:** Wellbeing tab `</div>` now flows into Intake tab `<!-- Intake Tab Content -->` [VERIFIED]

### 4. HTML tab button
- **Anchor:** `<button class="tab-btn" onclick="handleRgcTabClick()" id="tab-rgc" style="display: none">`
- **Original line:** 5278 (1 line)
- **Classification:** RGC-ONLY [VERIFIED — `display: none`, calls `handleRgcTabClick()` which is RGC-only]
- **Siblings intact:** Wellbeing button (before) and Volunteers button (after) unchanged [VERIFIED]

### 5. RGC-only CSS (3 sub-regions)

**5a. RGC Tab Styles block:**
- **Anchor:** `/* ============ RG Cares Tab Styles ============ */` → line before `/* ============ Intake Tab Styles ============ */`
- **Original lines:** 3892–4336 (445 lines)
- **Content:** All `.rgc-*` classes (`.rgc-stats-bar`, `.rgc-stat`, `.rgc-filter-btn`, `.rgc-table`, `.rgc-status-badge`, `.rgc-category-badge`, `.rgc-back-btn`, `.rgc-thread-*`, `.rgc-message-*`, `.rgc-contact-*`, `.rgc-send-btn`, `.deadline-text.*`)
- **Classification:** RGC-ONLY [VERIFIED — grep confirms all `.rgc-*` classes used only in the removed HTML panel and removed JS block]

**5b. `#tab-rgc.tab-hidden` + `.settings-gear`:**
- **Anchor:** `/* ============ PIN Lock Styles ============ */` header
- **Original lines:** 4571–4591 (22 lines: `#tab-rgc.tab-hidden`, `.settings-gear`, `.settings-gear:hover`)
- **Classification:** RGC-ONLY [VERIFIED — `#tab-rgc` element removed; `.settings-gear` only on the gear button which is Part 2 scope but references an RGC-only class]
- **PIN Lock Styles header preserved** (now directly contains `.pin-modal-overlay`) [VERIFIED]

**5c. `.pin-error`:**
- **Original lines:** 4661–4667 (8 lines: `.pin-error` + `.pin-error.visible`)
- **Classification:** RGC-ONLY [VERIFIED — only used by `#pinError` in the PIN modal (Part 2 scope, but the CSS is dead without the RGC tab)]

## NOT Removed (explicitly left for Part 2)

| Item | Still present? | Line (post-edit) |
|------|---------------|-----------------|
| Second `<script>` block | ✅ | 14630–15548 |
| `const RGC_PIN = '10970'` | ✅ | 14632 |
| `function initPinLock()` | ✅ | 14634 |
| `function handleRgcTabClick()` | ✅ | 14638 |
| `function showPinModal()` | ✅ | 14642 |
| `function hidePinModal()` | ✅ | 14649 |
| `function submitPin()` | ✅ | 14653 |
| PIN event listeners (pinInput, pinModal) | ✅ | 14666–14678 |
| `initPinLock()` orphan call | ✅ | 14707 |
| Settings-gear button HTML | ✅ | 14510 |
| PIN modal HTML (`#pinModal`) | ✅ | 14513–14524 |
| `.pin-modal-*` CSS (SHARED) | ✅ | 4126–4193 |

[VERIFIED — all confirmed present by grep]

## Second `<script>` Block — UNTOUCHED Confirmation

| Declaration | Post-edit line | Status |
|-------------|---------------|--------|
| `let adoptionsCache = null` | 14714 | ✅ INTACT |
| `let profilesCache = null` | 15072 | ✅ INTACT |
| `loadAdoptionsData` | 2 refs | ✅ INTACT |
| `loadProfilesData` | 2 refs | ✅ INTACT |
| `renderAdoptionsTable` | 11 refs | ✅ INTACT |
| `renderProfilesTable` | present | ✅ INTACT |
| Crop Editor | present | ✅ INTACT |

[VERIFIED — grep confirms all shared declarations present and intact]

## Parse / Build Check

- `tsc` (TypeScript build): **passed** — no errors [VERIFIED]
- Dashboard HTTP: **200** [VERIFIED — curl smoke test]
- File: 15,550 lines (was 16,619 — removed 1,069 lines) [VERIFIED]

## Status

**Applied but UNCOMMITTED.** Service restarted. Pending John's browser check of:
- Dashboard loads normally
- Adoptions tab works (loads data, notes modal, adopted modal)
- Profiles tab works (loads data, filters, sort)
- Wellbeing tab works (health assessment modal, seizure record modal)
- No RGC tab visible (was already display:none, now fully removed)
- Settings gear still visible (Part 2 — expected, harmless)

No `git commit` until browser check passes.
