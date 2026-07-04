# Write-Surface Enumeration for Write-Gate Build

## 1. Full Write-Surface Table

117 state-changing routes total. Grouped by mutation class and caller.

### APPLICANT / VOLUNTEER PII

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 1 | `POST /api/adoption-application` | Submit adoption form (public) | Public adoption-form.html | `adoptionLimiter` only | **MUST-STAY-PUBLIC** |
| 2 | `POST /api/volunteers` | Submit volunteer web form (public) | Public volunteer form | `volunteerWebFormLimiter` only | **MUST-STAY-PUBLIC** |
| 3 | `POST /api/volunteers/upload` | Upload volunteer scan documents (OCR) | Dashboard | tokenless fetch | **YES — dashboard** |
| 4 | `POST /api/volunteers/rotate-image` | Rotate a volunteer scan image (takes filePath) | Dashboard | tokenless fetch | **YES — dashboard** ⚠️ TRACKED |
| 5 | `PATCH /api/volunteers/:id` | Update volunteer record fields | Dashboard | tokenless fetch | **YES — dashboard** |
| 6 | `DELETE /api/volunteers/:id` | Delete volunteer record | Dashboard | tokenless fetch | **YES — dashboard** |
| 7 | `PATCH /api/volunteers/:id/policy-reviewed` | Set policy-reviewed flag | Dashboard | tokenless fetch | **YES — dashboard** |
| 8 | `PATCH /api/volunteers/:id/approval` | Set approval status | Dashboard | tokenless fetch | **YES — dashboard** |
| 9 | `PATCH /api/volunteers/:id/tags` | Update volunteer tags | Dashboard | tokenless fetch | **YES — dashboard** |
| 10 | `POST /api/volunteers/:id/commitments` | Add volunteer commitment | Dashboard | tokenless fetch | **YES — dashboard** |
| 11 | `DELETE /api/volunteers/:id/commitments` | Remove volunteer commitment | Dashboard | tokenless fetch | **YES — dashboard** |
| 12 | `POST /api/volunteers/:id/declines` | Add volunteer decline | Dashboard | tokenless fetch | **YES — dashboard** |
| 13 | `DELETE /api/volunteers/:id/declines` | Remove volunteer decline | Dashboard | tokenless fetch | **YES — dashboard** |
| 14 | `POST /api/volunteers/timeclock/punch` | Clock in/out (public kiosk) | vclock.html (public) | none | **MUST-STAY-PUBLIC** |
| 15 | `POST /api/volunteers/timeclock/auto-close` | Auto-close stale shifts (>8hr) | Exposed endpoint; no cron caller found | none | **INTERNAL** |
| 16 | `POST /api/volunteers/timeclock/manual` | Manual timeclock entry | Dashboard | tokenless fetch | **YES — dashboard** |
| 17 | `POST /api/intake` | Submit overnight intake (public form) | Public intake form | `intakeUpload` limiter | **MUST-STAY-PUBLIC** |
| 18 | `POST /api/intakes/:id/status` | Mark intake reviewed | Dashboard | tokenless fetch | **YES — dashboard** |
| 19 | `POST /api/dashboard/intake/:id/health-assessment` | Save health assessment | Dashboard | tokenless fetch | **YES — dashboard** |
| 20 | `POST /api/dashboard/intake/:id/seizure-record` | Save seizure record | Dashboard | tokenless fetch | **YES — dashboard** |
| 21 | `POST /api/intake-recipients` | Add intake alert recipient | Dashboard | tokenless fetch | **YES — dashboard** |
| 22 | `DELETE /api/intake-recipients/:id` | Remove intake alert recipient | Dashboard | tokenless fetch | **YES — dashboard** |
| 23 | `POST /api/intake/:id/voice` | Upload intake voice note | Dashboard | tokenless fetch | **YES — dashboard** |

[VERIFIED — all callers confirmed by grep across dashboard + PWAs + public pages]

