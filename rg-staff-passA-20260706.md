# Pass A — RG-Staff Server Route Removal — 2026-07-06

## 12 Routes Removed

| # | Method | Path | Lines (pre-edit) |
|---|--------|------|------------------|
| 1 | GET | `/api/rg/staff/requests` | 11616–11625 |
| 2 | GET | `/api/rg/staff/requests/:id` | 11627–11650 |
| 3 | POST | `/api/rg/staff/requests/:id/messages` | 11652–11695 |
| 4 | POST | `/api/rg/staff/requests/:id/assign` | 11697–11713 |
| 5 | POST | `/api/rg/staff/requests/:id/status` | 11715–11743 |
| 6 | POST | `/api/rg/staff/requests/:id/reopen` | 11745–11760 |
| 7 | GET | `/api/rg/staff/attachments/:id` | 11762–11795 |
| 8 | GET | `/api/rg/staff/requesters` | 11797–11814 |
| 9 | POST | `/api/rg/staff/requesters` | 11816–11847 |
| 10 | PUT | `/api/rg/staff/requesters/:id` | 11849–11874 |
| 11 | POST | `/api/rg/staff/requesters/:id/reset-pin` | 11876–11896 |
| 12 | GET | `/api/rg/staff/stats` | 11898–11928 |

Contiguous block: lines 11612–11928 (section header through final `});`).

## STEP 2 — Import Classification Table

### localDatabase.ts imports

| Import | Usage lines (outside import) | Decision | Grep basis |
|--------|------------------------------|----------|------------|
| `createRGRequester` | 11830 (staff block) | **REMOVE** | Only call-site in staff block |
| `getRGRequesterById` | 11448, 11543 (non-staff routes) | **KEEP** | Used in POST /api/rg/requests and POST /api/rg/requests/:id/messages |
| `getRGRequesterByEmail` | 11391 (non-staff login) | **KEEP** | Used in POST /api/rg/login |
| `getAllRGRequesters` | 11799 (staff block) | **REMOVE** | Only call-site in staff block |
| `updateRGRequester` | 11854 (staff block) | **REMOVE** | Only call-site in staff block |
| `resetRGRequesterPin` | 11885 (staff block) | **REMOVE** | Only call-site in staff block |
| `verifyPin` | 11400 (non-staff login) | **KEEP** | Used in POST /api/rg/login |
| `createRGSession` | 11404 (non-staff login) | **KEEP** | Used in POST /api/rg/login |
| `validateRGSession` | 11353 (rgAuthMiddleware) | **KEEP** | Used in auth middleware |
| `deleteRGSession` | 11421 (non-staff logout) | **KEEP** | Used in POST /api/rg/logout |
| `createRGRequest` | 11454 (non-staff route) | **KEEP** | Used in POST /api/rg/requests |
| `getRGRequestById` | 11506, 11538 (non-staff routes) | **KEEP** | Used in GET /api/rg/requests/:id and POST messages |
| `getAllRGRequests` | 11430 (non-staff route) | **KEEP** | Used in POST /api/rg/logout (list check) |
| `getStaffRGRequests` | 11618, 11900 (staff block) | **REMOVE** | Both call-sites in staff block |
| `updateRGRequestStatus` | 11724, 11749 (staff block) | **REMOVE** | Both call-sites in staff block |
| `assignRGRequest` | 11702 (staff block) | **REMOVE** | Only call-site in staff block |
| `markRGRequestReminderSent` | 12406 (deadline reminder) | **KEEP** | Used in startup deadline check |
| `getRequestsDueForReminder` | 12395 (deadline reminder) | **KEEP** | Used in startup deadline check |
| `addRGMessage` | 11545 (non-staff route) | **KEEP** | Used in POST /api/rg/requests/:id/messages |
| `getRGMessageById` | 11593 (non-staff route) | **KEEP** | Used in GET /api/rg/attachments/:id |
| `getRGMessagesByRequestId` | 11466, 11512 (non-staff routes) | **KEEP** | Used in POST /api/rg/requests and GET /:id |
| `addRGAttachment` | 11471, 11552 (non-staff routes) | **KEEP** | Used in POST /api/rg/requests and POST messages |
| `getRGAttachmentById` | 11586 (non-staff route) | **KEEP** | Used in GET /api/rg/attachments/:id |
| `getRGEmailRoutingForCategory` | 11482, 11563, 12398 (non-staff + deadline) | **KEEP** | Multiple call-sites outside staff block |
| `getAllRGEmailRouting` | (none — import only) | **REMOVE** | Imported but never called anywhere in server.ts |
| `addRGEmailRouting` | (none — import only) | **REMOVE** | Imported but never called anywhere in server.ts |
| `seedRGTestData` | 12429 (startup) | **KEEP** | Called at server startup |

