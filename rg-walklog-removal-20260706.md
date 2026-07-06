# RG-Staff + Walk-Log Dead Code Removal — 2026-07-06

## COMMIT 1 — RG-Staff Routes + Hidden RGC Dashboard Tab

### Routes Removed (server/src/server.ts)

| # | Method | Path | Former line |
|---|--------|------|-------------|
| 1 | GET | `/api/rg/staff/requests` | 11630 |
| 2 | GET | `/api/rg/staff/requests/:id` | 11641 |
| 3 | POST | `/api/rg/staff/requests/:id/messages` | 11666 |
| 4 | POST | `/api/rg/staff/requests/:id/assign` | 11711 |
| 5 | POST | `/api/rg/staff/requests/:id/status` | 11729 |
| 6 | POST | `/api/rg/staff/requests/:id/reopen` | 11759 |
| 7 | GET | `/api/rg/staff/attachments/:id` | 11776 |
| 8 | GET | `/api/rg/staff/requesters` | 11811 |
| 9 | POST | `/api/rg/staff/requesters` | 11830 |
| 10 | PUT | `/api/rg/staff/requesters/:id` | 11863 |
| 11 | POST | `/api/rg/staff/requesters/:id/reset-pin` | 11890 |
| 12 | GET | `/api/rg/staff/stats` | 11912 |

### Orphaned Imports Removed (server/src/server.ts)

From localDatabase.ts import — removed 7 functions used ONLY in the staff route block (import line + staff block, zero other references):

| Function | Grep basis |
|----------|------------|
| `getStaffRGRequests` | 3 refs total: import + 2 in staff block |
| `updateRGRequestStatus` | 3 refs total: import + 2 in staff block |
| `assignRGRequest` | 2 refs total: import + 1 in staff block |
| `getAllRGRequesters` | 2 refs total: import + 1 in staff block |
| `createRGRequester` | 2 refs total: import + 1 in staff block |
| `updateRGRequester` | 2 refs total: import + 1 in staff block |
| `resetRGRequesterPin` | 2 refs total: import + 1 in staff block |

Also removed 2 unused imports (imported but never referenced outside the staff block):
- `getAllRGEmailRouting` — imported at line 179, zero call-sites in server.ts
- `addRGEmailRouting` — imported at line 180, zero call-sites in server.ts

From emailService.ts import — removed 2 functions:
- `sendRGStaffResponseEmail` — only call was line 11700 (staff message handler)
- `sendRGResolvedEmail` — only call was line 11747 (staff status handler)

### Shared Imports Kept

| Function | Reason kept |
|----------|-------------|
| `getRGRequestById` | Used in non-staff routes at lines 11520, 11552 |
| `getRGAttachmentById` | Used in non-staff route at line 11600 |
| `rgUpload` (multer) | Used in non-staff routes at lines 11453, 11542 |
| `addRGMessage` | Used in non-staff route at line 11559 |
| `getRGMessageById` | Used in non-staff route at line 11607 |
| `getRGMessagesByRequestId` | Used in non-staff routes at lines 11480, 11526 |
| `addRGAttachment` | Used in non-staff routes at lines 11485, 11566 |
| All other RG imports | Used by non-staff routes, email dispatch, or startup code |

### Non-Staff /api/rg/* Routes — Confirmed Intact

7 routes verified present after removal:

```
11392:app.post('/api/rg/login', rgLoginLimiter, ...)
11428:app.post('/api/rg/logout', rgAuthMiddleware, ...)
11437:app.get('/api/rg/requests', rgAuthMiddleware, ...)
11448:app.post('/api/rg/requests', rgAuthMiddleware, ...)
11512:app.get('/api/rg/requests/:id', rgAuthMiddleware, ...)
11537:app.post('/api/rg/requests/:id/messages', rgAuthMiddleware, ...)
11592:app.get('/api/rg/attachments/:id', rgAuthMiddleware, ...)
```

[VERIFIED via grep — all 7 present with rgAuthMiddleware intact]

### Dashboard Regions Removed (dashboard/index.html)

| Region | Lines (pre-edit) | Description |
|--------|-----------------|-------------|
| RGC CSS block | 3891–4336 (446 lines) | `/* ============ RG Cares Tab Styles ============ */` through all `.rgc-*` classes, `.deadline-text.*` styles |
| `#tab-rgc.tab-hidden` rule | 4571 | Single CSS rule |
| `.settings-gear` CSS | 4573–4591 (19 lines) | Fixed-position gear button styles + hover |
| Tab button | 5278 | `<button class="tab-btn" onclick="handleRgcTabClick()" id="tab-rgc" style="display: none">📬 RG Cares</button>` |
| content-rgc HTML | 5508–5637 (130 lines) | `<!-- RG Cares Tab Content -->` through `</div><!-- End RGC Tab -->` — stats bar, filters, table, thread panel, contacts panel |
| switchTab 'rgc' branches | 9214–9215, 9240–9241 | Two `else if (tabName/currentTab === 'rgc')` branches calling `loadRGCData()` |
| RGC JS block | 10622–11081 (460 lines) | `// ============ RG Cares Tab ============` through all RGC functions: `loadRGCData`, `filterRGCRequests`, `renderRGCTable`, `openRGCThread`, `updateRGCStatusButtons`, `renderRGCMessages`, `closeRGCThread`, `assignRGCRequest`, `setRGCStatus`, `sendRGCMessage`, `loadRGCContacts`, `renderRGCContacts`, `addRGCContact`, `updateRGCContact`, `resetRGCPin` |
| Settings gear button HTML | 15579 | `<button class="settings-gear" onclick="showPinModal()" title="Settings">⚙️</button>` + comment |
| PIN modal HTML | 15582–15593 | `<div class="pin-modal-overlay" id="pinModal">` through closing `</div>` |
| PIN JS block | 15699–15749 | `<script>` containing `RGC_PIN`, `initPinLock`, `handleRgcTabClick`, `showPinModal`, `hidePinModal`, `submitPin`, pinInput keypress listener, pinModal click-outside handler |