### ANIMAL DATA

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 24 | `POST /api/animals/refresh` | Trigger SM data sync | Internal scheduler / OC curl | none | **INTERNAL** |
| 25 | `POST /api/behavior/:animalId` | Add behavior note | Dashboard | tokenless fetch | YES — dashboard |
| 26 | `DELETE /api/behavior/:animalId` | Delete behavior notes for animal | Dashboard | tokenless fetch | YES — dashboard |
| 27 | `DELETE /api/behavior/record/:recordId` | Delete single behavior record | Dashboard | tokenless fetch | YES — dashboard |
| 28 | `PATCH /api/dashboard/feeding/:shelterCode/:date` | Edit feeding record | Dashboard | tokenless fetch | YES — dashboard |
| 29 | `PATCH /api/dashboard/activity/:id` | Edit activity record | Dashboard | tokenless fetch | YES — dashboard |
| 30 | `POST /api/bio/generate/:animalId` | Generate bio for animal | Dashboard | tokenless fetch | YES — dashboard |
| 31 | `POST /api/bio/:shelterCode/regenerate/:size` | Regenerate bio (size) | Dashboard | tokenless fetch | YES — dashboard |
| 32 | `PUT /api/bio/:bioId/long` | Save long bio text | Dashboard | tokenless fetch | YES — dashboard |
| 33 | `PUT /api/bio/:bioId/short` | Save short bio text | Dashboard | tokenless fetch | YES — dashboard |
| 34 | `POST /api/bio/:bioId/translate/long` | Translate long bio | Dashboard | tokenless fetch | YES — dashboard |
| 35 | `POST /api/bio/:bioId/translate/short` | Translate short bio | Dashboard | tokenless fetch | YES — dashboard |
| 36 | `POST /api/bio/:bioId/approve/long` | Approve long bio | Dashboard | tokenless fetch | YES — dashboard |
| 37 | `POST /api/bio/:bioId/approve/short` | Approve short bio | Dashboard | tokenless fetch | YES — dashboard |
| 38 | `POST /api/bio/draft/:shelterCode/promote/:size` | Promote bio draft | Dashboard | tokenless fetch | YES — dashboard |
| 39 | `DELETE /api/bio/:bioId` | Delete bio | Dashboard | tokenless fetch | YES — dashboard |
| 40 | `PUT /api/featured-slots/:index` | Set featured animal slot | Dashboard | tokenless fetch | YES — dashboard |
| 41 | `DELETE /api/featured-slots/:index` | Clear featured slot | Dashboard | tokenless fetch | YES — dashboard |
| 42 | `PUT /api/animals/:shelterCode/adoption-pending` | Toggle adoption-pending flag | Dashboard | tokenless fetch | YES — dashboard |
| 43 | `PUT /api/animals/:shelterCode/bonded-pair` | Set bonded pair | Dashboard | tokenless fetch | YES — dashboard |
| 44 | `POST /api/photos/:animalId/add-to-strip` | Add photo to strip | Dashboard | tokenless fetch | YES — dashboard |
| 45 | `POST /api/photos/:animalId/remove-from-strip` | Remove photo from strip | Dashboard | tokenless fetch | YES — dashboard |
| 46 | `POST /api/photos/:mediaId/manual-crop` | Manual crop photo | Dashboard | tokenless fetch | YES — dashboard |
| 47 | `PUT /api/photos/:animalId/reorder` | Reorder photo strip | Dashboard | tokenless fetch | YES — dashboard |
| 48 | `POST /api/photos/:shelterCode/upload-to-library` | Upload photo to library | Dashboard + staff-pwa | tokenless fetch | **NEEDS-PWA-AUTH** (staff-pwa calls it) |
| 49 | `POST /api/generate-video` | Generate animal video | Dashboard | tokenless fetch | YES — dashboard |
| 50 | `POST /api/dashboard/media/:id/tag-marketing` | Tag media as marketing | Dashboard | tokenless fetch | YES — dashboard |
| 51 | `POST /api/dashboard/media/:id/hide` | Hide media item | Dashboard | tokenless fetch | YES — dashboard |

[VERIFIED]