### emailService.ts imports

| Import | Usage lines | Decision | Grep basis |
|--------|-------------|----------|------------|
| `sendRGNewRequestEmail` | 11485 (non-staff route) | **KEEP** | Used in POST /api/rg/requests |
| `sendRGDeadlineReminderEmail` | 12405 (deadline reminder) | **KEEP** | Used in startup deadline check |
| `sendRGStaffResponseEmail` | 11686 (staff block) | **REMOVE** | Only call-site in staff block |
| `sendRGResolvedEmail` | 11733 (staff block) | **REMOVE** | Only call-site in staff block |
| `sendRGFollowUpEmail` | 11566 (non-staff route) | **KEEP** | Used in POST /api/rg/requests/:id/messages |

### Shared resources (non-import)

| Name | Decision | Basis |
|------|----------|-------|
| `rgUpload` (multer instance, line ~11333) | **KEEP** | Used in non-staff routes at lines 11430, 11519 |

### Summary

- **REMOVE: 9 localDatabase imports** (`createRGRequester`, `getAllRGRequesters`, `updateRGRequester`, `resetRGRequesterPin`, `getStaffRGRequests`, `updateRGRequestStatus`, `assignRGRequest`, `getAllRGEmailRouting`, `addRGEmailRouting`)
- **REMOVE: 2 emailService imports** (`sendRGStaffResponseEmail`, `sendRGResolvedEmail`)
- **KEEP: 18 localDatabase imports** + **3 emailService imports** (all have call-sites outside the staff block)

## Non-Staff Routes — Confirmed Intact

7 routes verified present after removal:

```
11374:app.post('/api/rg/login', rgLoginLimiter, ...)
11410:app.post('/api/rg/logout', rgAuthMiddleware, ...)
11419:app.get('/api/rg/requests', rgAuthMiddleware, ...)
11430:app.post('/api/rg/requests', rgAuthMiddleware, ...)
11494:app.get('/api/rg/requests/:id', rgAuthMiddleware, ...)
11519:app.post('/api/rg/requests/:id/messages', rgAuthMiddleware, ...)
11574:app.get('/api/rg/attachments/:id', rgAuthMiddleware, ...)
```

[VERIFIED via grep after edit]

## Verification Results

### All 12 removed paths → 404 [VERIFIED]

```
GET /api/rg/staff/requests → 404
GET /api/rg/staff/requests/1 → 404
GET /api/rg/staff/attachments/1 → 404
GET /api/rg/staff/requesters → 404
GET /api/rg/staff/stats → 404
POST /api/rg/staff/requests/1/messages → 404
POST /api/rg/staff/requests/1/assign → 404
POST /api/rg/staff/requests/1/status → 404
POST /api/rg/staff/requests/1/reopen → 404
POST /api/rg/staff/requesters → 404
PUT /api/rg/staff/requesters/1 → 404
POST /api/rg/staff/requesters/1/reset-pin → 404
```

### Non-staff /api/rg/* unchanged [VERIFIED]

```
POST /api/rg/login → 400 (missing fields — route exists)
GET /api/rg/requests → 401 (auth required — route exists)
```

### grep server.ts for "rg/staff" → zero [VERIFIED]

```
$ grep -rn 'rg/staff' server/src/server.ts
(no output — exit code 1)
```

### Build clean [VERIFIED]

```
$ cd server && npm run build
> tsc
(exit code 0, no errors)
```

## Commit

```
[master 5de3702] Pass A: remove 12 dead /api/rg/staff/* server routes + staff-only imports (RGC dashboard UI removal deferred to Pass B); tables untouched
 1 file changed, 1 insertion(+), 327 deletions(-)
```