**Kept:** `.pin-modal-*` CSS classes (shared with adoptionNotesModal, adoptionAdoptedModal, healthAssessmentModal, seizureRecordModal). Re-inserted `<script>` tag to maintain the script block that contains the Adoption Notes and other modal handlers.

### Verification Results — Commit 1

#### V1: All 12 removed rg/staff paths return 404 [VERIFIED]

```
$ curl -sSw "%{http_code}" -o /dev/null https://dashboard.4lgshelterapp.duckdns.org/api/rg/staff/...

/api/rg/staff/requests → 404
/api/rg/staff/requests/1 → 404
/api/rg/staff/requests/1/messages → 404
/api/rg/staff/requests/1/assign → 404
/api/rg/staff/requests/1/status → 404
/api/rg/staff/requests/1/reopen → 404
/api/rg/staff/attachments/1 → 404
/api/rg/staff/requesters → 404
/api/rg/staff/stats → 404
POST /api/rg/staff/requesters → 404
PUT /api/rg/staff/requesters/1 → 404
POST /api/rg/staff/requesters/1/reset-pin → 404
```

#### V2: Non-staff /api/rg/* paths unchanged [VERIFIED]

```
POST /api/rg/login → 400 (missing fields — route exists, not 404)
GET /api/rg/requests → 401 (auth required — route exists, not 404)
```

#### V3: grep repo for "rg/staff" — zero live references [VERIFIED]

```
$ grep -rn 'rg/staff' --include='*.ts' --include='*.js' --include='*.html' . | grep -v node_modules | grep -v '.backup' | grep -v dist/
(no output)
```

#### V4: grep repo for RGC identifiers — only non-staff code remains [VERIFIED]

Remaining "RG Cares" references are exclusively in:
- `server/src/server.ts` — non-staff route comments, import comment (`// RG Cares functions`), RG portal serving, deadline reminder system
- `server/src/emailService.ts` — email templates for non-staff flows (new request, deadline reminder, follow-up)
- `server/src/localDatabase.ts` — table creation, CRUD functions used by non-staff routes
- `server/src/types.ts` — type definitions used by non-staff routes
- `intake-form.html`, `rg-portal.html`, `public/layout-test.html` — portal/test pages

Zero dashboard RGC identifiers remain (`rgcData`, `loadRGCData`, `renderRGC*`, `content-rgc`, `tab-rgc`, `handleRgcTabClick`, `RGC_PIN` — all gone). [VERIFIED]

### Commit 1

```
[master 48d0c9d] Remove dead RG-staff route suite (12 routes) + hidden RGC dashboard tab; tables untouched
 2 files changed, 10 insertions(+), 1461 deletions(-)
```

---

## COMMIT 2 — Walk-Log Route

### Route Removed (server/src/server.ts)

| Method | Path | Former line |
|--------|------|-------------|
| GET | `/api/walk-log` | 3962 |

Section header `// ============ Walk Log API (Dashboard) ============` and handler (13 lines) removed.

### Orphaned Import Removed

| Import | Grep basis |
|--------|------------|
| `getAllWalkLogData` (from googleSheetsService.ts) | 2 refs: import line + handler call. Zero other references. |

### Decision: `getAllWalkLogData` function + `WalkLogRow` interface kept in googleSheetsService.ts

The function definition (line 961) and interface (line 942) are now orphaned in googleSheetsService.ts — no caller imports them. However, these are library-level functions in a service module, not route-specific helpers. Other walk-log functions in the same file (`appendWalkLog`, `updateWalkLog`, `getTodayWalkStats`, `updateWalkLogMedia`) remain actively used by dogwalker routes. Removing `getAllWalkLogData` from googleSheetsService.ts is a code-cleanup decision, not a route-removal concern. Left in place; can be cleaned up separately.

### Verification Results — Commit 2

#### V5: /api/walk-log returns 404 [VERIFIED]

```
$ curl -sSw "%{http_code}" -o /dev/null https://dashboard.4lgshelterapp.duckdns.org/api/walk-log
/api/walk-log → 404
```

#### V6: grep for walk-log/walkLog — zero live references in server.ts [VERIFIED]

```
$ grep -rn 'walk-log|walkLog|walk_log|getAllWalkLogData' --include='*.ts' --include='*.js' --include='*.html' . | grep -v node_modules | grep -v '.backup' | grep -v dist/

./server/src/googleSheetsService.ts:961:export async function getAllWalkLogData(): Promise<WalkLogRow[]>  (orphaned — no importer)
./server/src/googleSheetsService.ts:971-1016: function body (orphaned)
```

Only the orphaned function definition remains in googleSheetsService.ts. Zero callers. [VERIFIED]

### Commit 2

```
[master 35bb6a6] Remove orphaned /api/walk-log route (no callers; Google Sheets backing, no local table)
 1 file changed, 14 deletions(-)
```

---

## Database Tables — Untouched

No DROP, DELETE, ALTER, or any other table operation was performed. The following tables remain as-is:
- `rg_requesters` (2 rows)
- `rg_requests` (4 rows)
- `rg_messages` (25 rows)
- `rg_attachments` (5 rows)
- `rg_sessions` (1 row)

Walk-log data is in Google Sheets — no local table exists.