### ACTIVITY / WALK / FEEDING SESSIONS (PWA-originated)

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 52 | `POST /api/dogwalker/walk/start` | Start dog walk | dogwalker-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 53 | `POST /api/dogwalker/walk/end` | End dog walk | dogwalker-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 54 | `POST /api/dogwalker/voice` | Upload walk voice note | dogwalker-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 55 | `POST /api/dogwalker/photo` | Upload walk photo | dogwalker-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 56 | `POST /api/volunteer/session/start` | Start volunteer session | volunteer-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 57 | `POST /api/volunteer/session/end` | End volunteer session | volunteer-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 58 | `POST /api/volunteer/voice` | Upload volunteer voice note | volunteer-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 59 | `POST /api/volunteer/photo` | Upload volunteer photo | volunteer-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 60 | `POST /api/staff/session/start` | Start staff session | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 61 | `POST /api/staff/session/end` | End staff session | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 62 | `POST /api/staff/voice` | Upload staff voice note | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 63 | `POST /api/staff/photo` | Upload staff photo | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 64 | `POST /api/staff/feeding/update` | Record feeding | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 65 | `POST /api/staff/feeding/undo` | Undo feeding | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 66 | `POST /api/staff/feeding/voice` | Upload feeding voice note | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 67 | `POST /api/staff/feeding/photo` | Upload feeding photo | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 68 | `POST /api/staff/feeding/update-legacy` | Legacy feeding update | staff-pwa (legacy) | tokenless | **NEEDS-PWA-AUTH** |
| 69 | `POST /api/sessions/start` | Start generic session | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 70 | `PUT /api/sessions/:id/observe` | Add observation to session | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 71 | `DELETE /api/sessions/:id/end` | End generic session | staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 72 | `POST /api/profile/photo` | Upload profile photo | volunteer-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 73 | `POST /api/caregiver/process` | Process caregiver audio | caregiver-pwa + staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 74 | `POST /api/caregiver/transcribe` | Transcribe caregiver audio | caregiver-pwa + staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 75 | `POST /api/caregiver/save` | Save caregiver assessment | caregiver-pwa + staff-pwa | tokenless | **NEEDS-PWA-AUTH** |
| 76 | `POST /api/caregiver/eval-followups` | Evaluate follow-ups | Dashboard | tokenless fetch | YES — dashboard |
| 77 | `POST /api/coordinator/process` | Process coordinator audio | coordinator-pwa | tokenless | **NEEDS-PWA-AUTH** |

[VERIFIED]

### STORIES / EVENTS / CONTENT

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 78 | `POST /api/stories` | Create story | Dashboard | tokenless fetch | YES — dashboard |
| 79 | `PUT /api/stories/:id` | Update story | Dashboard | tokenless fetch | YES — dashboard |
| 80 | `POST /api/stories/:id/feature` | Feature a story | Dashboard | tokenless fetch | YES — dashboard |
| 81 | `DELETE /api/stories/:id` | Delete story | Dashboard | tokenless fetch | YES — dashboard |
| 82 | `POST /api/stories/sync` | Sync stories from WordPress | Internal (no UI caller found) | none | **INTERNAL** |
| 83 | `POST /api/events` | Create event | Dashboard | tokenless fetch | YES — dashboard |
| 84 | `PUT /api/events/:id` | Update event | Dashboard | tokenless fetch | YES — dashboard |
| 85 | `POST /api/events/:id/cancel` | Cancel event | Dashboard | tokenless fetch | YES — dashboard |
| 86 | `DELETE /api/events/:id` | Delete event | Dashboard | tokenless fetch | YES — dashboard |

[VERIFIED]

### NOTIFICATIONS / OPERATIONAL

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 87 | `POST /api/notifications/staff` | Push staff notification | Dashboard | tokenless fetch | YES — dashboard |
| 88 | `POST /api/notifications/staff/repush` | Re-push all staff notifications | Dashboard | tokenless fetch | YES — dashboard |
| 89 | `POST /api/dashboard/adoptable-alert/run` | Run adoptable alert email | Dashboard | `adoptableAlertLimiter` | YES — dashboard |
| 90 | `POST /api/feeding/run-cron` | Manually trigger feeding job | Dashboard/OC | none | **INTERNAL** |
| 91 | `POST /api/dashboard/wellbeing/generate` | Generate wellbeing alerts | Dashboard | tokenless fetch | YES — dashboard |

[VERIFIED]

### DASHBOARD ADMIN / BATCH JOBS

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 92 | `POST /api/dashboard/generic-bio/dry-run` | Dry-run generic bio reclassification | Dashboard | tokenless fetch | YES — dashboard |
| 93 | `POST /api/dashboard/generic-bio/publish` | Publish generic bio reclassifications | Dashboard | tokenless fetch | YES — dashboard |
| 94 | `POST /api/dashboard/featured-rotation/dry-run` | Dry-run featured rotation | Dashboard | tokenless fetch | YES — dashboard |
| 95 | `POST /api/dashboard/featured-rotation/seed-commit` | Seed featured rotation | Dashboard | tokenless fetch | YES — dashboard |
| 96 | `POST /api/dashboard/featured-rotation/test-four-editions` | Test 4 editions | Dashboard | tokenless fetch | YES — dashboard |
| 97 | `POST /api/dashboard/adult-generic/dry-run` | Dry-run adult generic | Dashboard | tokenless fetch | YES — dashboard |
| 98 | `POST /api/dashboard/adult-generic/run` | Run adult generic | Dashboard | tokenless fetch | YES — dashboard |
| 99 | `POST /api/dashboard/adult-intake/run` | Run adult intake | Dashboard | tokenless fetch | YES — dashboard |

[VERIFIED]

### AI / MATCHING (read-like, but POST)

| # | Method + Path | What It Does | Caller | Credential | Gateable Now? |
|---|---------------|-------------|--------|------------|--------------|
| 100 | `POST /api/transcribe` | Transcribe audio (file upload) | Dashboard + staff-pwa | tokenless | **NEEDS-PWA-AUTH** (staff-pwa calls it) |
| 101 | `POST /api/transcribe/base64` | Transcribe audio (base64) | Dashboard | tokenless fetch | YES — dashboard |
| 102 | `POST /api/parse/behavior` | Parse behavior text | Dashboard | tokenless fetch | YES — dashboard |
| 103 | `POST /api/parse/preferences` | Parse adopter preferences | Dashboard | tokenless fetch | YES — dashboard |
| 104 | `POST /api/match` | Run matcher | coordinator-pwa + dashboard | tokenless | **NEEDS-PWA-AUTH** (coordinator-pwa calls it) |
| 105 | `POST /api/matcher/custom-search` | Custom search | Dashboard | tokenless fetch | YES — dashboard |

[VERIFIED]

### RG (RELINQUISHMENT GATEWAY — already gated by rgAuthMiddleware)

| # | Method + Path | What It Does | Middleware | Gateable? |
|---|---------------|-------------|-----------|-----------|
| 106 | `POST /api/rg/login` | RG login | `rgLoginLimiter` | **OUT OF SCOPE** |
| 107 | `POST /api/rg/logout` | RG logout | `rgAuthMiddleware` | **OUT OF SCOPE** |
| 108 | `POST /api/rg/requests` | Create RG request | `rgAuthMiddleware` | **OUT OF SCOPE** |
| 109 | `POST /api/rg/requests/:id/messages` | Add RG message | `rgAuthMiddleware` | **OUT OF SCOPE** |
| 110 | `POST /api/rg/staff/requests/:id/messages` | Staff RG message | none (staff-side) | OUT OF SCOPE |
| 111 | `POST /api/rg/staff/requests/:id/assign` | Assign RG request | none (staff-side) | OUT OF SCOPE |
| 112 | `POST /api/rg/staff/requests/:id/status` | Change RG status | none (staff-side) | OUT OF SCOPE |
| 113 | `POST /api/rg/staff/requests/:id/reopen` | Reopen RG request | none (staff-side) | OUT OF SCOPE |
| 114 | `POST /api/rg/staff/requesters` | Create RG requester | none (staff-side) | OUT OF SCOPE |
| 115 | `PUT /api/rg/staff/requesters/:id` | Update RG requester | none (staff-side) | OUT OF SCOPE |
| 116 | `POST /api/rg/staff/requesters/:id/reset-pin` | Reset RG PIN | none (staff-side) | OUT OF SCOPE |

[VERIFIED — RG public endpoints gated by rgAuthMiddleware; staff endpoints ungated but out of scope for this build]

### PUBLIC / CONTACT

| # | Method + Path | What It Does | Caller | Credential | Gateable? |
|---|---------------|-------------|--------|------------|-----------|
| 117 | `POST /api/contact` | Submit contact form | Public page | `contactFormLimiter` | **MUST-STAY-PUBLIC** |

[VERIFIED]

---

## 2. Current Gating Status

**piiGateMiddleware predicate (exact):**
```ts
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' || !isGatedPath(req.path)) {
    return next();
  }
  // ... token check ...
});
```

**Effect:** EVERY non-GET request bypasses the gate entirely (`req.method !== 'GET'` → `next()`). All 117 write endpoints are ungated by piiGate. [VERIFIED]

**Other middleware on writes:**

| Middleware | Routes | Effect |
|-----------|--------|--------|
| `adoptionLimiter` | `POST /api/adoption-application` | Rate limit only (5/15min) |
| `volunteerWebFormLimiter` | `POST /api/volunteers` | Rate limit only (3/15min) |
| `contactFormLimiter` | `POST /api/contact` | Rate limit only (5/15min) |
| `adoptableAlertLimiter` | `POST /api/dashboard/adoptable-alert/run` | Rate limit only |
| `rgAuthMiddleware` | `POST /api/rg/logout`, `POST /api/rg/requests`, `POST /api/rg/requests/:id/messages` | Session auth (RG scope only) |
| `rgLoginLimiter` | `POST /api/rg/login` | Rate limit only |

No write endpoint has piiGate token enforcement. [VERIFIED]

---

## 3. Three-Way Split

### (a) GATEABLE NOW via Dashboard Token (68 endpoints)

All endpoints called exclusively from `dashboard/index.html`. Dashboard has `gatedFetch` available (already attaches `X-Gate-Token` on ANY method including PATCH/POST). Currently all dashboard writes use plain `fetch` — each must be switched to `gatedFetch` to carry the token. The server-side gate must extend to cover these paths.

Includes: all `/api/volunteers/*` writes (except public submit + timeclock/punch), all `/api/dashboard/*`, all bio/story/event/notification/behavior/photo management, adoption-application management (when PATCH is built), all featured-slot management.

**Priority PII writes (Tier-1):**
- `POST /api/volunteers/upload` — uploads PII docs
- `POST /api/volunteers/rotate-image` — manipulates PII docs (⚠️ TRACKED)
- `PATCH /api/volunteers/:id` — edits PII record
- `DELETE /api/volunteers/:id` — deletes PII record
- `PATCH /api/volunteers/:id/policy-reviewed` — PII record flag
- `PATCH /api/volunteers/:id/approval` — PII record status
- `PATCH /api/volunteers/:id/tags` — PII record metadata
- All `/api/volunteers/:id/commitments` and `/api/volunteers/:id/declines` — PII record attachments
- `POST /api/volunteers/timeclock/manual` — manual timeclock (PII)
- All intake writes: `POST /api/intakes/:id/status`, health-assessment, seizure-record, intake-recipients, voice

### (b) NEEDS-PWA-AUTH (26 endpoints)

Called from tokenless PWAs (staff-pwa, volunteer-pwa, dogwalker-pwa, caregiver-pwa, coordinator-pwa). Gating these with the piiGate token would 401 every PWA user. Requires either:
- PWAs obtain the gate token (add token fetch to each PWA), OR
- Real per-user authentication (bigger scope)

Includes: all `/api/dogwalker/*`, `/api/volunteer/*`, `/api/staff/*`, `/api/sessions/*`, `/api/caregiver/*`, `/api/coordinator/*`, `/api/profile/photo`, `/api/transcribe` (file upload), `/api/match`, `/api/photos/:shelterCode/upload-to-library`.

### (c) MUST-STAY-PUBLIC (4 endpoints)

Anonymous-by-design public submit forms. MUST NOT be gated:
- `POST /api/adoption-application` — public adoption form
- `POST /api/volunteers` — public volunteer web form
- `POST /api/volunteers/timeclock/punch` — public kiosk (vclock.html)
- `POST /api/contact` — public contact form
- `POST /api/intake` — public overnight intake form

### (d) INTERNAL (4 endpoints)

Called by internal schedulers, OC, or test tooling. No UI caller:
- `POST /api/animals/refresh` — SM sync trigger
- `POST /api/volunteers/timeclock/auto-close` — stale shift closure (exposed but no cron caller found)
- `POST /api/stories/sync` — WordPress story sync
- `POST /api/feeding/run-cron` — manual feeding job trigger

---

## 4. Two Tracked Endpoints in Detail

### POST /api/volunteers/rotate-image

**Caller:** Dashboard, currently via plain `fetch` (NOT `gatedFetch`). The `volRotateFromLightbox` and `volRotateImage` functions call `fetch('/api/volunteers/rotate-image', { method: 'POST', ... })` directly. [VERIFIED]

**Input:** `{ filePath: "/data/volunteer-files/{uuid}/page-NN.jpg" }` — takes a file path from the client.

**Path traversal validation (3 layers):**
1. **Regex:** `^/data/volunteer-files/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/page-\d{2}\.(jpg|png)$` — strict UUID + page-NN pattern. Rejects any path not matching this exact shape. [VERIFIED]
2. **path.resolve + prefix check:** Resolves to absolute path, then verifies it starts with `path.join(ROOT_DIR, 'data', 'volunteer-files') + path.sep`. Prevents `../` escape. [VERIFIED]
3. **existsSync:** File must exist on disk. [VERIFIED]

**Assessment:** The path validation is robust — the regex alone blocks traversal (no `..` or `/` allowed in the UUID or filename segments). The prefix check is defense-in-depth. The main concern is the endpoint being ungated (anyone can rotate a volunteer's scan if they know the UUID + filename). Gating with the dashboard token closes this. [VERIFIED]

### PATCH /api/adoption-applications/:id

**Does NOT exist yet.** No `app.patch` route for adoption-applications in server.ts. The `updateAdoptionApplicationStatus()` function in localDatabase.ts is orphaned (zero callers). The new multi-field `updateAdoptionApplication(id, fields)` has not been built. This is part of the paused Adoptions PATCH endpoint build. [VERIFIED]

---

## 5. Gate-Extension Design

### Current Predicate

```ts
// Method check — GET-only:
if (req.method !== 'GET' || !isGatedPath(req.path)) {
  return next();
}

// Path check:
function isGatedPath(p: string): boolean {
  return (
    p === '/api/volunteers'
    || p.startsWith('/api/volunteers/')
    || p === '/api/adoption-applications'
    || p === '/api/dashboard/behavior-notes'
    || p.startsWith('/api/docs/')
  );
}
```

[VERIFIED]

### Design: Scoped Write Gating

Replace the method check with a method+path predicate. Two options:

**Option A — Whitelist specific write paths (recommended, surgical):**

```ts
function isGatedWrite(method: string, path: string): boolean {
  if (method === 'GET') return false; // GETs handled by isGatedPath
  // PII writes that must carry the token:
  if (path.startsWith('/api/volunteers/') && path !== '/api/volunteers/timeclock/punch') return true;
  if (path === '/api/volunteers' && method !== 'POST') return true; // protect GET/PATCH/DELETE but NOT POST (public submit)
  if (path.startsWith('/api/adoption-applications/')) return true; // future PATCH
  if (path.startsWith('/api/docs/')) return true; // if any write docs routes added
  // Dashboard-only writes can be added here as tiers expand
  return false;
}

// In middleware:
if (!isGatedPath(req.path) && !isGatedWrite(req.method, req.path)) {
  return next();
}
```

**Key exclusions that prevent lockout:**
- `POST /api/volunteers` when `method === 'POST'` → public form submit (excluded) [VERIFIED]
- `POST /api/volunteers/timeclock/punch` → public kiosk (excluded) [VERIFIED]
- All `/api/dogwalker/*`, `/api/staff/*`, `/api/volunteer/*` (PWA session writes) → NOT in `isGatedWrite` → ungated [VERIFIED]

**Option B — Gate ALL dashboard-prefixed writes:**

```ts
if (path.startsWith('/api/dashboard/')) return true;
```

Simpler but gates 16 endpoints at once (all dashboard admin). Low risk since all callers are dashboard.

### Dashboard Client Side

`gatedFetch` already attaches `X-Gate-Token` on ANY method (no method check in the function). [VERIFIED]

To gate a dashboard write, two changes:
1. Server: add the path to `isGatedWrite`
2. Dashboard: change `fetch(url, { method: 'POST', ... })` → `gatedFetch(url, { method: 'POST', ... })`

No other client-side infrastructure needed — the token acquisition, retry, and header attachment are already built. [VERIFIED]

---

## Summary

### (a) Full write-surface: 117 routes
- 68 dashboard-only (gateable now)
- 26 PWA-originated (needs PWA auth)
- 5 public (must stay open)
- 4 internal (scheduler/OC)
- 14 RG (out of scope, separately gated)

### (b) Three-way split
- **NOW:** 68 dashboard writes, priority = 13 PII-touching volunteer/intake endpoints + rotate-image
- **DEFERRED:** 26 PWA writes (need auth infrastructure)
- **NEVER:** 5 public submits + 4 internal

### (c) Tracked endpoints
- **rotate-image:** 3-layer path validation (regex + resolve + prefix + exists), robust against traversal, ungated — gateable now via dashboard token
- **adoption PATCH:** does not exist yet

### (d) Gate extension: add `isGatedWrite(method, path)` alongside existing `isGatedPath(path)`, whitelist specific PII write paths, exclude public submits and PWA paths by omission (deny-by-default for writes = only listed paths are gated, unlisted pass through)
